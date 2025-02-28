const bodyParser = require('body-parser')
const express = require('express')
const app = express()
const bcrypt = require('bcryptjs'); //criptografa senha
const session = require('express-session');

//BANCO DE DADOS
const connection = require('./database/db') //TRAZ A A CONFIGURACAO DE CONEXAO DO BANCO DE DADOS 
const entidades = require('./database/entidades') //TRAZ CONEXAO COM A TABELA DO BD
const versao_sistema = require('./database/versao_sistema');
const setores = require('./database/setores');
const usuarios = require('./database/usuarios');
const grupos_de_usuarios = require('./database/grupos_de_usuarios');
const concorrentes = require('./database/concorrentes');
const modulos = require('./database/modulos')
const log = require('./database/log');
const tipos_entidade = require('./database/tipos_entidade');
const { where } = require('sequelize');

app.set('view engine','ejs') //importando EJS
app.use(express.static('public')) //Permitindo arquivos estaticos

// CONFIGURA BODY-PARSER
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
// Configuração do middleware de sessão
app.use(session({
    secret: 'segredo',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Para HTTPS, defina como true
}));

app.use(async (req, res, next) => {
    try {
        if (req.session.usuario) {
            // Espera a consulta ao banco de dados ser resolvida
            const setorInfo = await setores.findOne({ where: { id: req.session.setor } });

            // Passa as informações para o res.locals
            res.locals.setornome = setorInfo ? setorInfo.setor : null; // Assumindo que 'nome' é o campo que você quer
            res.locals.usuario = req.session.usuario;
            res.locals.usuarioid = req.session.usuarioId;
            res.locals.nome = req.session.nome;
            res.locals.setor = req.session.setor;
            res.locals.grupo = req.session.grupo;
        } else {
            res.locals.usuario = null;
            res.locals.nome = null;
            res.locals.setor = null;
            res.locals.grupo = null;
            res.locals.setornome = null;
        }
        next();
    } catch (error) {
        console.error('Erro ao buscar setor:', error);
        next();
    }
});

//CRIA CONEXAO COM O BD
connection
    .authenticate()
    .then(()=>{
        console.log('Banco de dados conectado')
    })
    .catch((msgerro)=>{
        console.log(msgerro)
    })




//ROTAS PRINCIPAIS
app.get('/',(req,res)=>{
    res.render('index')
})

app.get('/admin', verificarAutenticacao, async (req, res) => {
    try {
        const usuario = await usuarios.findByPk(req.session.usuarioId);

        if (usuario) {
            log.findAll({
                order: [['id','DESC']]
            }).then(logs =>{
                res.render('admin', {
                     usuario ,
                     logs: logs
                    });
            })
            
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        res.status(500).send('Erro ao carregar a página');
    }
});


//ROTAS E FUNCOES DE LOGIN E LOGOUT
app.get('/login', (req, res) => {
    res.render('login', { erro: null });
});

app.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;

    try {
        const usuarioEncontrado = await usuarios.findOne({ where: { usuario } });

        if (!usuarioEncontrado) {
            return res.render('login', { erro: '' });
        }

        if (usuarioEncontrado.ativo !== 1) {
            return res.render('login', { erro: 'Usuário inativo' });
        }

        const senhaValida = await bcrypt.compare(senha, usuarioEncontrado.senha);
        if (!senhaValida) {
            return res.render('login', { erro: 'Senha incorreta' });
        }

        // Armazena informações na sessão
        req.session.usuarioId = usuarioEncontrado.id;
        req.session.usuario = usuarioEncontrado.usuario;
        req.session.nome = usuarioEncontrado.nome;
        req.session.setor = usuarioEncontrado.setor;
        req.session.grupo = usuarioEncontrado.grupo;

        log.create({
            usuario: req.session.usuarioId,
            acao: 'login',
            tabela: '',
            id_registro: 0
        }).then(()=>{
            res.redirect('/admin');
        })
        
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'logout',
            tabela: '',
            id_registro: 0
        }).then(()=>{
            res.redirect('/');
        })
    });
});

function verificarAutenticacao(req, res, next) {
    if (req.session.usuarioId) {
        return next();
    }
    res.redirect('/login');
}



