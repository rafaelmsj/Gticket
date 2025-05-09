const express = require('express');
const Router = express.Router();

//Importando Middlewares
const verificarAutenticacao = require('../../../middlewares/VerificarAutenticacao');
const verificarPermInserir = require('../../../middlewares/VerificarPermInserir');
const verificarPermAlterar = require('../../../middlewares/VerificarPermAlterar');
const verificarPermDeletar = require('../../../middlewares/VerificarPermDeletar');

//Importando conexoes com tabelas
const usuarios = require('../../../database/usuarios');
const grupos_de_usuarios = require('../../../database/grupos_de_usuarios');
const log = require('../../../database/log');

const { Op } = require('sequelize');  // Importa o operador Op do Sequelize


//GRUPOS DE USUARIOS

Router.get('/listar_grupos_de_usuarios', verificarAutenticacao, async (req, res) => {

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;
        const idUsuario = req.session.usuarioId
        const idGrupo = req.session.grupo

        if (req.session.perm_grupos !== 1) {
            return res.status(401).json({
                success: false,
                message: 'Você não tem permissão para acessar esta página.'
            })
        }

        // Captura os filtros da requisição
        const { search, ordenar } = req.query;

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

        const [grupos_user, usuarioinfo, grupoinfo] = await Promise.all([
            grupos_de_usuarios.findAndCountAll({ where: whereCondition, order: orderCondition, offset, limit }),
            usuarios.findOne({ where: { id: idUsuario } }),
            grupos_de_usuarios.findOne({ where: { id: idGrupo } })
        ])

        const totalPages = Math.ceil(grupos_user.count / limit)

        res.status(200).render('private/gruposDeUsuario/listar_grupos_de_usuarios', {
            grupos: grupos_user.rows,
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

Router.get('/inserir_grupos_de_usuarios', verificarAutenticacao, verificarPermInserir, async (req, res) => {

    try {
        res.status(200).render('private/gruposDeUsuario/inserir_grupos_de_usuarios')
    }
    catch (err) {
        console.error(err.message)
        res.status(500).json()
    }

})

Router.post('/salvar_grupos_de_usuarios', verificarAutenticacao, verificarPermInserir, async (req, res) => {

    try {
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

        if (grupo.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite um grupo de usúarios válido.'
            })
        }

        if (grupoEncontrado) {
            return res.status(400).json({
                success: false,
                message: 'Esse grupo de usúarios já esta cadastrado.'
            })
        }

        await grupos_de_usuarios.create({
            grupo: grupo,
            inserir: inserir,
            alterar: alterar,
            deletar: deletar,
            ativo: 1
        })

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'grupos_de_usuarios',
            id_registro: 0
        })

        res.status(201).json({
            success: true,
            message: 'Grupo de usúarios cadastrado!'
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

Router.post('/deletar_grupo', verificarAutenticacao, verificarPermDeletar, async (req, res) => {

    try {
        var id = req.body.id

        await grupos_de_usuarios.update(
            { ativo: 0 },
            { where: { id: id } }
        )

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'grupos_de_usuarios',
            id_registro: id
        })

        res.status(200).redirect('/admin/listar_grupos_de_usuarios')
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

Router.get('/alterar_grupo_de_usuario/:id', verificarAutenticacao, verificarPermAlterar, async (req, res) => {

    try {

        const id = req.params.id

        const [grupos] = await Promise.all([
            grupos_de_usuarios.findOne({ where: { id: id } })
        ])

        res.status(200).render('private/gruposDeUsuario/alterar_grupos_de_usuarios', {
            grupo: grupos
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

Router.post('/update_grupos_de_usuarios', verificarAutenticacao, verificarPermAlterar, async (req, res) => {

    try {
        const id = req.body.id
        const grupo = req.body.gruposusuario.toLowerCase().trim()
        const alterar = req.body.alterar
        const inserir = req.body.inserir
        const deletar = req.body.deletar

        const grupoEncontrado = await grupos_de_usuarios.findOne({
            where: {
                grupo: grupo,
                ativo: 1,
                id: {
                    [Op.ne]: id
                }
            }
        })

        if (grupo.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite um grupo de usúarios válido.'
            })
        }

        if (grupoEncontrado) {
            if (grupoEncontrado.id != id) {
                return res.status(400).json({
                    success: false,
                    message: 'Esse grupo de usúarios já está cadastrado.'
                });
            }
        }

        await grupos_de_usuarios.update(
            { grupo: grupo, inserir: inserir, alterar: alterar, deletar: deletar },
            { where: { id: id } }
        )

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'grupos_de_usuarios',
            id_registro: id
        })

        return res.status(200).json({
            success: true,
            message: 'Grupo de usúarios alterado!'
        })
    }
    catch (err) {
        console.error('--- ERRO DETALHADO ---');
        console.error('Mensagem:', err.message);
        console.error('Stack Trace:', err.stack);
        if (err.code) console.error('Código do Erro:', err.code);
        if (err.name) console.error('Nome do Erro:', err.name);
        console.error('----------------------');
        res.json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }
})

module.exports = Router;