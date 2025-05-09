const express = require('express');
const Router = express.Router();

//Importando Middlewares
const verificarAutenticacao = require('../../../middlewares/VerificarAutenticacao');
const verificarPermInserir = require('../../../middlewares/VerificarPermInserir');
const verificarPermAlterar = require('../../../middlewares/VerificarPermAlterar');
const verificarPermDeletar = require('../../../middlewares/VerificarPermDeletar');

//Importando conexoes com tabelas
const prioridades = require('../../../database/prioridades');
const usuarios = require('../../../database/usuarios');
const grupos_de_usuarios = require('../../../database/grupos_de_usuarios');
const log = require('../../../database/log');

const { Op } = require('sequelize');  // Importa o operador Op do Sequelize

//ROTAS DE PRIORIDADE
Router.get('/listar_prioridades', verificarAutenticacao, async (req, res) => {
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

        const [PrioridadesGeral, usuarioinfo, grupoinfo] = await Promise.all([
            prioridades.findAndCountAll({ where: whereCondition, order: orderCondition, limit: limit, offset: offset }),
            usuarios.findOne({ where: { id: idUsuario } }),
            grupos_de_usuarios.findOne({ where: { id: idGrupo } })
        ])

        const totalPages = Math.ceil(PrioridadesGeral.count / limit)

        res.status(200).render('private/Prioridade/listar_prioridades', {
            prioridades: PrioridadesGeral.rows,
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

Router.get('/inserir_prioridade', verificarAutenticacao, verificarPermInserir, async (req, res) => {
    try {

        res.status(200).render('private/Prioridade/inserir_prioridade')
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

Router.post('/salvar_prioridade', verificarAutenticacao, verificarPermInserir, async (req, res) => {

    try {
        const prioridade = req.body.prioridade.toLowerCase().trim()

        const prioridadeEncontrada = await prioridades.findOne({
            where: {
                prioridade: prioridade,
                ativo: 1
            }
        })


        if (prioridadeEncontrada) {
            return res.status(400).json({
                success: false,
                message: 'Esse tipo de prioridade já esta cadastrado.'
            })
        }

        await prioridades.create({
            prioridade: prioridade,
            ativo: 1
        })

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'prioridades',
            id_registro: 0
        })

        return res.status(201).json({
            success: true,
            message: 'Tipo de prioridade cadastrada!'
        })

    }
    catch (err) {
        console.error(err.message)
        return res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }
})

Router.post('/deletar_prioridade', verificarAutenticacao, verificarPermDeletar, async (req, res) => {
    try {
        var id = req.body.id

        await prioridades.update(
            { ativo: 0 },
            { where: { id: id } }
        )

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'prioridades',
            id_registro: id
        })

        res.status(200).redirect('/admin/listar_prioridades')
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

Router.get('/alterar_prioridade/:id', verificarAutenticacao, verificarPermAlterar, async (req, res) => {
    try {
        const id = req.params.id

        const [prioridade] = await Promise.all([
            prioridades.findOne({ where: { id: id } })
        ])

        res.status(200).render('private/Prioridade/alterar_prioridade', {
            prioridade: prioridade
        })
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

Router.post('/update_prioridade', verificarAutenticacao, verificarPermAlterar, async (req, res) => {
    try {
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
    
        if (prioridadeEncontrada) {
            return res.status(400).json({
                success: false,
                message: 'Esse tipo de prioridade já esta cadastrado.'
            })
        }
    
        await prioridades.update(
            { prioridade: prioridade },
            { where: { id: id } }
        )
        
        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'prioridades',
            id_registro: id
        })

        return res.status(200).json({
            success: true,
            message: 'Tipo de prioridade alterado!'
        })
    }
    catch (err) {
        return res.json({
            success: false,
            message: 'Erro ao alterar tipo de prioridade.',
            error: err.message
        })
    }

})

module.exports = Router;