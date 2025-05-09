const express = require('express');
const Router = express.Router();

//Importando Middlewares
const verificarAutenticacao = require('../../../middlewares/VerificarAutenticacao');
const verificarPermInserir = require('../../../middlewares/VerificarPermInserir');
const verificarPermAlterar = require('../../../middlewares/VerificarPermAlterar');
const verificarPermDeletar = require('../../../middlewares/VerificarPermDeletar');

//Importando conexoes com tabelas
const tipos_ticket = require('../../../database/tipos_ticket');
const usuarios = require('../../../database/usuarios');
const grupos_de_usuarios = require('../../../database/grupos_de_usuarios');
const log = require('../../../database/log');

const { Op } = require('sequelize');  // Importa o operador Op do Sequelize

//ROTAS DE TIPOS DE TICKETS
Router.get('/listar_tipos_ticket', verificarAutenticacao, async (req, res) => {

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit
        const idUsuario = req.session.usuarioId
        const idGrupo = req.session.grupo

        // Captura os filtros da requisição
        const { search, ordenar } = req.query;

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

        const [tipos, usuarioinfo, grupoinfo] = await Promise.all([
            tipos_ticket.findAndCountAll({ where: whereCondition, order: orderCondition, limit: limit, offset: offset }),
            usuarios.findOne({ where: { id: idUsuario } }),
            grupos_de_usuarios.findOne({ where: { id: idGrupo } })
        ])

        const totalPages = Math.ceil(tipos.count / limit)

        res.status(200).render('private/TiposDeTicket/listar_tipos_ticket', {
            tipos: tipos.rows,
            totalPages: totalPages,
            currentPage: page,
            infoUser: usuarioinfo,
            infoGrupo: grupoinfo,
            ordenar: ordenar
        })
    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }

})

Router.get('/inserir_tipos_ticket', verificarAutenticacao, verificarPermInserir, async (req, res) => {
    try {
        res.status(200).render('private/TiposDeTicket/inserir_tipos_ticket')
    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor',
            error: err.message
        })
    }
})

Router.post('/salvar_tipos_ticket', verificarAutenticacao, verificarPermInserir, async (req, res) => {
    try {

        const tipo_ticket = req.body.tipo_ticket.toLowerCase().trim()

        const tipoEncontrado = await tipos_ticket.findOne({
            where: {
                tipo_ticket: tipo_ticket,
                ativo: 1
            }
        })

        if (tipo_ticket.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite um tipo de ticket válido.'
            })
        }

        if (tipoEncontrado) {
            return res.status(400).json({
                success: false,
                message: 'Esse tipo de ticket já esta cadastrado.'
            })
        }

        await tipos_ticket.create({
            tipo_ticket: tipo_ticket,
            ativo: 1
        })

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'tipos_tickets',
            id_registro: 0
        })

        res.status(201).json({
            success: true,
            message: 'Tipo de ticket cadastrado!'
        })

    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }
})

Router.post('/deletar_tipos_ticket', verificarAutenticacao, verificarPermDeletar, async (req, res) => {
    try {
        var id = req.body.id

        await tipos_ticket.update(
            { ativo: 0 },
            { where: { id: id } }
        )

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'tipos_tickets',
            id_registro: id
        })

        res.status(200).redirect('/admin/listar_tipos_ticket')

    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }
})

Router.get('/alterar_tipos_ticket/:id', verificarAutenticacao, verificarPermAlterar, async (req, res) => {
    try {
        const id = req.params.id

        const [tipo] = await Promise.all([
            tipos_ticket.findOne({ where: { id: id } })
        ])

        res.status(200).render('private/TiposDeTicket/alterar_tipos_ticket', {
            tipo: tipo
        })
    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }
})

Router.post('/update_tipos_ticket', verificarAutenticacao, verificarPermAlterar, async (req, res) => {
    try {
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
    
        if (tipo_ticket.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite um tipo de ticket válido.'
            })
        }
    
        if (tipoEncontrado) {
            return res.status(400).json({
                success: false,
                message: 'Esse tipo de ticket já esta cadastrado.'
            })
        }

        await tipos_ticket.update(
            { tipo_ticket: tipo_ticket },
            { where: { id: id } }
        )
        
        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'tipos_tickets',
            id_registro: id
        })

        res.status(200).json({
            success: true,
            message: 'Tipo de ticket alterado!'
        })
    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }

})

module.exports = Router;