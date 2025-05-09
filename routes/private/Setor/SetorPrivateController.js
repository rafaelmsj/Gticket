const express = require('express');
const Router = express.Router();

//Importando Middlewares
const verificarAutenticacao = require('../../../middlewares/VerificarAutenticacao');
const verificarPermInserir = require('../../../middlewares/VerificarPermInserir');
const verificarPermAlterar = require('../../../middlewares/VerificarPermAlterar');
const verificarPermDeletar = require('../../../middlewares/VerificarPermDeletar');

//Importando conexoes com tabelas
const log = require('../../../database/log');
const setores = require('../../../database/setores');
const grupos_de_usuarios = require('../../../database/grupos_de_usuarios');
const usuarios = require('../../../database/usuarios');

const { Op } = require('sequelize');  // Importa o operador Op do Sequelize


//SETOR DA EMPRESA
Router.get('/listar_setor', verificarAutenticacao, async (req, res) => {
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

        const [SetoresGeral, usuarioinfo, grupoinfo] = await Promise.all([
            setores.findAndCountAll({ where: whereCondition, order: orderCondition, limit: limit, offset: offset }),
            usuarios.findOne({ where: { id: idUsuario } }),
            grupos_de_usuarios.findOne({ where: { id: idGrupo } })
        ])

        const totalPages = Math.ceil(SetoresGeral.count / limit); // Calcular o número total de páginas

        res.status(200).render('private/Setor/listar_setor', {
            setores: SetoresGeral.rows,
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

Router.get('/inserir_setor', verificarAutenticacao, verificarPermInserir, async (req, res) => {
    try {
        res.status(200).render('private/Setor/inserir_setor')
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

Router.post('/salvarsetor', verificarAutenticacao, verificarPermInserir, async (req, res) => {
    try {
        var setor = req.body.setor.toLowerCase().trim()
        var sigla = req.body.sigla.toLowerCase().trim()
        var ativo = 1

        const setorEncontrado = await setores.findOne({
            where: {
                setor: setor,
                ativo: 1
            }
        })

        if (setor.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite um setor válido.'
            })
        }

        if (setorEncontrado) {
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

        if (sigla.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite uma sigla válida.'
            })
        }

        if (siglaEncontrado) {
            return res.status(400).json({
                success: false,
                message: 'Essa sigla já está em uso.'
            })
        }

        await setores.create({
            setor: setor,
            sigla: sigla,
            ativo: ativo
        })

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'setores',
            id_registro: 0
        })

        return res.status(201).json({
            success: true,
            message: 'Setor cadastrado!'
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

Router.post('/deletar_setor', verificarAutenticacao, verificarPermDeletar, async (req, res) => {
    try {
        var id = req.body.id

        await setores.update(
            { ativo: 0 },
            { where: { id: id } }
        )

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'setores',
            id_registro: id
        })

        res.status(200).redirect('/admin/listar_setor')
    }
    catch (err) {
        console.erro(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }
})

Router.get('/alterar_setor/:id', verificarAutenticacao, verificarPermAlterar, async (req, res) => {
    try {
        const id = req.params.id

        const [SetoresGeral] = await Promise.all([
            setores.findOne({ where: { id: id } })
        ])

        res.status(200).render('private/Setor/alterar_setor', {
            setor: SetoresGeral
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

Router.post('/update_setor', verificarAutenticacao, verificarPermAlterar, async (req, res) => {
    try {
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
    
        if (setor.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite um setor válido.'
            })
        }
    
        if (setorEncontrado) {
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
                    [Op.ne]: id  
                }
            }
        })
    
        if (sigla.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite uma sigla válida.'
            })
        }
    
        if (siglaEncontrado) {
            return res.status(400).json({
                success: false,
                message: 'Essa sigla já está em uso.'
            })
        }
    
        await setores.update(
            { setor: setor, sigla: sigla },
            { where: { id: id } }
        )

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'setores',
            id_registro: id
        })

        res.status(200).json({
            success: true,
            message: 'Setor alterado!'
        })
    }
    catch (err) {
        console.err(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }
})


module.exports = Router;