const express = require('express');
const Router = express.Router();

//Importando Middlewares
const verificarAutenticacao = require('../../../middlewares/VerificarAutenticacao');
const verificarPermInserir = require('../../../middlewares/VerificarPermInserir');
const verificarPermAlterar = require('../../../middlewares/VerificarPermAlterar');
const verificarPermDeletar = require('../../../middlewares/VerificarPermDeletar');

//Importando conexoes com tabelas
const versao_sistema = require('../../../database/versao_sistema');
const usuarios = require('../../../database/usuarios');
const grupos_de_usuarios = require('../../../database/grupos_de_usuarios');
const log = require('../../../database/log');

const { Op } = require('sequelize');  // Importa o operador Op do Sequelize

//VERSAO DO SISTEMA
Router.get('/listar_versaosis', verificarAutenticacao, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;
        const idUsuario = req.session.usuarioId
        const idGrupo = req.session.grupo

        // Captura os filtros da requisição
        const { search, ordenar } = req.query;

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

        const [versoes, usuarioinfo, grupoinfo] = await Promise.all([
            versao_sistema.findAndCountAll({ where: whereCondition, order: orderCondition, limit: limit, offset: offset }),
            usuarios.findOne({ where: { id: idUsuario } }),
            grupos_de_usuarios.findOne({ where: { id: idGrupo } })
        ])

        const totalPages = Math.ceil(versoes.count / limit); // Calcular o número total de páginas

        res.status(200).render('private/VersaoSistema/listar_versaosis', {
            versoes: versoes.rows,
            currentPage: page,
            totalPages: totalPages,
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

Router.get('/inserir_versao', verificarAutenticacao, verificarPermInserir, async (req, res) => {
    try {
        res.status(200).render('private/VersaoSistema/inserir_versaosis')
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

Router.post('/salvarversao', verificarAutenticacao, verificarPermInserir, async (req, res) => {

    try {
        var versao = req.body.versaosis.toLowerCase().trim()

        const versaoEncontrada = await versao_sistema.findOne({
            where: {
                versao: versao,
                ativo: 1
            }
        })

        if (versao.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite uma versão válida.'
            })
        }

        if (versaoEncontrada) {
            return res.status(400).json({
                success: false,
                message: 'Versão já cadastrada.'
            })
        }

        await versao_sistema.create({
            versao: versao,
            ativo: 1
        })

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'versao_sistemas',
            id_registro: 0
        })

        return res.status(201).json({
            success: true,
            message: 'Versão cadastrada!'
        })

    } catch (err) {
        console.error(err.message)
        return res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }

})

Router.post('/deletar_versao', verificarAutenticacao, verificarPermDeletar, async (req, res) => {
    try {
        var id = req.body.id

        await versao_sistema.update(
            { ativo: 0 },  
            { where: { id: id } } 
        )

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'versao_sistemas',
            id_registro: id
        })

        res.status(200).redirect('/admin/listar_versaosis')
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

Router.get('/alterar_versao/:id', verificarAutenticacao, verificarPermAlterar, async (req, res) => {
    try {
        const id = req.params.id

        const [ versao] = await Promise.all([
            versao_sistema.findOne({ where: { id: id } })
        ])

        res.status(200).render('private/VersaoSistema/alterar_versaosis', {
            versao: versao
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

Router.post('/update_versao', verificarAutenticacao, verificarPermAlterar, async (req, res) => {
    try {
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
    
        if (versao.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite uma versão válida.'
            })
        }
    
        if (versaoEncontrada) {
            return res.status(400).json({
                success: false,
                message: 'Versão já cadastrada.'
            })
        }

        await versao_sistema.update(
            { versao: versao },
            { where: { id: id } }
        )

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'versao_sistemas',
            id_registro: id
        })

        return res.status(200).json({
            success: true,
            message: 'Versão alterada!'
        })
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Erro interno no servidor',
            error: err.message
        })
    }

})

module.exports = Router;