// ROTAS DAS ENTIDADES
app.get('/listar_entidades',verificarAutenticacao, (req, res) => {
    const page = parseInt(req.query.page) || 1; // Página atual (default: 1)
    const limit = 20;                          // Registros por página
    const offset = (page - 1) * limit;         // Calcula o deslocamento
    const idUsuario = req.session.usuarioId
    const idGrupo = req.session.grupo

    entidades.findAndCountAll({
        where: { ativo: 1 },
        order: [['estado', 'ASC'], ['cidade', 'ASC']],
        limit: limit,
        offset: offset
    }).then(result => {
        const totalEntidades = result.count;
        const totalPages = Math.ceil(totalEntidades / limit);

        tipos_entidade.findAll().then(tipos => {
            versao_sistema.findAll().then(versoes => {
                usuarios.findOne({where: {id:idUsuario}}).then(usuarioinfo =>{
                    grupos_de_usuarios.findOne({where: {id:idGrupo}}).then(grupoinfo =>{
                        res.render('listar_entidades', {
                            entidades: result.rows,
                            tipos: tipos,
                            versoes: versoes,
                            currentPage: page,
                            totalPages: totalPages,
                            infoUser: usuarioinfo,
                            infoGrupo: grupoinfo
                        });
                    })

                })
                
            });
        });
    }).catch(err => {
        console.error('Erro ao buscar entidades:', err);
        res.status(500).send('Erro interno no servidor');
    });
});

app.get('/inserir_entidades',verificarAutenticacao,(req,res)=>{
    tipos_entidade.findAll().then(tipos_entidade =>{
        modulos.findAll().then(modulos => {
            versao_sistema.findAll().then(versao_sistema => {
                concorrentes.findAll().then(concorrentes =>{
                    res.render('inserir_entidades',{
                        tipos_entidade: tipos_entidade,
                        modulos: modulos,
                        versao_sistema: versao_sistema,
                        concorrentes: concorrentes
                    })
                })
            })
        })
    })
    
})

app.post('/salvar_entidades',verificarAutenticacao,(req,res)=>{
    var cidade = req.body.cidade.toLowerCase()
    var estado = req.body.estado.toLowerCase()
    var tipo_entidade = req.body.tipo_entidade
    var modulos_contratados = req.body.modulos_contratados
    var versao_sistema = req.body.versao_sistema
    var website_concorrente = req.body.website_concorrente
    var sistema_concorrente = req.body.sistema_concorrente
    var ativo = 1

    entidades.create({
        cidade: cidade,
        estado: estado,
        website_concorrente: website_concorrente,
        sistema_concorrente: sistema_concorrente,
        tipo_entidade: tipo_entidade,
        modulos_contratados: Array.isArray(modulos_contratados) ? modulos_contratados.join(', ') : modulos_contratados,
        versao_sistema: versao_sistema,
        ativo: ativo
    }).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'entidades',
            id_registro: 0
        }).then(()=>{
            res.redirect('/listar_entidades')
        })        
    })
    
})

app.post('/deletar_entidade',verificarAutenticacao, (req,res)=>{
    var id = req.body.id

    entidades.update(
        {ativo: 0},
        {where: {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'entidades',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_entidades')
        })
    })
})

app.get('/alterar_entidades/:id',verificarAutenticacao,(req,res)=>{
    const id = req.params.id

    entidades.findOne(
        {where: {id:id}}
    ).then(entidade =>{
        tipos_entidade.findAll().then(tipos => {
            versao_sistema.findAll().then(versao => {
                modulos.findAll().then(modulos => {
                    concorrentes.findAll().then(concorrentes => {
                        res.render('alterar_entidades',{
                            entidade: entidade,
                            tipos: tipos,
                            versao_sistema: versao,
                            modulos: modulos,
                            concorrentes: concorrentes
                        })
                    })
                })

            })
        })
    })
})

app.post('/update_entidade',verificarAutenticacao,(req,res)=>{
    const id = req.body.id
    const tipo = req.body.tipo_entidade
    const modulos_contratados = req.body.modulos_contratados
    const versao = req.body.versao_sistema
    const website_concorrente = req.body.website_concorrente
    const sistema_concorrente = req.body.sistema_concorrente

    entidades.update(
        {
            tipo_entidade: tipo,
            modulos_contratados: Array.isArray(modulos_contratados) ? modulos_contratados.join(', ') : modulos_contratados,
            versao_sistema: versao,
            website_concorrente: website_concorrente,
            sistema_concorrente: sistema_concorrente
        },
        {where: {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'entidades',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_entidades')
        })
    })
})



