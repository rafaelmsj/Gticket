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
const tipos_entidade = require('../../../database/tipos_entidade');

const { Op } = require('sequelize');  // Importa o operador Op do Sequelize


//ROTAS TIPOS DE ENTIDADE
Router.get('/listar_tipos_entidade', verificarAutenticacao, async (req, res) => {

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

        const [tipos, usuarioinfo, grupoinfo] = await Promise.all([
            tipos_entidade.findAndCountAll({ where: whereCondition, order: orderCondition, limit: limit, offset: offset }),
            usuarios.findOne({ where: { id: idUsuario } }),
            grupos_de_usuarios.findOne({ where: { id: idGrupo } })
        ])

        const totalPages = Math.ceil(tipos.count / limit)

        res.status(200).render('private/TiposDeEntidade/listar_tipos_entidade', {
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

Router.get('/inserir_tipos_entidade', verificarAutenticacao, verificarPermInserir, async (req, res) => {

    try {
        res.status(200).render('private/TiposDeEntidade/inserir_tipos_entidade')
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

Router.post('/salvar_tipos_entidade', verificarAutenticacao, verificarPermInserir, async (req, res) => {

    try {
        const tipo_entidade = req.body.tipo_entidade.toLowerCase().trim()

        const tipoEncontrado = await tipos_entidade.findOne({
            where: {
                tipo_entidade: tipo_entidade,
                ativo: 1
            }
        })

        if (tipo_entidade.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite um tipo de entidade válido.'
            })
        }

        if (tipoEncontrado) {
            return res.status(400).json({
                success: false,
                message: 'Esse tipo de entidade já esta cadastrado.'
            })
        }

        await tipos_entidade.create({
            tipo_entidade: tipo_entidade,
            ativo: 1
        })

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'tipos_entidades',
            id_registro: 0
        })

        return res.status(200).json({
            success: true,
            message: 'Tipo de entidade cadastrado!'
        })

    }
    catch (err) {
        console.error(err.message)
        return res.status(500).json({
            success: false,
            message: 'Erro ao cadastrar tipo.',
            error: err.message
        })
    }
})

Router.post('/deletar_tipo_entidade', verificarAutenticacao, verificarPermDeletar, async (req, res) => {

    try {
        var id = req.body.id

        await tipos_entidade.update(
            { ativo: 0 },
            { where: { id: id } }
        )

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'tipos_entidades',
            id_registro: id
        })

        res.status(200).redirect('/admin/listar_tipos_entidade')

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

Router.get('/alterar_tipos_de_entidade/:id', verificarAutenticacao, verificarPermAlterar, async (req, res) => {

    try {
        const id = req.params.id

        const [tipo] = await Promise.all([
            tipos_entidade.findOne({ where: { id: id } })
        ])

        res.status(200).render('private/TiposDeEntidade/alterar_tipos_entidade', {
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

Router.post('/update_tipo_entidade', verificarAutenticacao, verificarPermAlterar, async (req, res) => {

    try {
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
    
        if (tipo_entidade.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite um tipo de entidade válido.'
            })
        }
    
        if (tipoEncontrado) {
            return res.status(400).json({
                success: false,
                message: 'Esse tipo de entidade já esta cadastrado.'
            })
        }

        await tipos_entidade.update(
            { tipo_entidade: tipo_entidade },
            { where: { id: id } }
        )
        
        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'tipos_entidades',
            id_registro: id
        })

        return res.status(200).json({
            success: true,
            message: 'Tipo de entidade alterado!'
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




module.exports = Router;