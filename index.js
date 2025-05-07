const bodyParser = require('body-parser')
const express = require('express')
const app = express()
const bcrypt = require('bcryptjs'); //criptografa senha
const session = require('express-session');
const Sequelize = require('sequelize')

//BANCO DE DADOS
const connection = require('./database/db') //TRAZ A A CONFIGURACAO DE CONEXAO DO BANCO DE DADOS 
const entidades = require('./database/entidades') //TRAZ CONEXAO COM A TABELA DO BD
const versao_sistema = require('./database/versao_sistema');
const tipos_ticket = require('./database/tipos_ticket');
const prioridades = require('./database/prioridades');
const ticket_pausa = require('./database/ticket_pausa')
const setores = require('./database/setores');
const tickets = require('./database/tickets')
const usuarios = require('./database/usuarios');
const grupos_de_usuarios = require('./database/grupos_de_usuarios');
const concorrentes = require('./database/concorrentes');
const modulos = require('./database/modulos')
const log = require('./database/log');
const tipos_entidade = require('./database/tipos_entidade');
const { where } = require('sequelize');
const { Op } = require('sequelize');  // Importa o operador Op do Sequelize


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
app.get('/', async (req,res)=>{
    try{
        const [ entidade, ticket, entidadeG, tipo, versao] = await Promise.all([
            entidades.findAll({
                order: [['id','DESC']],
                limit: 4
            }),
            tickets.findAll({
                order: [['id','DESC']],
                limit: 4
            }),
            entidades.findAll(),
            tipos_entidade.findAll(),
            versao_sistema.findAll()
        ])

        res.render('index',{
            entidades: entidade,
            tickets: ticket,
            entidadesG: entidadeG,
            tipos: tipo,
            versoes: versao
        })
    }
    catch{

    }
    
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
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;

    try {
        const usuarioEncontrado = await usuarios.findOne({ where: { usuario } });

        if (!usuarioEncontrado) {
            return res.json({
                success: false,
                message: '*Usuário inválido.'
            });
        }

        if (usuarioEncontrado.ativo !== 1) {
            return res.json( {
                success: false,
                message: '*Usuário inativo.'
            });
        }

        const senhaValida = await bcrypt.compare(senha, usuarioEncontrado.senha);
        if (!senhaValida) {
            return res.json( {
                success: false,
                message: '*Senha inválida.'
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
    if (req.session.usuarioId){
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
    } else {
        res.redirect('/')
    }
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
app.get('/listar_entidades', verificarAutenticacao, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Página atual (default: 1)
        const limit = 20;                           // Registros por página
        const offset = (page - 1) * limit;          // Calcula o deslocamento
        const idUsuario = req.session.usuarioId;
        const idGrupo = req.session.grupo;

        // Captura os filtros da requisição
        const { search, instalado, ordenar } = req.query;

        // Filtros dinâmicos
        const whereCondition = { ativo: 1 };
        if (search) whereCondition.cidade = { [Op.like]: `%${search}%` };
        
        // Ordenação
        let orderCondition = [];
        switch (ordenar) {
            case 'mais_recente':
                orderCondition = [['id', 'DESC']];
                break;
            case 'menos_recente':
                orderCondition = [['id', 'ASC']];
                break;
            case 'a_z':
                orderCondition = [['cidade', 'ASC'], ['estado', 'ASC']];
                break;
            case 'z_a':
                orderCondition = [['cidade', 'DESC'], ['estado', 'DESC']];
                break;
            default:
                orderCondition = [['cidade', 'ASC'], ['estado', 'ASC']];
                break;
        }

        if (instalado !== undefined) {
            if (instalado === '') {
                delete whereCondition.instalado; // Remove o filtro se "Todos" for selecionado
            } else {
                whereCondition.instalado = instalado === '1' ? 1 : 0; // "Sim" => 1, "Não" => 0
            }
        }

        // Busca entidades com paginação e filtro
        const result = await entidades.findAndCountAll({
            where: whereCondition,
            order: orderCondition,
            limit: limit,
            offset: offset
        });

        const totalEntidades = result.count;
        const totalPages = Math.ceil(totalEntidades / limit);

        // Busca os dados auxiliares
        const [tipos, versoes, usuarioinfo, grupoinfo, ticket] = await Promise.all([
            tipos_entidade.findAll(),
            versao_sistema.findAll(),
            usuarios.findOne({ where: { id: idUsuario } }),
            grupos_de_usuarios.findOne({ where: { id: idGrupo } }),
            tickets.findAll({where: {status_geral:{ [Op.notLike]: `finalizado` }}})
        ]);

        res.render('listar_entidades', {
            entidades: result.rows,
            tipos: tipos,
            versoes: versoes,
            currentPage: page,
            totalPages: totalPages,
            infoUser: usuarioinfo,
            infoGrupo: grupoinfo,
            filtros: { search, instalado, ordenar },
            ordenar: ordenar,
            instalado: instalado,
            tickets: ticket
        });

    } catch (err) {
        console.error('Erro ao buscar entidades:', err);
        res.status(500).send('Erro interno no servidor');
    }
});

app.get('/inserir_entidades',verificarAutenticacao, verificarPermInserir,(req,res)=>{
    tipos_entidade.findAll({order: [['tipo_entidade', 'ASC']]}).then(tipos_entidade =>{
        modulos.findAll({order: [['modulo', 'ASC']]}).then(modulos => {
            versao_sistema.findAll({order: [['versao', 'ASC']]}).then(versao_sistema => {
                concorrentes.findAll({order: [['nome', 'ASC']]}).then(concorrentes =>{
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
    var instalado = req.body.instalado
    var observacao = req.body.observacao.trim()
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
            modulos_contratados: Array.isArray(modulos_contratados) ? modulos_contratados.join(',') : modulos_contratados,
            versao_sistema: versao_sistema,
            instalado: instalado,
            observacao: observacao,
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
            versao_sistema.findAll({order: [['versao','ASC']]}).then(versao => {
                modulos.findAll({order: [['modulo','ASC']]}).then(modulos => {
                    concorrentes.findAll({order: [['nome','ASC']]}).then(concorrentes => {
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
    const instalado = req.body.instalado
    const observacao = req.body.observacao.trim()

    
    try {
        entidades.update(
            {
                modulos_contratados: Array.isArray(modulos_contratados) ? modulos_contratados.join(', ') : modulos_contratados,
                versao_sistema: versao,
                website_concorrente: website_concorrente,
                sistema_concorrente: sistema_concorrente,
                instalado: instalado,
                observacao: observacao
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

app.get('/entidade/:id', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Página atual (default: 1)
        const limit = 5;                           // Registros por página
        const offset = (page - 1) * limit;          // Calcula o deslocamento
        const idEntidade = req.params.id;

        // Busca a entidade
        const entidadeEncontrada = await entidades.findOne({ where: { id: idEntidade } });

        // Se não encontrar a entidade, retorna erro
        if (!entidadeEncontrada) {
            return res.status(404).json({ error: "Entidade não encontrada" });
        }

        // Buscar os dados relacionados em paralelo
        const [concorrente, modulo, versao, tipo, ticket, tipo_ticket, prioridade] = await Promise.all([
            concorrentes.findAll(),
            modulos.findAll(),
            versao_sistema.findOne({ where: { id: entidadeEncontrada.versao_sistema } }),
            tipos_entidade.findOne({ where: { id: entidadeEncontrada.tipo_entidade } }),
            tickets.findAndCountAll({ where: { id_entidade: idEntidade },order: [['id','DESC']], limit: limit, offset: offset}),
            tipos_ticket.findAll(),
            prioridades.findAll(),
        ]);

        const totaltickets = ticket.count;
        const totalPages = Math.ceil(totaltickets / limit);


        // Renderiza a página com os dados
        res.render('entidade', {
            entidade: entidadeEncontrada,
            concorrentes: concorrente,
            modulos: modulo || null, // Garante que será null caso não encontre
            versao: versao || null,
            tipo: tipo || null,
            Tickets: ticket.rows || [],
            tipos_ticket: tipo_ticket || null,
            prioridades: prioridade || [],
            currentPage: page,
            totalPages: totalPages
        });

    } catch (error) {
        console.error("Erro ao buscar entidade:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

app.get('/entidades', async (req, res) => {
    try {
        // Importando filtros da query string
        const { instalado, tipo_entidade, versao, ticket, ordenar, search, exibir, data_inicial, data_final } = req.query;
        
        // Pegando a página da query string, com valor padrão 1 caso não seja fornecido
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(exibir, 10) || 10;  // Convertendo `exibir` para número inteiro
        const offset = (page - 1) * limit; // Calcula o deslocamento para a consulta

        // Pegando dados do usuário e grupo (caso necessário)
        const idUsuario = req.session.usuarioId;
        const idGrupo = req.session.grupo;
        
        // Trazendo as tabelas que são usadas para os filtros
        const [tickets_geral, tipo, versao_sis, modulo_geral] = await Promise.all([
            tickets.findAll({where: {status_geral: { [Op.notLike]: 'finalizado' }}}),
            tipos_entidade.findAll(),
            versao_sistema.findAll(),
            modulos.findAll()
        ]);

        
        // Filtros dinâmicos - base para consulta
        const whereCondition = { ativo: 1 };

        // Filtro de pesquisa (search) - exemplo: busca pela cidade
        if (search && search.trim() !== "") {
            whereCondition.cidade = { [Op.like]: `%${search}%` };
        }

        // Filtro de "Instalado"
        if (instalado) whereCondition.instalado = instalado;

        // Filtro para "Tipo de Entidade" - Aceita múltiplos valores (checkbox)
        if (tipo_entidade) {
            const tiposSelecionados = Array.isArray(tipo_entidade) ? tipo_entidade : [tipo_entidade];
            whereCondition.tipo_entidade = { [Op.in]: tiposSelecionados };
        }

        // Filtro para "Versão" - Aceita múltiplos valores (checkbox)
        if (versao) {
            const versoesSelecionadas = Array.isArray(versao) ? versao : [versao];
            whereCondition.versao_sistema = { [Op.in]: versoesSelecionadas };
        }

        // Filtro para "Ticket" - Aceita valores filtrados
        if (ticket) {
            if (ticket === '1') {
                // Quando o ticket é "1", busca as entidades que estão associadas a algum ticket
                const TicketsEncontrados = await tickets.findAll();  // Encontra todos os tickets
                const idsEntidades = TicketsEncontrados.map(entidade => entidade.id_entidade);  // Mapeia os ids das entidades

                if (idsEntidades.length > 0) {
                    whereCondition.id = { [Op.in]: idsEntidades };  // Filtra as entidades com esses ids
                }
            }
            else if (ticket === '0') {
                // Quando o ticket é "0", busca as entidades que NÃO estão associadas a nenhum ticket
                const TicketsEncontrados = await tickets.findAll({
                    attributes: ['id_entidade'],
                    where: { id_entidade: { [Op.ne]: null } }, // Filtra as entidades com tickets não nulos
                });

                const idsEntidadesComTicket = TicketsEncontrados.map(entidade => entidade.id_entidade);

                // Filtra as entidades que NÃO estão nesses ids
                whereCondition.id = {
                    [Op.notIn]: idsEntidadesComTicket
                };
            }
        }

        var modulosg = req.query.modulo;

        if (!Array.isArray(modulosg)) {
            modulosg = modulosg ? [modulosg] : [];
        }
        
        // Se "nenhum" for selecionado, filtra as entidades onde a coluna "modulos_contratados" é vazia
        if (modulosg.includes('nenhum')) {
            whereCondition.modulos_contratados = { [Op.eq]: '' };  // Filtra para colunas vazias
        } else if (modulosg.length > 0) {
            // Filtra as entidades com base nos módulos selecionados
            whereCondition[Op.or] = modulosg.map(id => 
                Sequelize.where(
                    Sequelize.fn('FIND_IN_SET', id, Sequelize.col('modulos_contratados')),
                    {
                        [Op.gt]: 0
                    }
                )
            );
        }
        
        
        if (data_inicial) {
            if (data_final) {
                whereCondition.createdAt = {
                    [Op.between]: [data_inicial, data_final]
                };
            } else {
                whereCondition.createdAt = {
                    [Op.gte]: data_inicial
                };
            }
        } else if (data_final) {
            whereCondition.createdAt = {
                [Op.lte]: data_final
            };
        }

        // Definindo a ordenação
        let orderCondition = [];
        switch (ordenar) {
            case 'mais_recente':
                orderCondition = [['id', 'DESC']];
                break;
            case 'menos_recente':
                orderCondition = [['id', 'ASC']];
                break;
            case 'a_z':
                orderCondition = [['cidade', 'ASC'], ['estado', 'ASC']];
                break;
            case 'z_a':
                orderCondition = [['cidade', 'DESC'], ['estado', 'DESC']];
                break;
            default:
                orderCondition = [['id', 'DESC']];
                break;
        }

        // Consultando as entidades com os filtros e a paginação
        const result = await entidades.findAndCountAll({
            where: whereCondition,
            order: orderCondition,
            limit: limit,
            offset: offset
        });

        // Calculando o total de páginas para a navegação
        const totalEntidades = result.count;
        const totalPages = Math.ceil(totalEntidades / limit);

        // Renderizando a página com os dados encontrados
        res.render('entidades', {
            currentPage: page,
            totalPages: totalPages,
            entidades: result.rows,
            tickets: tickets_geral,
            tipos: tipo,
            versoes: versao_sis,
            modulos: modulo_geral,
            i: instalado,
            t: ticket,
            te: tipo_entidade,
            v: versao,
            m: modulosg,
            o: ordenar,
            e: exibir,
            dt_i: data_inicial,
            dt_f: data_final
        });
    } catch (err) {
        // Caso ocorra algum erro, mostrando mensagem e log
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Erro ao trazer entidades',
            error: err.message
        });
    }
});





//VERSAO DO SISTEMA
app.get('/listar_versaosis',verificarAutenticacao, (req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const idUsuario = req.session.usuarioId
    const idGrupo = req.session.grupo

    // Captura os filtros da requisição
    const { search,  ordenar } = req.query;

    // Filtros dinâmicos
    const whereCondition = { ativo: 1 };
    if (search) whereCondition.versao = { [Op.like]: `%${search}%` };

    // Ordenação
    let orderCondition = [];
    switch (ordenar) {
        case 'mais_recente':
            orderCondition = [['id', 'DESC']];
            break;
        case 'menos_recente':
            orderCondition = [['id', 'ASC']];
            break;
        case 'a_z':
            orderCondition = [['versao', 'ASC']];
            break;
        case 'z_a':
            orderCondition = [['versao', 'DESC']];
            break;
        default:
            orderCondition = [['versao', 'ASC']];
            break;
    }


    versao_sistema.findAndCountAll({
        where: whereCondition,
        order: orderCondition,
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
                    infoGrupo: grupoinfo,
                    ordenar: ordenar
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
    const versao = req.body.versaosis.toLowerCase().trim()

    const versaoEncontrada = await versao_sistema.findOne({
        where: {
            versao: versao,
            ativo: 1,
            id: {
                [Op.ne]: id
            }
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


    // Captura os filtros da requisição
    const { search,  ordenar } = req.query;

    // Filtros dinâmicos
    const whereCondition = { ativo: 1 };
    if (search) whereCondition.setor = { [Op.like]: `%${search}%` };

    // Ordenação
    let orderCondition = [];
    switch (ordenar) {
        case 'mais_recente':
            orderCondition = [['id', 'DESC']];
            break;
        case 'menos_recente':
            orderCondition = [['id', 'ASC']];
            break;
        case 'a_z':
            orderCondition = [['setor', 'ASC']];
            break;
        case 'z_a':
            orderCondition = [['setor', 'DESC']];
            break;
        default:
            orderCondition = [['setor', 'ASC']];
            break;
    }

    setores.findAndCountAll({
        where: whereCondition,
        order: orderCondition,
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
                    infoGrupo: grupoinfo,
                    ordenar: ordenar
                })
            })
         })    

    })
    
})

app.get('/inserir_setor',verificarAutenticacao,verificarPermInserir,(req,res)=>{
    res.render('inserir_setor')
})

app.post('/salvarsetor',verificarAutenticacao,verificarPermInserir, async(req,res)=>{
    var setor = req.body.setor.toLowerCase().trim()
    var sigla = req.body.sigla.toLowerCase().trim()
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
    const setor = req.body.setor.toLowerCase().trim()
    const sigla = req.body.sigla.toLowerCase().trim()
    const id = req.body.id

    const setorEncontrado = await setores.findOne({
        where: {
            setor: setor,
            ativo: 1,
            id: {
                [Op.ne]: id
            }
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
            ativo: 1,
            id: {
                [Op.ne]: id  // Não trazer o registro com id igual a 5
            }
        }
    })

    if(sigla.trim().length < 3){
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
    
// Captura os filtros da requisição
const { search,  ordenar } = req.query;

// Filtros dinâmicos
const whereCondition = { ativo: 1 };
if (search) whereCondition.nome = { [Op.like]: `%${search}%` };

// Ordenação
let orderCondition = [];
switch (ordenar) {
    case 'mais_recente':
        orderCondition = [['id', 'DESC']];
        break;
    case 'menos_recente':
        orderCondition = [['id', 'ASC']];
        break;
    case 'a_z':
        orderCondition = [['nome', 'ASC']];
        break;
    case 'z_a':
        orderCondition = [['nome', 'DESC']];
        break;
    default:
        orderCondition = [['nome', 'ASC']];
        break;
}


    if(req.session.perm_usuarios !== 1){
        return res.status(400).json({
            success:false,
            message: 'Você não tem permissão para acessar esta página.'
        })
    }

    usuarios.findAndCountAll({
        where: whereCondition,
        order: orderCondition,
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
                            grupos: grupos,
                            ordenar: ordenar
                        })    
                    })
                })
            })
        })    
        
    })

    

    
    
})

app.get('/inserir_usuarios',verificarAutenticacao,verificarPermInserir,(req,res)=>{
    setores.findAll({order: [['setor','ASC']]}).then(setores => {
        grupos_de_usuarios.findAll({
            where: {ativo: 1},
            order: [['grupo','ASC']]
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
        setores.findAll({order: [['setor','ASC']]}).then(setores =>{
            grupos_de_usuarios.findAll({order: [['grupo','ASC']]}).then(grupos =>{

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

app.get('/usuario/:id', async (req,res)=> {
    try {
        const id = req.params.id
        const page = parseInt(req.query.page) || 1; // Página atual (default: 1)
        const limit = 5;                           // Registros por página
        const offset = (page - 1) * limit;          // Calcula o deslocamento

        // Busca a entidade
        const UsuarioEncontrado = await usuarios.findOne({ where: { id: id } });

        // Se não encontrar a entidade, retorna erro
        if (!UsuarioEncontrado) {
            return res.status(404).json({ error: "Usúario não encontrado" });
        }

        // Buscar os dados relacionados em paralelo
        const [entidade, tipo, ticket, tipo_ticket, prioridade, setor, TicketTotal] = await Promise.all([
            entidades.findAll(),
            tipos_entidade.findAll(),
            tickets.findAndCountAll({ where: {
                [Op.or]: [
                  { responsavel: id }, // responsavel é igual ao id
                  { auxiliares: { [Op.like]: `%,${id},%` } }, // Verifica se o id está entre os ids na string (com vírgulas)
                  { auxiliares: { [Op.like]: `${id},%` } },   // Verifica se o id é o primeiro na lista
                  { auxiliares: { [Op.like]: `%,${id}` } },   // Verifica se o id é o último na lista
                  { auxiliares: id }                          // Verifica se o id é o único valor na lista
                ]
              },order: [['id','DESC']], limit: limit, offset: offset}),
            tipos_ticket.findAll(),
            prioridades.findAll(),
            setores.findOne({where: {id:UsuarioEncontrado.setor}}),
            tickets.findAll()
        ]);

        const totaltickets = ticket.count;
        const totalPages = Math.ceil(totaltickets / limit);


        // Renderiza a página com os dados
        res.render('usuario', {
            usuario: UsuarioEncontrado,
            entidades: entidade || null,
            tipos: tipo || null,
            Tickets: ticket.rows || [],
            tipos_ticket: tipo_ticket || null,
            prioridades: prioridade || [],
            currentPage: page,
            totalPages: totalPages,
            setor: setor,
            TicketTotal: TicketTotal
        });

    } catch (error) {
        console.error("Erro ao buscar usúario:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
})

app.get('/usuarios', async (req, res) => {
    try {
        // Importando filtros da query string
        const { setor, ticket, ordenar, search, exibir, data_inicial, data_final } = req.query;
        
        // Pegando a página da query string, com valor padrão 1 caso não seja fornecido
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(exibir, 10) || 10;  // Convertendo `exibir` para número inteiro
        const offset = (page - 1) * limit; // Calcula o deslocamento para a consulta

        // Pegando dados do usuário e grupo (caso necessário)
        const idUsuario = req.session.usuarioId;
        const idGrupo = req.session.grupo;
        
        // Trazendo as tabelas que são usadas para os filtros
        const [tickets_geral, tipo, setorG] = await Promise.all([
            tickets.findAll({where: {status_geral: { [Op.notLike]: 'finalizado' }}}),
            tipos_entidade.findAll(),
            setores.findAll()
        ]);

        
        // Filtros dinâmicos - base para consulta
        const whereCondition = { id: { [Op.notLike]: 1 } };

        // Filtro de pesquisa (search) - exemplo: busca pela cidade
        if (search && search.trim() !== "") {
            whereCondition.nome = { [Op.like]: `%${search}%` };
        }
       
        // Filtro para "Tipo de Entidade" - Aceita múltiplos valores (checkbox)
        if (setor) {
            const setorSelecionados = Array.isArray(setor) ? setor : [setor];
            whereCondition.setor = { [Op.in]: setorSelecionados };
        }

       // Filtro para "Usuário" - Aceita valores filtrados
        if (ticket) {
            if (ticket === '1') {
                // Quando o ticket é "1", busca os usuários que estão associados a algum ticket (responsável ou auxiliar)
                const TicketsEncontrados = await tickets.findAll();  // Encontra todos os tickets
                
                // Filtra os usuários que estão associados a algum ticket (responsável ou auxiliar)
                const idsUsuariosComTicket = TicketsEncontrados.reduce((acc, ticket) => {
                    // Verifica se o usuário é o responsável
                    if (ticket.responsavel) {
                        acc.push(ticket.responsavel);  // Adiciona o responsável
                    }
                    
                    // Verifica se o usuário está na lista de auxiliares
                    const auxiliaresArray = ticket.auxiliares.split(',').map(aux => aux.trim());
                    auxiliaresArray.forEach(aux => {
                        if (aux) acc.push(aux);  // Adiciona cada auxiliar encontrado
                    });
                    
                    return acc;
                }, []);

                // Remove IDs duplicados
                const uniqueIdsUsuariosComTicket = [...new Set(idsUsuariosComTicket)];

                // Verifica se algum usuário foi encontrado
                if (uniqueIdsUsuariosComTicket.length > 0) {
                    whereCondition.id = { [Op.in]: uniqueIdsUsuariosComTicket };  // Filtra os usuários associados aos tickets
                }
            }
            else if (ticket === '0') {
                // Quando o ticket é "0", busca os usuários que NÃO estão associados a nenhum ticket (nem como responsável, nem como auxiliar)
                const TicketsEncontrados = await tickets.findAll({
                    attributes: ['responsavel', 'auxiliares'],  // Pegando apenas os campos necessários
                });

                const idsUsuariosComTicket = TicketsEncontrados.reduce((acc, ticket) => {
                    // Verifica se o ticket tem algum responsável ou auxiliares
                    if (ticket.responsavel) {
                        acc.push(ticket.responsavel);  // Adiciona o responsável
                    }
                    const auxiliaresArray = ticket.auxiliares.split(',').map(aux => aux.trim());
                    auxiliaresArray.forEach(aux => {
                        if (aux) acc.push(aux);  // Adiciona cada auxiliar encontrado
                    });
                    return acc;
                }, []);

                // Remove IDs duplicados
                const uniqueIdsUsuariosComTicket = [...new Set(idsUsuariosComTicket)];

                // Filtra os usuários que NÃO estão nesses ids
                whereCondition.id = {
                    [Op.notIn]: uniqueIdsUsuariosComTicket
                };
            }
        }

        if (data_inicial) {
            if (data_final) {
                whereCondition.createdAt = {
                    [Op.between]: [data_inicial, data_final]
                };
            } else {
                whereCondition.createdAt = {
                    [Op.gte]: data_inicial
                };
            }
        } else if (data_final) {
            whereCondition.createdAt = {
                [Op.lte]: data_final
            };
        }

        // Definindo a ordenação
        let orderCondition = [];
        switch (ordenar) {
            case 'mais_recente':
                orderCondition = [['id', 'DESC']];
                break;
            case 'menos_recente':
                orderCondition = [['id', 'ASC']];
                break;
            case 'a_z':
                orderCondition = [['nome', 'ASC']];
                break;
            case 'z_a':
                orderCondition = [['nome', 'DESC']];
                break;
            default:
                orderCondition = [['id', 'DESC']];
                break;
        }

        // Consultando as entidades com os filtros e a paginação
        const result = await usuarios.findAndCountAll({
            where: whereCondition,
            order: orderCondition,
            limit: limit,
            offset: offset
        });

        // Calculando o total de páginas para a navegação
        const totalUsuarios = result.count;
        const totalPages = Math.ceil(totalUsuarios / limit);

        // Renderizando a página com os dados encontrados
        res.render('usuarios', {
            currentPage: page,
            totalPages: totalPages,
            usuarios: result.rows,
            tickets: tickets_geral,
            tipos: tipo,
            setores: setorG,
            t: ticket,
            se: setor,
            o: ordenar,
            e: exibir,
            dt_i: data_inicial,
            dt_f: data_final
        });

    } catch (err) {
        // Caso ocorra algum erro, mostrando mensagem e log
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Erro ao trazer usúarios',
            error: err.message
        });
    }
});


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



    // Verificar se a nova senha tem pelo menos 6 caracteres
    if (senhaNew.length < 6) {
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


    // Captura os filtros da requisição
    const { search,  ordenar } = req.query;

    // Filtros dinâmicos
    const whereCondition = { ativo: 1 };
    if (search) whereCondition.grupo = { [Op.like]: `%${search}%` };

    // Ordenação
    let orderCondition = [];
    switch (ordenar) {
        case 'mais_recente':
            orderCondition = [['id', 'DESC']];
            break;
        case 'menos_recente':
            orderCondition = [['id', 'ASC']];
            break;
        case 'a_z':
            orderCondition = [['grupo', 'ASC']];
            break;
        case 'z_a':
            orderCondition = [['grupo', 'DESC']];
            break;
        default:
            orderCondition = [['grupo', 'ASC']];
            break;
    }

    grupos_de_usuarios.findAndCountAll({
        where: whereCondition,
        order: orderCondition,
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
                    infoGrupo: grupoinfo,
                    ordenar: ordenar
                })
            })
        })    

    })
    
    
})

app.get('/inserir_grupos_de_usuarios',verificarAutenticacao,verificarPermInserir,(req,res)=>{
    res.render('inserir_grupos_de_usuarios')
})

app.post('/salvar_grupos_de_usuarios',verificarAutenticacao,verificarPermInserir, async(req, res)=>{
    var grupo = req.body.gruposusuario.toLowerCase().trim()
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
    const grupo = req.body.gruposusuario.toLowerCase().trim()
    const alterar = req.body.alterar
    const inserir = req.body.inserir
    const deletar = req.body.deletar

    const grupoEncontrado = await grupos_de_usuarios.findOne({
        where:{
            grupo: grupo,
            ativo: 1,
            id: {
                [Op.ne]: id
            }
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

    // Captura os filtros da requisição
    const { search,  ordenar } = req.query;

    // Filtros dinâmicos
    const whereCondition = { ativo: 1 };
    if (search) whereCondition.nome = { [Op.like]: `%${search}%` };

    // Ordenação
    let orderCondition = [];
    switch (ordenar) {
        case 'mais_recente':
            orderCondition = [['id', 'DESC']];
            break;
        case 'menos_recente':
            orderCondition = [['id', 'ASC']];
            break;
        case 'a_z':
            orderCondition = [['nome', 'ASC']];
            break;
        case 'z_a':
            orderCondition = [['nome', 'DESC']];
            break;
        default:
            orderCondition = [['nome', 'ASC']];
            break;
    }

    concorrentes.findAndCountAll({
        where: whereCondition,
        order: orderCondition,
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
                    infoGrupo: grupoinfo,
                    ordenar: ordenar
                })
            })
         })    

    })
    
})

app.get('/inserir_concorrentes',verificarAutenticacao,verificarPermInserir,(req,res)=>{
    res.render('inserir_concorrentes')
})

app.post('/salvar_concorrentes',verificarAutenticacao, verificarPermInserir,async (req,res)=>{
    var nome = req.body.concorrente.toLowerCase().trim()

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
    const nome = req.body.concorrente.toLowerCase().trim()

    const concorrenteEncontrado = await concorrentes.findOne({
        where: {
            nome: nome,
            ativo: 1,
            id: {
                [Op.ne]: id
            }
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

        // Captura os filtros da requisição
        const { search,  ordenar } = req.query;

        // Filtros dinâmicos
        const whereCondition = { ativo: 1 };
        if (search) whereCondition.modulo = { [Op.like]: `%${search}%` };
    
        // Ordenação
        let orderCondition = [];
        switch (ordenar) {
            case 'mais_recente':
                orderCondition = [['id', 'DESC']];
                break;
            case 'menos_recente':
                orderCondition = [['id', 'ASC']];
                break;
            case 'a_z':
                orderCondition = [['modulo', 'ASC']];
                break;
            case 'z_a':
                orderCondition = [['modulo', 'DESC']];
                break;
            default:
                orderCondition = [['modulo', 'ASC']];
                break;
        }

    modulos.findAndCountAll({
        where: whereCondition,
        order: orderCondition,
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
                    infoGrupo: grupoinfo,
                    ordenar: ordenar
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
    const modulo = req.body.modulo.toLowerCase().trim()

    const moduloEncontrado = await modulos.findOne({
        where: {
            modulo: modulo,
            ativo: 1,
            id: {
                [Op.ne]: id
            }
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

       // Captura os filtros da requisição
       const { search,  ordenar } = req.query;

       // Filtros dinâmicos
       const whereCondition = { ativo: 1 };
       if (search) whereCondition.tipo_entidade = { [Op.like]: `%${search}%` };
   
       // Ordenação
       let orderCondition = [];
       switch (ordenar) {
           case 'mais_recente':
               orderCondition = [['id', 'DESC']];
               break;
           case 'menos_recente':
               orderCondition = [['id', 'ASC']];
               break;
           case 'a_z':
               orderCondition = [['tipo_entidade', 'ASC']];
               break;
           case 'z_a':
               orderCondition = [['tipo_entidade', 'DESC']];
               break;
           default:
               orderCondition = [['tipo_entidade', 'ASC']];
               break;
       }

    tipos_entidade.findAndCountAll({
        where: whereCondition,
        order: orderCondition,
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
                    infoGrupo: grupoinfo,
                    ordenar: ordenar
                })
            })
         })    

    })
    
})

app.get('/inserir_tipos_entidade',verificarAutenticacao,verificarPermInserir,(req,res)=>{
    res.render('inserir_tipos_entidade')
})

app.post('/salvar_tipos_entidade',verificarAutenticacao,verificarPermInserir,async(req,res)=>{
    const tipo_entidade = req.body.tipo_entidade.toLowerCase().trim()

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

app.get('/alterar_tipos_de_entidade/:id',verificarAutenticacao,verificarPermAlterar,(req,res)=>{
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
    const tipo_entidade = req.body.tipo_entidade.toLowerCase().trim()

    const tipoEncontrado = await tipos_entidade.findOne({
        where: {
            tipo_entidade: tipo_entidade, 
            ativo: 1,
            id: {
                [Op.ne]: id
            }
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



//PARTE RELACIONADA AOS TICKETS
//ROTAS DE PRIORIDADE
app.get('/listar_prioridades',verificarAutenticacao,(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit
    const idUsuario = req.session.usuarioId
    const idGrupo = req.session.grupo

    // Captura os filtros da requisição
    const { search,  ordenar } = req.query;

    // Filtros dinâmicos
    const whereCondition = { ativo: 1 };
    if (search) whereCondition.prioridade = { [Op.like]: `%${search}%` };

    // Ordenação
    let orderCondition = [];
    switch (ordenar) {
        case 'mais_recente':
            orderCondition = [['id', 'DESC']];
            break;
        case 'menos_recente':
            orderCondition = [['id', 'ASC']];
            break;
        case 'a_z':
            orderCondition = [['prioridade', 'ASC']];
            break;
        case 'z_a':
            orderCondition = [['prioridade', 'DESC']];
            break;
        default:
            orderCondition = [['prioridade', 'ASC']];
            break;
    }

    prioridades.findAndCountAll({
        where: whereCondition,
        order: orderCondition,
        limit: limit,
        offset: offset
    }).then(prioridades => {
        usuarios.findOne({where: {id:idUsuario}}).then(usuarioinfo =>{
            grupos_de_usuarios.findOne({where: {id:idGrupo}}).then(grupoinfo =>{
                const totalPages = Math.ceil(prioridades.count / limit)
                res.render('listar_prioridades',{
                    prioridades: prioridades.rows,
                    totalPages: totalPages,
                    currentPage: page,
                    infoUser: usuarioinfo,
                    infoGrupo: grupoinfo,
                    ordenar: ordenar
                })
            })
        })    

    })
    
})

app.get('/inserir_prioridade',verificarAutenticacao,verificarPermInserir,(req,res)=>{
    res.render('inserir_prioridade')
})

app.post('/salvar_prioridade',verificarAutenticacao,verificarPermInserir,async(req,res)=>{
    const prioridade = req.body.prioridade.toLowerCase().trim()

    const prioridadeEncontrada = await prioridades.findOne({
        where: {
            prioridade: prioridade,
            ativo: 1
        }
    })


    if(prioridadeEncontrada){
        return res.status(400).json({
            success: false,
            message: 'Esse tipo de prioridade já esta cadastrado.'
        })
    }

    try {
        await prioridades.create({
            prioridade: prioridade,
            ativo: 1
        })
            log.create({
                usuario: res.locals.usuarioid,
                acao: 'inserido',
                tabela: 'prioridades',
                id_registro: 0
            })  
                return res.json({
                    success: true,
                    message: 'Tipo de prioridade cadastrada!'
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

app.post('/deletar_prioridade',verificarAutenticacao,verificarPermDeletar,(req,res)=>{
    var id = req.body.id

    prioridades.update(
        {ativo: 0},
        {where: {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'prioridades',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_prioridades')
        })
    })
})

app.get('/alterar_prioridade/:id',verificarAutenticacao,verificarPermAlterar,(req,res)=>{
    const id = req.params.id

    prioridades.findOne(
        {where: {id:id}}
    ).then(prioridade =>{
        res.render('alterar_prioridade',{
            prioridade: prioridade
        })
    })
})

app.post('/update_prioridade',verificarAutenticacao, verificarPermAlterar,async(req,res)=>{
    const id = req.body.id
    const prioridade = req.body.prioridade.toLowerCase().trim()

    const prioridadeEncontrada = await prioridades.findOne({
        where: {
            prioridade: prioridade, 
            ativo: 1,
            id: {
                [Op.ne]: id
            }
        }
    })


    if(prioridadeEncontrada){
        return res.status(400).json({
            success: false,
            message: 'Esse tipo de prioridade já esta cadastrado.'
        })
    }

    try {
        await prioridades.update(
            {prioridade: prioridade},
            {where: {id:id}}
        )
            log.create({
                usuario: res.locals.usuarioid,
                acao: 'alterado',
                tabela: 'prioridades',
                id_registro: id
            })  
                return res.json({
                    success: true,
                    message: 'Tipo de prioridade alterado!'
                })
    }
    catch(error){
        return res.json({
            success: false,
            message: 'Erro ao alterar tipo de prioridade.',
            error: error
        })
    }

})



//ROTAS DE TIPOS DE TICKETS
app.get('/listar_tipos_ticket',verificarAutenticacao,(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit
    const idUsuario = req.session.usuarioId
    const idGrupo = req.session.grupo

       // Captura os filtros da requisição
       const { search,  ordenar } = req.query;

       // Filtros dinâmicos
       const whereCondition = { ativo: 1 };
       if (search) whereCondition.tipo_ticket = { [Op.like]: `%${search}%` };
   
       // Ordenação
       let orderCondition = [];
       switch (ordenar) {
           case 'mais_recente':
               orderCondition = [['id', 'DESC']];
               break;
           case 'menos_recente':
               orderCondition = [['id', 'ASC']];
               break;
           case 'a_z':
               orderCondition = [['tipo_ticket', 'ASC']];
               break;
           case 'z_a':
               orderCondition = [['tipo_ticket', 'DESC']];
               break;
           default:
               orderCondition = [['tipo_ticket', 'ASC']];
               break;
       }

    tipos_ticket.findAndCountAll({
        where: whereCondition,
        order: orderCondition,
        limit: limit,
        offset: offset
    }).then(tipos => {
        usuarios.findOne({where: {id:idUsuario}}).then(usuarioinfo =>{
            grupos_de_usuarios.findOne({where: {id:idGrupo}}).then(grupoinfo =>{
                const totalPages = Math.ceil(tipos.count / limit)
                res.render('listar_tipos_ticket',{
                    tipos: tipos.rows,
                    totalPages: totalPages,
                    currentPage: page,
                    infoUser: usuarioinfo,
                    infoGrupo: grupoinfo,
                    ordenar: ordenar
                })
            })
         })    

    })
    
})

app.get('/inserir_tipos_ticket',verificarAutenticacao,verificarPermInserir,(req,res)=>{
    res.render('inserir_tipos_ticket')
})

app.post('/salvar_tipos_ticket',verificarAutenticacao,verificarPermInserir,async(req,res)=>{
    const tipo_ticket = req.body.tipo_ticket.toLowerCase().trim()

    const tipoEncontrado = await tipos_ticket.findOne({
        where: {
            tipo_ticket: tipo_ticket,
            ativo: 1
        }
    })

    if(tipo_ticket.length < 3){
        return res.status(400).json({
            success: false,
            message: 'Digite um tipo de ticket válido.'
        })
    }

    if(tipoEncontrado){
        return res.status(400).json({
            success: false,
            message: 'Esse tipo de ticket já esta cadastrado.'
        })
    }

    try {
        await tipos_ticket.create({
            tipo_ticket: tipo_ticket,
            ativo: 1
        })
            log.create({
                usuario: res.locals.usuarioid,
                acao: 'inserido',
                tabela: 'tipos_tickets',
                id_registro: 0
            })  
                return res.json({
                    success: true,
                    message: 'Tipo de ticket cadastrado!'
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

app.post('/deletar_tipos_ticket',verificarAutenticacao,verificarPermDeletar,(req,res)=>{
    var id = req.body.id

    tipos_ticket.update(
        {ativo: 0},
        {where: {id:id}}
    ).then(()=>{
        log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'tipos_tickets',
            id_registro: id
        }).then(()=>{
            res.redirect('/listar_tipos_ticket')
        })
    })
})

app.get('/alterar_tipos_ticket/:id',verificarAutenticacao,verificarPermAlterar,(req,res)=>{
    const id = req.params.id

    tipos_ticket.findOne(
        {where: {id:id}}
    ).then(tipo =>{
        res.render('alterar_tipos_ticket',{
            tipo: tipo
        })
    })
})

app.post('/update_tipos_ticket',verificarAutenticacao, verificarPermAlterar,async(req,res)=>{
    const id = req.body.id
    const tipo_ticket = req.body.tipo_ticket.toLowerCase().trim()

    const tipoEncontrado = await tipos_ticket.findOne({
        where: {
            tipo_ticket: tipo_ticket, 
            ativo: 1,
            id: {
                [Op.ne]: id
            }
        }
    })

    if(tipo_ticket.length < 3){
        return res.status(400).json({
            success: false,
            message: 'Digite um tipo de ticket válido.'
        })
    }

    if(tipoEncontrado){
        return res.status(400).json({
            success: false,
            message: 'Esse tipo de ticket já esta cadastrado.'
        })
    }

    try {
        await tipos_ticket.update(
            {tipo_ticket: tipo_ticket},
            {where: {id:id}}
        )
            log.create({
                usuario: res.locals.usuarioid,
                acao: 'alterado',
                tabela: 'tipos_tickets',
                id_registro: id
            })  
                return res.json({
                    success: true,
                    message: 'Tipo de ticket alterado!'
                })
    }
    catch(error){
        return res.json({
            success: false,
            message: 'Erro ao alterar tipo de ticket.',
            error: error
        })
    }

})



//ROTAS DE TICKETS
app.get('/listar_tickets', verificarAutenticacao, async (req,res) => {
         
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit
        const idUsuario = req.session.usuarioId
        const idGrupo = req.session.grupo

           // Captura os filtros da requisição
           const { search,  ordenar, TipoTicketFiltro, PrioridadeFiltro, statusFiltro } = req.query;

           // Filtros dinâmicos
           const whereCondition = {}
            // Filtro de busca por entidades
            if (search) { 
                const entidadesEncontradas = await entidades.findAll({
                    where: { cidade: { [Op.like]: `%${search}%` } } // Ajuste conforme o campo correto
                });
                const idsEntidades = entidadesEncontradas.map(entidade => entidade.id); // Coleta os IDs das entidades encontradas
                
                if (idsEntidades.length > 0) {
                    whereCondition.id_entidade = { [Op.in]: idsEntidades }; // Usa Op.in para filtrar pelas entidades encontradas
                } else {
                    whereCondition.id_entidade = null; // Se nenhuma entidade for encontrada
                }
            }

           if (TipoTicketFiltro) whereCondition.id_tipo = TipoTicketFiltro

           if (PrioridadeFiltro) whereCondition.id_prioridade = PrioridadeFiltro

           if (statusFiltro !== undefined) {
                if (statusFiltro === '') {
                    delete whereCondition.status_geral; // Remove o filtro se "Todos" for selecionado
                } else {
                    whereCondition.status_geral = statusFiltro
                }
            }

            // Verificação do parâmetro de idEntidade
            const idEntidade = req.query.idEntidade || 0
            if (idEntidade !== 0) {
                whereCondition.id_entidade = idEntidade; // Aplica o filtro para id_entidade
            }
           

           // Ordenação
           let orderCondition = [];
           switch (ordenar) {
               case 'mais_recente':
                   orderCondition = [['id', 'DESC']];
                   break;
               case 'menos_recente':
                   orderCondition = [['id', 'ASC']];
                   break;
               case 'a_z':
                   orderCondition = [['id_entidade', 'ASC']];
                   break;
               case 'z_a':
                   orderCondition = [['id_entidade', 'DESC']];
                   break;
               default:
                   orderCondition = [['id_entidade', 'ASC']];
                   break;
           }

                   // Busca entidades com paginação e filtro
        const result = await tickets.findAndCountAll({
            where: whereCondition,
            order: orderCondition,
            limit: limit,
            offset: offset
        });

        const totalEntidades = result.count;
        const totalPages = Math.ceil(totalEntidades / limit);

        const [ grupos, usuario, entidade, prioridade, tipo, tipo_entidade] = await Promise.all([
            grupos_de_usuarios.findOne({ where: { id: idGrupo } }),
            usuarios.findOne({where: {id:idUsuario}}),
            entidades.findAll(),
            prioridades.findAll(),
            tipos_ticket.findAll(),
            tipos_entidade.findAll()
        ])

        res.render('listar_tickets',{
            tickets: result.rows,
            currentPage: page,
            totalPages: totalPages,
            infoUser: usuario,
            infoGrupo: grupos,
            filtros: { search, ordenar },
            ordenar: ordenar,
            TipoTicketFiltro: TipoTicketFiltro || '',
            PrioridadeFiltro: PrioridadeFiltro || '',
            statusFiltro: statusFiltro || '',
            entidades: entidade,
            prioridades: prioridade,
            tipos: tipo,
            tipos_entidade: tipo_entidade

        })
})

app.get('/inserir_ticket',verificarAutenticacao, verificarPermInserir, async(req,res) => {

    try {

        const [ tipos, prioridade, entidade, tipo_entidade] = await Promise.all([
            tipos_ticket.findAll({where: {ativo:1}, order: [['tipo_ticket','ASC']]}),
            prioridades.findAll({where: {ativo:1}, order: [['prioridade','ASC']]}),
            entidades.findAll({where: {ativo: 1}, order: [['cidade','ASC'], ['estado','ASC']]}),
            tipos_entidade.findAll()
        ])

        res.render('inserir_ticket',{
            tipos: tipos,
            prioridades: prioridade,
            entidades: entidade,
            tipos_entidade: tipo_entidade
        })
    }
    catch {

    }


})

app.post('/salvar_ticket', verificarAutenticacao, verificarPermInserir, async (req,res)=>{
    const id_usuario = req.session.usuarioId
    
    const { id_entidade, id_tipo, id_prioridade, assunto, descricao } = req.body

    try{

        if(assunto.length < 5){
            res.json({
                success: false,
                message: 'Insira um assunto válido.'
            })
        }


        await tickets.create({
            id_entidade: id_entidade,
            id_tipo: id_tipo,
            id_prioridade: id_prioridade,
            assunto: assunto,
            descricao: descricao,
            dt_previsao: '0001-01-01',
            dt_inicio_ticket: '0001-01-01',
            observacao: '',
            observacao_interna: '',
            responsavel: 0,
            auxiliares: '',
            status_geral: 'aguardando',
            dt_finalizado: '0001-01-01'
        })

        log.create({
            usuario: id_usuario,
            acao: 'inserido',
            tabela: 'tickets',
            id_registro: 0
        })

            return res.json({
                success: true,
                message: 'Ticket Registrado!'
            })

        

    }catch {

    }
})

app.get('/alterar_ticket/:id', verificarAutenticacao, verificarPermAlterar, async (req,res) => {
    try { 
        
        const idTicket = req.params.id

        const ticketEncontrado = await tickets.findOne({where: {id: idTicket}})

        const [ entidade, tipo, prioridade, usuario ] = await Promise.all([
            entidades.findOne({where: {id:ticketEncontrado.id_entidade}}),
            tipos_ticket.findOne({where: {id:ticketEncontrado.id_tipo}}),
            prioridades.findOne({where: {id:ticketEncontrado.id_prioridade}}),
            usuarios.findAll()
            
        ])

        const tipo_entidade = await tipos_entidade.findOne({where: {id:entidade.tipo_entidade}})

        res.render('alterar_ticket',{
            ticket: ticketEncontrado,
            entidade: entidade,
            tipo: tipo,
            prioridade: prioridade,
            usuarios: usuario,
            tipo_entidade: tipo_entidade
        })


    }
    catch {
        res.status(500).json({
            sucess: false,
            message: 'Erro ao alterar entidade'
        })
    }
})

app.post('/update_ticket', verificarAutenticacao, verificarPermAlterar, async(req,res)=> {
    
    const id = req.body.id
    const previsao = req.body.previsao
    const status_geral = req.body.status_geral
    const id_responsavel = req.body.id_responsavel
    const id_auxiliar = req.body.id_auxiliar
    const obs = req.body.obs
    const observacao_interna = req.body.observacao_interna
    let data_inicio = null
    
    try {

        const TicketEncontrado = await tickets.findOne({ where: { id } });

        if (TicketEncontrado) {
            // Verifica se o status é "execucao" e a data de início não foi definida
            if (status_geral === 'execucao' && TicketEncontrado.dt_inicio_ticket === '0001-01-01') {
                data_inicio = new Date(); // Define data de início como a data atual
            } else {
                // Caso contrário, mantém a data de início atual do ticket
                data_inicio = TicketEncontrado.dt_inicio_ticket;
            }
        }

        await tickets.update({
            dt_previsao: previsao || '0001-01-01',
            status_geral: status_geral,
            responsavel: id_responsavel || 0,
            observacao: obs,
            observacao_interna: observacao_interna,
            auxiliares: id_auxiliar,
            dt_inicio_ticket: data_inicio

        },
        {where: {id:id}})

        return res.json({success: true, message: 'Ticket atualizado!'})

    }
    catch{
        return res.json({
            success: false,
            message: 'Erro ao atualizar Ticket'
        })
    }
})

app.post('/ticketPausa', verificarAutenticacao, async (req,res)=> {
    const id = req.body.id
    const pausa = req.body.pausa.trim()
    const retiradapausa = req.body.retiradapausa.trim()


    try {
        
        // Verificar e tratar a inserção de uma nova pausa
        if (pausa) {
            await ticket_pausa.create({
                id_ticket: id,
                motivo_pausa: pausa,
                motivo_retirada_pausa: retiradapausa
            });

            return res.json({
                success: true,
                message: 'Pausa inserida'
            });
        } 

        // Verificar e tratar a atualização de retirada de pausa
        if (retiradapausa) {
            // Procurar o último registro de PausaTicket
            const PausaTicket = await ticket_pausa.findOne({
                where: { id_ticket: id },
                order: [['id', 'DESC']] // Ordenação pela coluna 'id' em ordem decrescente
              });
            if (PausaTicket) {
                await ticket_pausa.update({
                    motivo_retirada_pausa: retiradapausa
                }, {
                    where: { id: PausaTicket.id }
                });

                return res.json({
                    success: true,
                    message: 'Retirada de Pausa inserida'
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'Pausa não encontrada para atualização'
                });
            }
        }

        // Se nenhuma condição for atendida
        return res.status(400).json({
            success: false,
            message: 'Nenhuma ação válida realizada. Verifique os dados enviados.'
        });

    }
    catch{
        res.json({
            success: false,
            message: 'Erro ao atualizar pausa do ticket'
        })
    }


})

app.get('/ticket/:id', async (req,res) => {
    const id = req.params.id
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit
    const idUsuario = req.session.usuarioId
    const idGrupo = req.session.grupo

    
    try {

        const ticketEncontrado = await tickets.findOne({where: {id:id}})
        
        const [ entidade, tipo_ticket, prioridade, pausas, usuario ] = await Promise.all([
            entidades.findOne({where: {id:ticketEncontrado.id_entidade}}),
            tipos_ticket.findOne({where: {id: ticketEncontrado.id_tipo}}),
            prioridades.findOne({where: {id: ticketEncontrado.id_prioridade}}),
            ticket_pausa.findAndCountAll({
                where: {id_ticket: ticketEncontrado.id},
                order: [['id','DESC']],
                limit: limit,
                offset: offset
            }),
            usuarios.findAll()
        ])

        const tipo_entidade = await tipos_entidade.findOne({where: {id: entidade.tipo_entidade}})

        const totalPausas = pausas.count;
        const totalPages = Math.ceil(totalPausas / limit);

        res.render('ticket',{
            currentPage: page,
            totalPages: totalPages,
            entidade: entidade,
            tipo: tipo_ticket,
            prioridade: prioridade,
            ticket: ticketEncontrado,
            tipo_entidade: tipo_entidade,
            pausas: pausas.rows,
            usuarios: usuario,
            idGrupo: idGrupo,
            idUsuario: idUsuario
        })
    }
    catch {
        return res.json({
            success: false,
            message: 'Erro no servidor Interno.'
        })
    }

})

app.get('/tickets', async (req, res) => {
    try {
        // Importando filtros da query string
        const { prioridade, status_geral, ordenar, search, exibir, data_inicial, data_final, tipo_ticket } = req.query;
        
        // Pegando a página da query string, com valor padrão 1 caso não seja fornecido
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(exibir, 10) || 10;  // Convertendo `exibir` para número inteiro
        const offset = (page - 1) * limit; // Calcula o deslocamento para a consulta

        // Pegando dados do usuário e grupo (caso necessário)
        const idUsuario = req.session.usuarioId;
        const idGrupo = req.session.grupo;
        
        // Trazendo as tabelas que são usadas para os filtros
        const [prioridadeG, tipo, entidadeG, tipoTicket] = await Promise.all([
            prioridades.findAll(),
            tipos_entidade.findAll(),
            entidades.findAll(),
            tipos_ticket.findAll()
        ]);

        
        // Filtros dinâmicos - base para consulta
        const whereCondition = { };

            // Filtro de busca por entidades
            if (search) { 
                const entidadesEncontradas = await entidades.findAll({
                    where: { cidade: { [Op.like]: `%${search}%` } } // Ajuste conforme o campo correto
                });
                const idsEntidades = entidadesEncontradas.map(entidade => entidade.id); // Coleta os IDs das entidades encontradas
                
                if (idsEntidades.length > 0) {
                    whereCondition.id_entidade = { [Op.in]: idsEntidades }; // Usa Op.in para filtrar pelas entidades encontradas
                } else {
                    whereCondition.id_entidade = null; // Se nenhuma entidade for encontrada
                }
            }

        // Filtro para "prioridade" - Aceita múltiplos valores (checkbox)
        if (prioridade) {
            const prioridadeSelecionados = Array.isArray(prioridade) ? prioridade : [prioridade];
            whereCondition.id_prioridade = { [Op.in]: prioridadeSelecionados };
        }

        // Filtro para "tipo_ticket" - Aceita múltiplos valores (checkbox)
        if (tipo_ticket) {
            const tipoTicketSelecionados = Array.isArray(tipo_ticket) ? tipo_ticket : [tipo_ticket];
            whereCondition.id_tipo = { [Op.in]: tipoTicketSelecionados };
        }

        // Filtro para "status_geral" - Aceita múltiplos valores (checkbox)
        if (status_geral) {
            const statusSelecionadas = Array.isArray(status_geral) ? status_geral : [status_geral];
            whereCondition.status_geral = { [Op.in]: statusSelecionadas };
        }
 
        if (data_inicial) {
            if (data_final) {
                whereCondition.createdAt = {
                    [Op.between]: [data_inicial, data_final]
                };
            } else {
                whereCondition.createdAt = {
                    [Op.gte]: data_inicial
                };
            }
        } else if (data_final) {
            whereCondition.createdAt = {
                [Op.lte]: data_final
            };
        }

        // Definindo a ordenação
        let orderCondition = [];
        switch (ordenar) {
            case 'mais_recente':
                orderCondition = [['id', 'DESC']];
                break;
            case 'menos_recente':
                orderCondition = [['id', 'ASC']];
                break;
            case 'a_z':
                orderCondition = [['id', 'ASC'], ['id', 'ASC']];
                break;
            case 'z_a':
                orderCondition = [['id', 'DESC'], ['id', 'DESC']];
                break;
            default:
                orderCondition = [['id', 'DESC']];
                break;
        }

        // Consultando as entidades com os filtros e a paginação
        const result = await tickets.findAndCountAll({
            where: whereCondition,
            order: orderCondition,
            limit: limit,
            offset: offset
        });

        // Calculando o total de páginas para a navegação
        const totalTickets = result.count;
        const totalPages = Math.ceil(totalTickets / limit);

        // Renderizando a página com os dados encontrados
        res.render('tickets', {
            currentPage: page,
            totalPages: totalPages,
            tickets: result.rows,
            entidades: entidadeG,
            tipos: tipo,
            prioridades: prioridadeG,
            tipos_ticket: tipoTicket,
            o: ordenar,
            e: exibir,
            dt_i: data_inicial,
            dt_f: data_final,
            p: prioridade,
            st: status_geral,
            tt: tipo_ticket
        });
    } catch (err) {
        // Caso ocorra algum erro, mostrando mensagem e log
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Erro ao trazer entidades',
            error: err.message
        });
    }
});


//CRIANDO O SERVIDOR
app.listen(8080, ()=>{
    console.log('Aplicativo Online')
})