//VERSAO DO SISTEMA
app.get('/listar_versaosis',verificarAutenticacao, (req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const idUsuario = req.session.usuarioId
    const idGrupo = req.session.grupo

    versao_sistema.findAndCountAll({
        where: { ativo: 1 },
        order: [['versao', 'ASC']],
        limit: limit,
        offset: offset
    }).then(versoes => {
        usuarios.findOne({where: {id:idUsuario}}).then(usuarioinfo =>{
            grupos_de_usuarios.findOne({where: {id:idGrupo}}).then(grupoinfo =>{
                const totalPages = Math.ceil(versoes.count / limit); // Calcular o número total de páginas
                res.render('listar_versaosis',{
                    versoes: versoes.rows,
                    currentPage: page,
                    totalPages: totalPages,
                    infoUser: usuarioinfo,
                    infoGrupo: grupoinfo
                })
            })
        })    

    })    
})

app.get('/inserir_versao',verificarAutenticacao,(req,res)=>{
    res.render('inserir_versaosis')
})

app.post('/salvarversao',verificarAutenticacao,(req,res)=>{
    var versao = req.body.versaosis.toLowerCase().trim()

    versao_sistema.create({
        versao: versao,
        ativo: 1
    }).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'versao_sistemas',
            id_registro: 0
        }).then(()=>{
            res.redirect('/listar_versaosis')
        })
    })
})

app.post('/deletar_versao',verificarAutenticacao, (req,res)=>{
    var id = req.body.id

    versao_sistema.update(
        { ativo: 0 },  // O campo que você quer atualizar
        { where: { id: id } }    // Condição para localizar o registro pelo ID
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'versao_sistemas',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_versaosis')
        })
    })
})

app.get('/alterar_versao/:id',verificarAutenticacao, (req,res)=>{
    const id = req.params.id

    versao_sistema.findOne(
        {where: {id:id}}
    ).then(versao => {
        res.render('alterar_versaosis',{
            versao: versao
        })
    })
})

app.post('/update_versao',verificarAutenticacao,(req,res)=>{
    const id = req.body.id
    const versao = req.body.versaosis

    versao_sistema.update(
        {versao: versao},
        {where: {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'versao_sistemas',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_versaosis')
        })
    })
})



//SETOR DA EMPRESA
app.get('/listar_setor',verificarAutenticacao,(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const idUsuario = req.session.usuarioId
    const idGrupo = req.session.grupo

    setores.findAndCountAll({
        where: {ativo: 1},
        order: [['setor', 'ASC']],
        limit: limit,
        offset: offset
    }).then(setores=>{
        usuarios.findOne({where: {id:idUsuario}}).then(usuarioinfo =>{
            grupos_de_usuarios.findOne({where: {id:idGrupo}}).then(grupoinfo =>{
                const totalPages = Math.ceil(setores.count / limit); // Calcular o número total de páginas
                res.render('listar_setor',{
                    setores: setores.rows,
                    currentPage: page,
                    totalPages: totalPages,
                    infoUser: usuarioinfo,
                    infoGrupo: grupoinfo
                })
            })
         })    

    })
    
})

app.get('/inserir_setor',verificarAutenticacao,(req,res)=>{
    res.render('inserir_setor')
})

app.post('/salvarsetor',verificarAutenticacao,(req,res)=>{
    var setor = req.body.setor.toLowerCase()
    var sigla = req.body.sigla.toLowerCase()
    var ativo = 1

    setores.create({
        setor: setor,
        sigla: sigla,
        ativo: ativo
    }).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'setores',
            id_registro: 0
        }).then(()=>{
            res.redirect('/listar_setor')
        })
    })
})

app.post('/deletar_setor',verificarAutenticacao, (req,res)=>{
    var id = req.body.id

    setores.update(
        {ativo: 0},
        {where: {id: id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'setores',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_setor')
        })
    })
})

app.get('/alterar_setor/:id',verificarAutenticacao, (req,res)=>{
    const id = req.params.id

    setores.findOne(
        {where: {id:id}}
    ).then(setores =>{
        res.render('alterar_setor',{
            setor: setores
        })
    })
})

app.post('/update_setor',verificarAutenticacao,(req,res)=>{
    const setor = req.body.setor
    const sigla = req.body.sigla
    const id = req.body.id

    setores.update(
        {setor: setor, sigla: sigla},
        {where: {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'setores',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_setor')
        })
    })
})


