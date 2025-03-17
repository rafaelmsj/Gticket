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
            res.locals.perm_t_usuarios = req.session.perm_usuarios;
            res.locals.perm_t_grupos = req.session.perm_grupos;
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

// Criando a conexão com o banco de dados
connection.authenticate()
    .then(async () => {
        console.log('Banco de dados conectado');

        // Verifica se o grupo padrão existe
        const grupoExistente = await grupos_de_usuarios.findOne({ where: { grupo: 'administrador' } });
        if (!grupoExistente) {
            // Cria o grupo padrão, caso não exista
            await grupos_de_usuarios.create({
                grupo: 'administrador',
                inserir: 1,
                alterar: 1,
                deletar: 1,
                ativo: 1
            });
            console.log('Grupo Padrão criado com sucesso!');
        }

        // Verifica se o usuário padrão existe
        const usuarioExistente = await usuarios.findOne({ where: { usuario: 'admin' } });
        if (!usuarioExistente) {
            // Cria o usuário padrão, caso não exista
            const senhaCriptografada = await bcrypt.hash('admin', 10); // Criptografa a senha
            await usuarios.create({
                nome: 'administrador',
                usuario: 'admin',
                setor: 0,
                grupo: 1,
                perm_grupo_usuarios: 1,
                perm_usuarios: 1,
                senha: senhaCriptografada,
                ativo: 1  // Usuário ativo
            });
            console.log('Usuário padrão criado com sucesso!');
        }
    })
    .catch((msgerro) => {
        console.log(msgerro);
    });


//ROTAS PRINCIPAIS
app.get('/',(req,res)=>{
    res.render('index')
})

app.get('/admin', verificarAutenticacao, (req, res) => {

    log.findAll({
        order: [['id','DESC']]
    }).then(logs => {
        usuarios.findAll().then(usuarios => {
            res.render('admin',{
                usuarios: usuarios,
                logs: logs
            })
        })
    })
});


//ROTAS E FUNCOES DE LOGIN E LOGOUT
app.get('/login', (req, res) => {
    res.render('login', { erro: null });
});

