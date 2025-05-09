//Importando o express e o Router
const express = require('express');
const Router = express.Router()

//Importando Middlewares
const verificarAutenticacao = require('../../../middlewares/VerificarAutenticacao');
const verificarPermInserir = require('../../../middlewares/VerificarPermInserir');
const verificarPermAlterar = require('../../../middlewares/VerificarPermAlterar');
const verificarPermDeletar = require('../../../middlewares/VerificarPermDeletar');

//Importando conexoes com tabelas
const tickets = require('../../../database/tickets');
const tipos_entidade = require('../../../database/tipos_entidade');
const versao_sistema = require('../../../database/versao_sistema');
const modulos = require('../../../database/modulos');
const entidades = require('../../../database/entidades');
const concorrentes = require('../../../database/concorrentes');
const usuarios = require('../../../database/usuarios');
const grupos_de_usuarios = require('../../../database/grupos_de_usuarios');
const log = require('../../../database/log');

const { Op } = require('sequelize');  // Importa o operador Op do Sequelize


// ROTAS DAS ENTIDADES
Router.get('/listar_entidades', verificarAutenticacao, async (req, res) => {
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
            tickets.findAll({ where: { status_geral: { [Op.notLike]: `finalizado` } } })
        ]);

        res.status(200).render('private/entidades/listar_entidades', {
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
        res.status(500).json({
            success: false,
            message: 'Erro no servidor interno.',
            error: err.message
        })
    }
});

Router.get('/inserir_entidades', verificarAutenticacao, verificarPermInserir, async (req, res) => {
    try {

        const [tipos, modules, versoes_sis, concorrente] = await Promise.all([
            tipos_entidade.findAll({ order: [['tipo_entidade', 'ASC']] }),
            modulos.findAll({ order: [['modulo', 'ASC']] }),
            versao_sistema.findAll({ order: [['versao', 'ASC']] }),
            concorrentes.findAll({ order: [['nome', 'ASC']] })
        ])

        res.status(200).render('private/entidades/inserir_entidades', {
            tipos_entidade: tipos,
            modulos: modules,
            versao_sistema: versoes_sis,
            concorrentes: concorrente
        })

    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro no servidor interno',
            error: err.message
        })
    }

})

Router.post('/salvar_entidades', verificarAutenticacao, verificarPermInserir, async (req, res) => {

    try {
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

        if (entidadeEncontrada) {
            return res.status(400).json({
                success: false,
                message: 'Essa entidade já está cadastrada.'
            })
        }

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

        res.status(201).json({
            success: true,
            message: 'Entidade cadastrada!'
        })
    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro no servidor interno.',
            error: err.message
        })
    }
})

Router.post('/deletar_entidade', verificarAutenticacao, verificarPermDeletar, async (req, res) => {
    try {
        var id = req.body.id

        entidades.update(
            { ativo: 0 },
            { where: { id: id } }
        )

        log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'entidades',
            id_registro: id
        })

        res.status(201).redirect('/admin/listar_entidades')


    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro no servidor',
            error: err.message
        })
    }

})

Router.get('/alterar_entidades/:id', verificarAutenticacao, verificarPermAlterar, async (req, res) => {
    try {
        const id = req.params.id

        const [entidade, tipos_entidadeGeral, versao_sistemaGeral, modulosGeral, concorrentesGeral] = await Promise.all([
            entidades.findOne({ where: { id: id } }),
            tipos_entidade.findAll(),
            versao_sistema.findAll({ order: [['versao', 'ASC']] }),
            modulos.findAll({ order: [['modulo', 'ASC']] }),
            concorrentes.findAll({ order: [['nome', 'ASC']] })
        ])

        res.status(200).render('private/entidades/alterar_entidades', {
            entidade: entidade,
            tipos: tipos_entidadeGeral,
            versao_sistema: versao_sistemaGeral,
            modulos: modulosGeral,
            concorrentes: concorrentesGeral
        })
    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro no servidor interno.',
            error: err.message
        })
    }

})

Router.post('/update_entidade', verificarAutenticacao, verificarPermAlterar, async (req, res) => {

    try {

        const id = req.body.id
        const modulos_contratados = req.body.modulos_contratados
        const versao = req.body.versao_sistema
        const website_concorrente = req.body.website_concorrente
        const sistema_concorrente = req.body.sistema_concorrente
        const instalado = req.body.instalado
        const observacao = req.body.observacao.trim()

        entidades.update(
            {
                modulos_contratados: Array.isArray(modulos_contratados) ? modulos_contratados.join(', ') : modulos_contratados,
                versao_sistema: versao,
                website_concorrente: website_concorrente,
                sistema_concorrente: sistema_concorrente,
                instalado: instalado,
                observacao: observacao
            },
            { where: { id: id } }
        )

        log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'entidades',
            id_registro: id
        })

        res.status(200).json({
            success: true,
            message: 'Entidade alterada!'
        })
    }
    catch (err) {
        console.error(err.message)
        res.json({
            success: false,
            message: 'Erro no servidor interno.',
            error: err.message
        })
    }
})

module.exports = Router;