//ROTAS DE USUARIOS
app.get('/listar_usuarios',verificarAutenticacao,(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const idUsuario = req.session.usuarioId
    const idGrupo = req.session.grupo


    usuarios.findAndCountAll({
        where: {ativo: 1},
        order: [['nome','ASC']],
        limit: limit,
        offset: offset
    }).then(usuariosGeral=>{
        usuarios.findOne({where: {id:idUsuario}}).then(usuarioinfo =>{
            grupos_de_usuarios.findOne({where: {id:idGrupo}}).then(grupoinfo =>{
                const totalPages = Math.ceil(usuariosGeral.count / limit)
                setores.findAll().then(setores =>{
                    grupos_de_usuarios.findAll().then(grupos => {
                        res.render('listar_usuarios',{
                            usuarios: usuariosGeral.rows,
                            currentPage: page,
                            totalPages: totalPages,
                            infoUser: usuarioinfo,
                            infoGrupo: grupoinfo,
                            setores: setores,
                            grupos: grupos
                        })    
                    })
                })
            })
         })    
        
    })
    
})

app.get('/inserir_usuarios',verificarAutenticacao,(req,res)=>{
    setores.findAll().then(setores => {
        grupos_de_usuarios.findAll({
            where: {ativo: 1}
        }).then(grupos => {
            res.render('inserir_usuarios',{
                setores:setores,
                grupos: grupos
            })
        })
        
    })    
})

app.post('/salvar_usuarios',verificarAutenticacao, async (req, res) => {
    try {
        const { nome, usuario, setor, grupo, senha } = req.body;
        const ativo = 1;

        // Gerando o salt e hash da senha
        const salt = await bcrypt.genSalt(10); // Gera um salt com fator de custo 10
        const senhaHash = await bcrypt.hash(senha, salt); // Criptografa a senha

        await usuarios.create({
            nome: nome.toLowerCase(),
            usuario: usuario.toLowerCase(),
            setor: setor,
            grupo: grupo,
            senha: senhaHash, // Salvando a senha criptografada
            ativo: ativo
        });

        log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'usuarios',
            id_registro: 0
        }).then(()=>{
            res.redirect('/listar_usuarios')
        })
    } catch (error) {
        console.error("Erro ao salvar usuário:", error);
        res.status(500).send("Erro ao salvar usuário.");
    }
});

app.post('/deletar_usuario',verificarAutenticacao,(req,res)=>{
    var id = req.body.id

    usuarios.update(
        {ativo: 0},
        {where: {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'usuarios',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_usuarios')
        })
    })
})

app.get('/alterar_usuarios/:id',verificarAutenticacao,(req,res)=>{
    const id = req.params.id

    usuarios.findOne(
        {where: {id:id}}
    ).then(usuario => {
        setores.findAll().then(setores =>{
            grupos_de_usuarios.findAll().then(grupos =>{

                res.render('alterar_usuario',{
                    usuario: usuario,
                    setores: setores,
                    grupos:grupos
                })
            })
        })

    })
})

app.post('/update_usuarios',verificarAutenticacao,(req,res)=>{
    const id = req.body.id
    const nome = req.body.nome
    const setor = req.body.setor
    const grupo = req.body.grupo
    const usuario = req.body.usuario

    usuarios.update(
        {nome: nome, setor: setor, grupo: grupo, usuario: usuario},
        {where: {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'usuarios',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_usuarios')
        })
    })
})


//GRUPOS DE USUARIOS
app.get('/listar_grupos_de_usuarios',verificarAutenticacao,(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const idUsuario = req.session.usuarioId
    const idGrupo = req.session.grupo


    grupos_de_usuarios.findAndCountAll({
        where: {ativo : 1},
        order: [['grupo','ASC']],
        offset,
        limit
    }).then(grupos_user => {
        usuarios.findOne({where: {id:idUsuario}}).then(usuarioinfo =>{
            grupos_de_usuarios.findOne({where: {id:idGrupo}}).then(grupoinfo =>{
                const totalPages = Math.ceil(grupos_user.count / limit)
                res.render('listar_grupos_de_usuarios',{
                    grupos: grupos_user.rows,
                    totalPages: totalPages,
                    currentPage: page,
                    infoUser: usuarioinfo,
                    infoGrupo: grupoinfo
                })
            })
         })    

    })
    
})