app.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;

    try {
        const usuarioEncontrado = await usuarios.findOne({ where: { usuario } });

        if (usuarioEncontrado.ativo !== 1) {
            return res.json( {
                success: false,
                message: 'Usuário inativo'
            });
        }

        const senhaValida = await bcrypt.compare(senha, usuarioEncontrado.senha);
        if (!senhaValida) {
            return res.json( {
                success: false,
                message: '*Senha inválida'
            });
        }

        // Armazena informações na sessão
        req.session.usuarioId = usuarioEncontrado.id;
        req.session.usuario = usuarioEncontrado.usuario;
        req.session.nome = usuarioEncontrado.nome;
        req.session.setor = usuarioEncontrado.setor;
        req.session.grupo = usuarioEncontrado.grupo;
        req.session.senha = usuarioEncontrado.senhaValida;
        req.session.perm_usuarios = usuarioEncontrado.perm_usuarios;
        req.session.perm_grupos = usuarioEncontrado.perm_grupo_usuarios;

        log.create({
            usuario: req.session.usuarioId,
            acao: 'login',
            tabela: '',
            id_registro: 0
        }).then(()=>{
            res.json({
                success: true,
                message: 'Login efetuado!'
            })
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

async function verificarPermInserir(req, res, next) {
    var grupoEncontrado = await grupos_de_usuarios.findOne({
        where: {id:req.session.grupo}
    })

    if(grupoEncontrado.inserir === 1){
        return next();
    }
    res.redirect('/admin');
}

async function verificarPermAlterar(req, res, next) {
    var grupoEncontrado = await grupos_de_usuarios.findOne({
        where: {id:req.session.grupo}
    })

    if(grupoEncontrado.alterar === 1){
        return next();
    }
    res.redirect('/admin');
}

async function verificarPermDeletar(req, res, next) {
    var grupoEncontrado = await grupos_de_usuarios.findOne({
        where: {id:req.session.grupo}
    })

    if(grupoEncontrado.deletar === 1){
        return next();
    }
    res.redirect('/admin');
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

app.get('/inserir_entidades',verificarAutenticacao, verificarPermInserir,(req,res)=>{
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

app.post('/salvar_entidades',verificarAutenticacao,verificarPermInserir, async(req,res)=>{
    var cidade = req.body.cidade.toLowerCase()
    var estado = req.body.estado.toLowerCase()
    var tipo_entidade = req.body.tipo_entidade
    var modulos_contratados = req.body.modulos_contratados
    var versao_sistema = req.body.versao_sistema
    var website_concorrente = req.body.website_concorrente
    var sistema_concorrente = req.body.sistema_concorrente
    var ativo = 1

    const entidadeEncontrada = await entidades.findOne({
        where: {
            cidade: cidade,
            estado: estado,
            tipo_entidade: tipo_entidade
        }
    })

    if(entidadeEncontrada){
        return res.status(400).json({
            success: false,
            message: 'Essa entidade já está cadastrada.'
        })
    }


    try {
        await entidades.create({
            cidade: cidade,
            estado: estado,
            website_concorrente: website_concorrente,
            sistema_concorrente: sistema_concorrente,
            tipo_entidade: tipo_entidade,
            modulos_contratados: Array.isArray(modulos_contratados) ? modulos_contratados.join(', ') : modulos_contratados,
            versao_sistema: versao_sistema,
            ativo: ativo
        })
            log.create({
                usuario: res.locals.usuarioid,
                acao: 'inserido',
                tabela: 'entidades',
                id_registro: 0
            })
                return res.json({
                    success: true,
                    message: 'Entidade cadastrada!'
                })
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: 'Erro ao cadastrar entidade.',
            error: error
        })
    }
})

app.post('/deletar_entidade',verificarAutenticacao, verificarPermDeletar,(req,res)=>{
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

app.get('/alterar_entidades/:id',verificarAutenticacao,verificarPermAlterar,(req,res)=>{
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

app.post('/update_entidade',verificarAutenticacao,verificarPermAlterar, async(req,res)=>{
    const id = req.body.id
    const modulos_contratados = req.body.modulos_contratados
    const versao = req.body.versao_sistema
    const website_concorrente = req.body.website_concorrente
    const sistema_concorrente = req.body.sistema_concorrente

    
    try {
        entidades.update(
            {
                modulos_contratados: Array.isArray(modulos_contratados) ? modulos_contratados.join(', ') : modulos_contratados,
                versao_sistema: versao,
                website_concorrente: website_concorrente,
                sistema_concorrente: sistema_concorrente
            },
            {where: {id:id}}
        )
            log.create({
                usuario: res.locals.usuarioid,
                acao: 'alterado',
                tabela: 'entidades',
                id_registro: id
            })
                return res.json({
                    success: true,
                    message: 'Entidade alterada!'
                })
    }
    catch(error){
        return res.json({
            success: false,
            message: 'Erro ao alterar entidade.',
            error: error
        })
    }
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

app.get('/inserir_versao',verificarAutenticacao,verificarPermInserir,(req,res)=>{
    res.render('inserir_versaosis')
})

app.post('/salvarversao',verificarAutenticacao,verificarPermInserir, async(req,res)=>{
    var versao = req.body.versaosis.toLowerCase().trim()

    const versaoEncontrada = await versao_sistema.findOne({
        where: {
           versao: versao,
           ativo: 1 
        }
    })

    if(versao.length < 3){
        return res.status(400).json({
            success: false,
            message: 'Digite uma versão válida.'
        })
    }

    if(versaoEncontrada){
        return res.status(400).json({
            success: false,
            message: 'Versão já cadastrada.'
        })
    }

    try {
        await versao_sistema.create({
            versao: versao,
            ativo: 1
        })
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'versao_sistemas',
            id_registro: 0
        })
        
            return res.json({
                success: true,
                message: 'Versão cadastrada!'
            })

    } catch (error){
        return res.status(500).json({
            success: false,
            message: 'Erro ao cadastrar versão',
            error: error
        })
    }
  
})

app.post('/deletar_versao',verificarAutenticacao, verificarPermDeletar,(req,res)=>{
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

app.get('/alterar_versao/:id',verificarAutenticacao,verificarPermAlterar, (req,res)=>{
    const id = req.params.id

    versao_sistema.findOne(
        {where: {id:id}}
    ).then(versao => {
        res.render('alterar_versaosis',{
            versao: versao
        })
    })
})

app.post('/update_versao',verificarAutenticacao,verificarPermAlterar, async(req,res)=>{
    const id = req.body.id
    const versao = req.body.versaosis.trim()

    const versaoEncontrada = await versao_sistema.findOne({
        where: {
            versao: versao,
            ativo: 1
        }
    })

    if(versao.length < 3){
        return res.status(400).json({
            success: false,
            message: 'Digite uma versão válida.'
        })
    }

    if(versaoEncontrada){
        return res.status(400).json({
            success: false,
            message: 'Versão já cadastrada.'
        })
    }

    try {
        await     versao_sistema.update(
            {versao: versao},
            {where: {id:id}}
        )
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'versao_sistemas',
            id_registro: id
        })
            return res.json({
                success: true,
                message: 'Versão alterada!'
            })
    }
    catch (error){
        return res.status(500).json({
            success: false,
            message: 'Erro ao alterar versão',
            error: error
        })
    }



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

app.get('/inserir_setor',verificarAutenticacao,verificarPermInserir,(req,res)=>{
    res.render('inserir_setor')
})

app.post('/salvarsetor',verificarAutenticacao,verificarPermInserir, async(req,res)=>{
    var setor = req.body.setor.toLowerCase()
    var sigla = req.body.sigla.toLowerCase()
    var ativo = 1

    const setorEncontrado = await setores.findOne({
        where: {
            setor: setor,
            ativo: 1
        }
    })

    if(setor.length < 3){
        return res.status(400).json({
            success: false,
            message: 'Digite um setor válido.'
        })
    }

    if (setorEncontrado){
        return res.status(400).json({
            success: false,
            message: 'Setor já cadastrado.'
        })
    }

    const siglaEncontrado = await setores.findOne({
        where: {
            sigla: sigla,
            ativo: 1
        }
    })

    if(sigla.length < 3){
        return res.status(400).json({
            success: false,
            message: 'Digite uma sigla válida.'
        })
    }

    if (siglaEncontrado){
        return res.status(400).json({
            success: false,
            message: 'Essa sigla já está em uso.'
        })
    }

    try {
        await setores.create({
            setor: setor,
            sigla: sigla,
            ativo: ativo
        })
            log.create({
                usuario: res.locals.usuarioid,
                acao: 'inserido',
                tabela: 'setores',
                id_registro: 0
            })
                return res.json({
                    success: true,
                    message: 'Setor cadastrado!'
                })

    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: 'Erro ao cadastrar setor',
            error: error
        })
    }

})

app.post('/deletar_setor',verificarAutenticacao, verificarPermDeletar,(req,res)=>{
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

app.get('/alterar_setor/:id',verificarAutenticacao,verificarPermAlterar, (req,res)=>{
    const id = req.params.id

    setores.findOne(
        {where: {id:id}}
    ).then(setores =>{
        res.render('alterar_setor',{
            setor: setores
        })
    })
})

app.post('/update_setor',verificarAutenticacao, verificarPermAlterar,async(req,res)=>{
    const setor = req.body.setor.toLowerCase()
    const sigla = req.body.sigla.toLowerCase()
    const id = req.body.id

    const setorEncontrado = await setores.findOne({
        where: {
            setor: setor,
            sigla: sigla,
            ativo: 1
        }
    })

    if(setor.length < 3){
        return res.status(400).json({
            success: false,
            message: 'Digite um setor válido.'
        })
    }

    if (setorEncontrado){
        return res.status(400).json({
            success: false,
            message: 'Setor já cadastrado.'
        })
    }


    try {
        await setores.update(
            {setor: setor, sigla: sigla},
            {where: {id:id}}
        )
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'setores',
            id_registro: id
        })
            res.json({
                success: true,
                message: 'Setor alterado!'
            })
    }
    catch(error){
        res.status(500).json({
            success: false,
            message: 'Erro ao alterar setor.',
            error: error
        })
    }

})


//ROTAS DE USUARIOS
    app.get('/listar_usuarios',verificarAutenticacao,(req,res)=>{
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;
        const idUsuario = req.session.usuarioId
        const idGrupo = req.session.grupo
        

        if(req.session.perm_usuarios !== 1){
            return res.status(400).json({
                success:false,
                message: 'Você não tem permissão para acessar esta página.'
            })
        }

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

    app.get('/inserir_usuarios',verificarAutenticacao,verificarPermInserir,(req,res)=>{
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

    app.post('/salvar_usuarios',verificarAutenticacao,verificarPermInserir, async (req, res) => {
        try {
            const { nome, usuario, setor, grupo, senha, confirmar_senha, perm_usuarios, perm_grupoUsuarios } = req.body;
            const ativo = 1;

            // Gerando o salt e hash da senha
            const salt = await bcrypt.genSalt(10); // Gera um salt com fator de custo 10
            const senhaHash = await bcrypt.hash(senha, salt); // Criptografa a senha


            
            if(nome.trim().length < 3){
                return res.status(400).json({
                    success: false,
                    message: 'Digite um nome valido.'
                })
            }
            
            if(usuario.trim().length < 3){
                return res.status(400).json({
                    success: false,
                    message: 'Digite um usúario valido.'
                })
            }

            if(senha.length < 6){
                return res.status(400).json({
                    success: false,
                    message: 'A senha deve ter pelomenos 6 digitos.'
                })
            }

            if(senha !== confirmar_senha){
                return res.status(400).json({
                    success: false,
                    message: 'As senhas não conferem.'
                })
            }

            //VERIFICA SE O USUARIO JA ESTA CADASTRADO
            const userExistente = await usuarios.findOne({where: {usuario: usuario.toLowerCase().trim()}})

            if (userExistente){
                return res.status(400).json({
                    success: false,
                    message: 'Este usúario já esta cadastrado.'
                })
            }

            //VERIFICA SE JA TEM ESSE NOME CADASTRADO
            const nomeExistente = await usuarios.findOne({where: {nome: nome.toLowerCase().trim()}})

            if(nomeExistente){
                return res.status(400).json({
                    success: false,
                    message: 'Esse nome já está vinculado a um usúario.'
                })
            }


            await usuarios.create({
                nome: nome.toLowerCase().trim(),
                usuario: usuario.toLowerCase().trim(),
                setor: setor,
                perm_grupo_usuarios: perm_grupoUsuarios,
                perm_usuarios: perm_usuarios,
                grupo: grupo,
                senha: senhaHash,
                ativo: ativo
            });

            log.create({
                usuario: res.locals.usuarioid,
                acao: 'inserido',
                tabela: 'usuarios',
                id_registro: 0
            }).then(()=>{
                return res.json({ success: true, message: 'Usúario criado!' });
            })
        } catch (error) {
            console.error("Erro ao salvar usuário:", error);
            res.status(500).send("Erro ao salvar usuário.");
        }
    });

    app.post('/deletar_usuario',verificarAutenticacao,verificarPermDeletar,(req,res)=>{
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

    app.get('/alterar_usuarios/:id',verificarAutenticacao,verificarPermAlterar,(req,res)=>{
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

    app.post('/update_usuarios',verificarAutenticacao,verificarPermAlterar, async(req,res)=>{
        const id = req.body.id
        const setor = req.body.setor
        const grupo = req.body.grupo
        const perm_usuarios = req.body.perm_usuarios
        const perm_grupoUsuarios = req.body.perm_grupoUsuarios
        
        try {
            await usuarios.update(
                {setor: setor,
                grupo: grupo,
                perm_grupo_usuarios: perm_grupoUsuarios,
                perm_usuarios: perm_usuarios},
                {where: {id:id}}
            )
                log.create({
                    usuario: res.locals.usuarioid,
                    acao: 'alterado',
                    tabela: 'usuarios',
                    id_registro: id
                })
                    res.json({
                        success: true,
                        message: 'Usúario alterado!'
                    })
        }
        catch(error){
            res.status(500).json({
                success: false,
                message: 'Erro ao alterar usúario',
                error: error
            })
        }

    })



//ROTAS DE CONFIGURAÇÃO DE USUARIO
app.get('/configurar_usuario',verificarAutenticacao,(req,res)=>{
    const idUsuario = req.session.usuarioId

    usuarios.findOne(
        {where: {id: idUsuario}}
    ).then(usuario =>{
        res.render('configurar_usuario',{
            usuario: usuario,
            erro: null
        })
    })

})

app.post('/alterar_password', async (req, res) => {
    const senhaOld = req.body.senhaAntiga; // Senha antiga fornecida pelo usuário
    const senhaNew = req.body.novaSenha;   // Nova senha fornecida pelo usuário
    const senhaNew2 = req.body.confirmarNovaSenha; // Confirmação da nova senha fornecida pelo usuário
    const idUser = req.session.usuarioId; // ID do usuário logado (assumindo que você usa sessões)

    // Primeiro, verificar se todos os campos foram preenchidos
    if (!senhaOld || !senhaNew || !senhaNew2) {
        return res.status(400).json({ success: false, message: 'Todos os campos devem ser preenchidos.' });
    }

    // Verificar se as novas senhas coincidem
    if (senhaNew !== senhaNew2) {
        return res.status(400).json({ success: false, message: 'As senhas não coincidem.' });
    }

    if (senhaNew.length == 1) {
        return res.status(400).json({ success: false, message: 'Campo Obrigatório' });
    }

    // Verificar se a nova senha tem pelo menos 6 caracteres
    if (senhaNew.length > 2 && senhaNew.length < 6) {
        return res.status(400).json({ success: false, message: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }

    try {
        // Encontrar o usuário no banco de dados
        const usuario = await usuarios.findOne({ where: { id: idUser } });

        // Se o usuário não for encontrado
        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        // Verificar se a senha antiga está correta
        const senhaOK = await bcrypt.compare(senhaOld, usuario.senha);

        // Se a senha antiga não for correta
        if (!senhaOK) {
            return res.status(400).json({ success: false, message: 'Senha antiga incorreta.' });
        }

        const novaSenhaOK = await bcrypt.compare(senhaNew, usuario.senha);
        if(novaSenhaOK){
            return res.status(400).json({success: false, message: 'Você já está utilizando esta senha.'})
        }

        // Caso tudo esteja correto, fazer o update da senha
        const novaSenhaHash = await bcrypt.hash(senhaNew, 10); // Criptografar a nova senha

        // Atualizar a senha do usuário no banco de dados
        await usuarios.update({ senha: novaSenhaHash }, { where: { id: idUser } });

        // Enviar resposta de sucesso
        return res.json({ success: true, message: 'Senha alterada com sucesso!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Erro ao alterar a senha.' });
    }
});



//GRUPOS DE USUARIOS

app.get('/listar_grupos_de_usuarios',verificarAutenticacao,(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const idUsuario = req.session.usuarioId
    const idGrupo = req.session.grupo

    if(req.session.perm_grupos !== 1){
        return res.status(400).json({
            success:false,
            message: 'Você não tem permissão para acessar esta página.'
        })
    }


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

app.get('/inserir_grupos_de_usuarios',verificarAutenticacao,verificarPermInserir,(req,res)=>{
    res.render('inserir_grupos_de_usuarios')
})

app.post('/salvar_grupos_de_usuarios',verificarAutenticacao,verificarPermInserir, async(req, res)=>{
    var grupo = req.body.gruposusuario.toLowerCase()
    var inserir = req.body.inserir
    var alterar = req.body.alterar
    var deletar = req.body.deletar

    const grupoEncontrado = await grupos_de_usuarios.findOne({
        where: {
            grupo: grupo,
            ativo: 1
        }
    })

    if (grupo.length < 3){
        return res.status(400).json({
            success: false,
            message: 'Digite um grupo de usúarios válido.'
        })
    }

    if(grupoEncontrado){
        return res.status(400).json({
            success: false,
            message: 'Esse grupo de usúarios já esta cadastrado.'
        })
    }


    try {
        await grupos_de_usuarios.create({
            grupo: grupo,
            inserir: inserir,
            alterar: alterar,
            deletar: deletar,
            ativo: 1
        })
            log.create({
                usuario: res.locals.usuarioid,
                acao: 'inserido',
                tabela: 'grupos_de_usuarios',
                id_registro: 0
            })
                return res.json({
                    success: true,
                    message: 'Grupo de usúarios cadastrado!'
                })
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: 'Erro ao cadastrar grupo de usúarios'
        })
    }

})

app.post('/deletar_grupo',verificarAutenticacao,verificarPermDeletar,(req,res)=>{
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

app.get('/alterar_grupo_de_usuario/:id',verificarAutenticacao,verificarPermAlterar,(req,res)=>{
    const id = req.params.id

    grupos_de_usuarios.findOne(
        {where: {id:id}}
    ).then(grupos => {
        res.render('alterar_grupos_de_usuarios',{
            grupo: grupos
        })
    })
})

app.post('/update_grupos_de_usuarios',verificarAutenticacao,verificarPermAlterar,async(req,res)=>{
    const id = req.body.id
    const grupo = req.body.gruposusuario.toLowerCase()
    const alterar = req.body.alterar
    const inserir = req.body.inserir
    const deletar = req.body.deletar

    const grupoEncontrado = await grupos_de_usuarios.findOne({
        where:{
            grupo: grupo,
            ativo: 1
        }
    })

    if (grupo.length < 3){
        return res.status(400).json({
            success: false,
            message: 'Digite um grupo de usúarios válido.'
        })
    }

    if(grupoEncontrado.id != id){
        if(grupoEncontrado){
            return res.status(400).json({
                success:false,
                message: 'Esse grupo de usúarios já esta cadastrado.'
            })
        }
    }


    try {
        grupos_de_usuarios.update(
            {grupo: grupo, inserir: inserir, alterar: alterar, deletar: deletar},
            {where: {id:id}}
        )
            log.create({
                usuario: res.locals.usuarioid,
                acao: 'alterado',
                tabela: 'grupos_de_usuarios',
                id_registro: id
            })
                return res.json({
                    success: true,
                    message: 'Grupo de usúarios alterado!'
                })
    }
    catch(error){
        return res.json({
            success: false,
            message: 'Erro ao alterar grupo de usúarios',
            error: error
        })
    }
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

app.get('/inserir_concorrentes',verificarAutenticacao,verificarPermInserir,(req,res)=>{
    res.render('inserir_concorrentes')
})

app.post('/salvar_concorrentes',verificarAutenticacao, verificarPermInserir,async (req,res)=>{
    var nome = req.body.concorrente.toLowerCase()

    const concorrenteEncontrado = await concorrentes.findOne({
        where: {
            nome: nome,
            ativo: 1
        }
    })

    if(nome.length < 3){
        return res.status(400).json({
            success: false,
            message: 'Digite um concorrente válido.'
        })
    }

    if(concorrenteEncontrado){
        return res.status(400).json({
            success: false,
            message: 'Concorrente já cadastrado.'
        })
    }

    try {

      await  
            concorrentes.create({
            nome: nome.toLowerCase(),
            ativo: 1
        })
            log.create({
                usuario: res.locals.usuarioid,
                acao: 'inserido',
                tabela: 'concorrentes',
                id_registro: 0
            })
                return res.status(200).json({
                    success: true,
                    message: 'Concorrente cadastrado!'
                })
                
    } 
    catch(error){
        res.status(500).json({
            success: false,
            message: 'Ocorreu um erro',
            error: error.message
        })
    }
})

app.post('/deletar_concorrente',verificarAutenticacao,verificarPermDeletar,(req,res)=>{
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

app.get('/alterar_concorrentes/:id',verificarAutenticacao,verificarPermAlterar,(req,res)=>{
    const id = req.params.id

    concorrentes.findOne(
        {where: {id:id}}
    ).then(concorrentes =>{
        res.render('alterar_concorrentes',{
            concorrente: concorrentes
        })
    })
    
})

app.post('/update_concorrentes',verificarAutenticacao, verificarPermAlterar,async(req,res)=>{
    const id = req.body.id
    const nome = req.body.concorrente.trim()

    const concorrenteEncontrado = await concorrentes.findOne({
        where: {
            nome: nome,
            ativo: 1
        }
    })

    if(nome.length < 3){
        return res.status(400).json({
            success: false,
            message: 'Digite um concorrente válido.'
        })
    }

    if(concorrenteEncontrado){
        return res.status(400).json({
            success: false,
            message: 'Concorrente já cadastrado.'
        })
    }

    try {
        
        await concorrentes.update(
            {nome: nome},
            {where: {id:id}}
        )
            log.create({
                usuario: res.locals.usuarioid,
                acao: 'alterado',
                tabela: 'concorrentes',
                id_registro: id
            })
                return res.status(200).json({
                    success: true,
                    message: 'Concorrente alterado!'
                })

    } 
    catch {
        return res.status(500).json({
            success: false,
            message: 'Ocorreu um erro ao alterar o módulo.',
        });
    }

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

app.get('/inserir_modulos',verificarAutenticacao,verificarPermInserir,(req,res)=>{
    res.render('inserir_modulos')
})

app.post('/salvar_modulos',verificarAutenticacao,verificarPermInserir,async(req,res)=>{
    try{
        const modulo = req.body.modulo.toLowerCase().trim()

        const moduloEncontrado = await modulos.findOne({    
            where: {
                modulo: modulo,
                ativo: 1
              }
        })

        if(modulo.length < 3){
            return res.status(400).json({
                success: false,
                message: 'Digite um módulo válido.'
            })
        }

        if(moduloEncontrado){
            return res.status(400).json({
                success: false,
                message: 'Módulo Já cadastrado.'
            })
        }
    
        await modulos.create({
            modulo: modulo,
            ativo: 1
        }).then(()=>{
            log.create({
                usuario: res.locals.usuarioid,
                acao: 'inserido',
                tabela: 'modulos',
                id_registro: 0
            }).then(()=>{
                return res.json({
                    success: true,
                    message: 'Módulo cadastrado!'
                })
            })
        })
    } catch (error) {
        console.error("Erro ao salvar módulo:", error);
        res.redirect('/listar_modulos')
    }

})

app.post('/deletar_modulos',verificarAutenticacao,verificarPermDeletar,(req,res)=>{
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

app.get('/alterar_modulos/:id',verificarAutenticacao,verificarPermAlterar,(req,res)=>{
    var id = req.params.id

    modulos.findOne(
        {where: {id:id}}
    ).then(modulos => {
        res.render('alterar_modulos',{
            modulo: modulos
        })
    })
})

app.post('/update_modulos',verificarAutenticacao, verificarPermAlterar,async(req,res)=> {
    const id = req.body.id
    const modulo = req.body.modulo.trim()

    const moduloEncontrado = await modulos.findOne({
        where: {
            modulo: modulo,
            ativo: 1
        }
    })

    if(modulo.length < 3){
        return res.status(400).json({
            success: false,
            message: 'Digite um módulo válido.'
        })
    }

    if (moduloEncontrado){
        return res.status(400).json({
            success: false,
            message: 'Este módulo já esta cadastrado.'
        })
    }
    try {
        await modulos.update(
            { modulo: modulo },
            { where: { id: id } }
        );

        // Log da alteração
        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'modulos',
            id_registro: id
        });

        return res.status(200).json({
            success: true,
            message: 'Módulo alterado com sucesso!'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Ocorreu um erro ao alterar o módulo.',
            error: error.message
        });
    }
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

app.get('/inserir_tipos_entidade',verificarAutenticacao,verificarPermInserir,(req,res)=>{
    res.render('inserir_tipos_entidade')
})

app.post('/salvar_tipos_entidade',verificarAutenticacao,verificarPermInserir,async(req,res)=>{
    const tipo_entidade = req.body.tipo_entidade.toLowerCase()

    const tipoEncontrado = await tipos_entidade.findOne({
        where: {
            tipo_entidade: tipo_entidade,
            ativo: 1
        }
    })

    if(tipo_entidade.length < 3){
        return res.status(400).json({
            success: false,
            message: 'Digite um tipo de entidade válido.'
        })
    }

    if(tipoEncontrado){
        return res.status(400).json({
            success: false,
            message: 'Esse tipo de entidade já esta cadastrado.'
        })
    }

    try {
        await tipos_entidade.create({
            tipo_entidade: tipo_entidade,
            ativo: 1
        })
            log.create({
                usuario: res.locals.usuarioid,
                acao: 'inserido',
                tabela: 'tipos_entidades',
                id_registro: 0
            })  
                return res.json({
                    success: true,
                    message: 'Tipo de entidade cadastrado!'
                })

    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: 'Erro ao cadastrar tipo.',
            error: error
        })
    }
})

app.post('/deletar_tipo_entidade',verificarAutenticacao,verificarPermDeletar,(req,res)=>{
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

app.get('/alterar_tipos_de_enteidade/:id',verificarAutenticacao,verificarPermAlterar,(req,res)=>{
    const id = req.params.id

    tipos_entidade.findOne(
        {where: {id:id}}
    ).then(tipo =>{
        res.render('alterar_tipos_entidade',{
            tipo: tipo
        })
    })
})

app.post('/update_tipo_entidade',verificarAutenticacao, verificarPermAlterar,async(req,res)=>{
    const id = req.body.id
    const tipo_entidade = req.body.tipo_entidade.toLowerCase()

    const tipoEncontrado = await tipos_entidade.findOne({
        where: {
            tipo_entidade: tipo_entidade, 
            ativo: 1
        }
    })

    if(tipo_entidade.length < 3){
        return res.status(400).json({
            success: false,
            message: 'Digite um tipo de entidade válido.'
        })
    }

    if(tipoEncontrado){
        return res.status(400).json({
            success: false,
            message: 'Esse tipo de entidade já esta cadastrado.'
        })
    }

    try {
        await tipos_entidade.update(
            {tipo_entidade: tipo_entidade},
            {where: {id:id}}
        )
            log.create({
                usuario: res.locals.usuarioid,
                acao: 'alterado',
                tabela: 'tipos_entidades',
                id_registro: id
            })  
                return res.json({
                    success: true,
                    message: 'Tipo de entidade alterado!'
                })
    }
    catch(error){
        return res.json({
            success: false,
            message: 'Erro ao alterar tipo de entidade.',
            error: error
        })
    }

})

//CRIANDO O SERVIDOR
app.listen(8080, ()=>{
    console.log('Aplicativo Online')
})


