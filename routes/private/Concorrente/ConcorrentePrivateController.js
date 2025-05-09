const express = require('express');
const Router = express.Router();

//Importando Middlewares
const verificarAutenticacao = require('../../../middlewares/VerificarAutenticacao');
const verificarPermInserir = require('../../../middlewares/VerificarPermInserir');
const verificarPermAlterar = require('../../../middlewares/VerificarPermAlterar');
const verificarPermDeletar = require('../../../middlewares/VerificarPermDeletar');

//Importando conexoes com tabelas
const log = require('../../../database/log');
const concorrentes = require('../../../database/concorrentes');
const grupos_de_usuarios = require('../../../database/grupos_de_usuarios');
const usuarios = require('../../../database/usuarios');

const { Op } = require('sequelize');  // Importa o operador Op do Sequelize


//ROTAS CONCORRENTES
Router.get('/listar_concorrentes', verificarAutenticacao, async (req, res) => {
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

        const [ConcorrentesGeral, usuarioinfo, grupoinfo] = await Promise.all([
            concorrentes.findAndCountAll({ where: whereCondition, order: orderCondition, limit: limit, offset: offset }),
            usuarios.findOne({ where: { id: idUsuario } }),
            grupos_de_usuarios.findOne({ where: { id: idGrupo } })
        ])

        const totalPages = Math.ceil(ConcorrentesGeral.count / limit);

        res.status(200).render('private/Concorrente/listar_concorrentes', {
            concorrentes: ConcorrentesGeral.rows,
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
            message: 'Erro interno no servidor',
            error: err.message
        })
    }
})

Router.get('/inserir_concorrentes', verificarAutenticacao, verificarPermInserir, async (req, res) => {
    try {
        res.status(200).render('private/Concorrente/inserir_concorrentes')
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

Router.post('/salvar_concorrentes', verificarAutenticacao, verificarPermInserir, async (req, res) => {
    try {
        var nome = req.body.concorrente.toLowerCase().trim()

        const concorrenteEncontrado = await concorrentes.findOne({
            where: {
                nome: nome,
                ativo: 1
            }
        })

        if (nome.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite um concorrente válido.'
            })
        }

        if (concorrenteEncontrado) {
            return res.status(400).json({
                success: false,
                message: 'Concorrente já cadastrado.'
            })
        }

        await concorrentes.create({
            nome: nome.toLowerCase(),
            ativo: 1
        })

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'concorrentes',
            id_registro: 0
        })

        return res.status(201).json({
            success: true,
            message: 'Concorrente cadastrado!'
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

Router.post('/deletar_concorrente', verificarAutenticacao, verificarPermDeletar, async (req, res) => {
    try {
        var id = req.body.id;

        await concorrentes.update(
            { ativo: 0 },
            { where: { id: id } }
        )

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'concorrentes',
            id_registro: id
        })

        res.status(200).redirect('/admin/listar_concorrentes')

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

Router.get('/alterar_concorrentes/:id', verificarAutenticacao, verificarPermAlterar, async (req, res) => {
    try {
        const id = req.params.id

        const [ConcorrentesGeral] = await Promise.all([
            concorrentes.findOne({ where: { id: id } })
        ])

        res.status(200).render('private/Concorrente/alterar_concorrentes', {
            concorrente: ConcorrentesGeral
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

Router.post('/update_concorrentes', verificarAutenticacao, verificarPermAlterar, async (req, res) => {
    try {
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

        if (nome.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite um concorrente válido.'
            })
        }

        if (concorrenteEncontrado) {
            return res.status(400).json({
                success: false,
                message: 'Concorrente já cadastrado.'
            })
        }

        await concorrentes.update(
            { nome: nome },
            { where: { id: id } }
        )
        
        await log.create({
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
    catch (err) {
        console.error(err.message)
        return res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        });
    }
})

module.exports = Router;