app.get('/inserir_grupos_de_usuarios',verificarAutenticacao,(req,res)=>{
    res.render('inserir_grupos_de_usuarios')
})

app.post('/salvar_grupos_de_usuarios',verificarAutenticacao,(req, res)=>{
    var grupo = req.body.gruposusuario.toLowerCase()
    var inserir = req.body.inserir || 0
    var alterar = req.body.alterar || 0
    var deletar = req.body.deletar || 0

    grupos_de_usuarios.create({
        grupo: grupo,
        inserir: inserir,
        alterar: alterar,
        deletar: deletar,
        ativo: 1
    }).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'grupos_de_usuarios',
            id_registro: 0
        }).then(()=>{
            res.redirect('/listar_grupos_de_usuarios')
        })
    })
})

app.post('/deletar_grupo',verificarAutenticacao,(req,res)=>{
    var id = req.body.id

    grupos_de_usuarios.update(
        {ativo: 0}    ,
        { where : {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'grupos_de_usuarios',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_grupos_de_usuarios')
        })
    })

})

app.get('/alterar_grupo_de_usuario/:id',verificarAutenticacao,(req,res)=>{
    const id = req.params.id

    grupos_de_usuarios.findOne(
        {where: {id:id}}
    ).then(grupos => {
        res.render('alterar_grupos_de_usuarios',{
            grupo: grupos
        })
    })
})

app.post('/update_grupos_de_usuarios',verificarAutenticacao,(req,res)=>{
    const id = req.body.id
    const grupo = req.body.gruposusuario
    const alterar = req.body.alterar || 0
    const inserir = req.body.inserir || 0
    const deletar = req.body.deletar || 0

    grupos_de_usuarios.update(
        {grupo: grupo, inserir: inserir, alterar: alterar, deletar: deletar},
        {where: {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'grupos_de_usuarios',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_grupos_de_usuarios')
        })
    })
    
})


//ROTAS CONCORRENTES
app.get('/listar_concorrentes',verificarAutenticacao,(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const idUsuario = req.session.usuarioId
    const idGrupo = req.session.grupo


    concorrentes.findAndCountAll({
        where: {ativo: 1},
        order: [['nome','ASC']],
        limit: limit,
        offset: offset
    }).then(concorrentes=>{
        usuarios.findOne({where: {id:idUsuario}}).then(usuarioinfo =>{
            grupos_de_usuarios.findOne({where: {id:idGrupo}}).then(grupoinfo =>{
                const totalPages = Math.ceil(concorrentes.count / limit);
                res.render('listar_concorrentes',{
                    concorrentes: concorrentes.rows,
                    currentPage: page,
                    totalPages: totalPages,
                    infoUser: usuarioinfo,
                    infoGrupo: grupoinfo
                })
            })
         })    

    })
    
})

app.get('/inserir_concorrentes',verificarAutenticacao,(req,res)=>{
    res.render('inserir_concorrentes')
})

app.post('/salvar_concorrentes',verificarAutenticacao,(req,res)=>{
    var nome = req.body.concorrente.toLowerCase()

    concorrentes.create({
        nome: nome.toLowerCase(),
        ativo: 1
    }).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'concorrentes',
            id_registro: 0
        }).then(()=>{
            res.redirect('/listar_concorrentes')
        })
    })
})

app.post('/deletar_concorrente',verificarAutenticacao,(req,res)=>{
    var id = req.body.id;

    concorrentes.update(
        {ativo: 0},
        {where: {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'concorrentes',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_concorrentes')
        })
    })
})

app.get('/alterar_concorrentes/:id',verificarAutenticacao,(req,res)=>{
    const id = req.params.id

    concorrentes.findOne(
        {where: {id:id}}
    ).then(concorrentes =>{
        res.render('alterar_concorrentes',{
            concorrente: concorrentes
        })
    })
    
})

app.post('/update_concorrentes',verificarAutenticacao,(req,res)=>{
    const id = req.body.id
    const nome = req.body.concorrente

    concorrentes.update(
        {nome: nome},
        {where: {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'concorrentes',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_concorrentes')
        })
    })
})


//ROTAS PARA MODULOS DO SISTEMA
app.get('/listar_modulos',verificarAutenticacao,(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const idUsuario = req.session.usuarioId
    const idGrupo = req.session.grupo


    modulos.findAndCountAll({
        where: {ativo: 1},
        order: [['modulo','ASC']],
        limit: limit,
        offset: offset
    }).then(modulos=>{
        usuarios.findOne({where: {id:idUsuario}}).then(usuarioinfo =>{
            grupos_de_usuarios.findOne({where: {id:idGrupo}}).then(grupoinfo =>{
                const totalPages = Math.ceil(modulos.count / limit)
                res.render('listar_modulos',{
                    modulos: modulos.rows,
                    totalPages: totalPages,
                    currentPage: page,
                    infoUser: usuarioinfo,
                    infoGrupo: grupoinfo
                })
            })
         })    
        
    })
    
})

app.get('/inserir_modulos',verificarAutenticacao,(req,res)=>{
    res.render('inserir_modulos')
})

app.post('/salvar_modulos',verificarAutenticacao,(req,res)=>{
    var modulo = req.body.modulo.toLowerCase()

    modulos.create({
        modulo: modulo,
        ativo: 1
    }).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'modulos',
            id_registro: 0
        }).then(()=>{
            res.redirect('/listar_modulos')
        })
    })
})

app.post('/deletar_modulos',verificarAutenticacao,(req,res)=>{
    var id = req.body.id

    modulos.update(
        {ativo: 0},
        {where: {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'modulos',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_modulos')
        })
    })
})

app.get('/alterar_modulos/:id',verificarAutenticacao,(req,res)=>{
    var id = req.params.id

    modulos.findOne(
        {where: {id:id}}
    ).then(modulos => {
        res.render('alterar_modulos',{
            modulo: modulos
        })
    })
})

app.post('/update_modulos',verificarAutenticacao,(req,res)=> {
    const id = req.body.id
    const modulo = req.body.modulo

    modulos.update(
        {modulo: modulo},
        {where: {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'modulos',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_modulos')
        })
    })
})



//ROTAS TIPOS DE ENTIDADE
app.get('/listar_tipos_entidade',verificarAutenticacao,(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit
    const idUsuario = req.session.usuarioId
    const idGrupo = req.session.grupo


    tipos_entidade.findAndCountAll({
        where: {ativo: 1},
        order: [['tipo_entidade','ASC']],
        limit: limit,
        offset: offset
    }).then(tipos => {
        usuarios.findOne({where: {id:idUsuario}}).then(usuarioinfo =>{
            grupos_de_usuarios.findOne({where: {id:idGrupo}}).then(grupoinfo =>{
                const totalPages = Math.ceil(tipos.count / limit)
                res.render('listar_tipos_entidade',{
                    tipos: tipos.rows,
                    totalPages: totalPages,
                    currentPage: page,
                    infoUser: usuarioinfo,
                    infoGrupo: grupoinfo
                })
            })
         })    

    })
    
})

app.get('/inserir_tipos_entidade',verificarAutenticacao,(req,res)=>{
    res.render('inserir_tipos_entidade')
})

app.post('/salvar_tipos_entidade',verificarAutenticacao,(req,res)=>{
    var tipo_entidade = req.body.tipo_entidade.toLowerCase()

    tipos_entidade.create({
        tipo_entidade: tipo_entidade,
        ativo: 1
    }).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'tipos_entidades',
            id_registro: 0
        }).then(()=>{
            res.redirect('/listar_tipos_entidade')
        })
    })
})

app.post('/deletar_tipo_entidade',verificarAutenticacao,(req,res)=>{
    var id = req.body.id

    tipos_entidade.update(
        {ativo: 0},
        {where: {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'tipos_entidades',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_tipos_entidade')
        })
    })
})

app.get('/alterar_tipos_de_enteidade/:id',verificarAutenticacao,(req,res)=>{
    const id = req.params.id

    tipos_entidade.findOne(
        {where: {id:id}}
    ).then(tipo =>{
        res.render('alterar_tipos_entidade',{
            tipo: tipo
        })
    })
})

app.post('/update_tipo_entidade',verificarAutenticacao,(req,res)=>{
    const id = req.body.id
    const nome = req.body.tipo_entidade

    tipos_entidade.update(
        {tipo_entidade: nome},
        {where: {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'tipos_entidades',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_tipos_entidade')
        })
    })
})

//CRIANDO O SERVIDOR
app.listen(8080, ()=>{
    console.log('Aplicativo Online')
})


