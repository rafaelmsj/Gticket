const express = require('express');
const Router = express.Router();

//Importando Middlewares
const verificarAutenticacao = require('../../../middlewares/VerificarAutenticacao');
const verificarPermInserir = require('../../../middlewares/VerificarPermInserir');
const verificarPermAlterar = require('../../../middlewares/VerificarPermAlterar');
const verificarPermDeletar = require('../../../middlewares/VerificarPermDeletar');

//Importando conexoes com tabelas
const log = require('../../../database/log');
const modulos = require('../../../database/modulos');
const grupos_de_usuarios = require('../../../database/grupos_de_usuarios');
const usuarios = require('../../../database/usuarios');

const { Op } = require('sequelize');  // Importa o operador Op do Sequelize


//ROTAS PARA MODULOS DO SISTEMA
Router.get('/listar_modulos', verificarAutenticacao, async (req, res) => {
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

        const [ModulosGeral, usuarioinfo, grupoinfo] = await Promise.all([
            modulos.findAndCountAll({ where: whereCondition, order: orderCondition, limit: limit, offset: offset }),
            usuarios.findOne({ where: { id: idUsuario } }),
            grupos_de_usuarios.findOne({ where: { id: idGrupo } })
        ])

        const totalPages = Math.ceil(ModulosGeral.count / limit)

        res.status(200).render('private/Modulo/listar_modulos', {
            modulos: ModulosGeral.rows,
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

Router.get('/inserir_modulos', verificarAutenticacao, verificarPermInserir, async (req, res) => {
    try {
        res.status(200).render('private/Modulo/inserir_modulos')
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

Router.post('/salvar_modulos', verificarAutenticacao, verificarPermInserir, async (req, res) => {
    try {
        const modulo = req.body.modulo.toLowerCase().trim()

        const moduloEncontrado = await modulos.findOne({
            where: {
                modulo: modulo,
                ativo: 1
            }
        })

        if (modulo.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite um módulo válido.'
            })
        }

        if (moduloEncontrado) {
            return res.status(400).json({
                success: false,
                message: 'Módulo Já cadastrado.'
            })
        }

        await modulos.create({
            modulo: modulo,
            ativo: 1
        })

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'modulos',
            id_registro: 0
        })

        return res.status(201).json({
            success: true,
            message: 'Módulo cadastrado!'
        })

    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }

})

Router.post('/deletar_modulos', verificarAutenticacao, verificarPermDeletar, async (req, res) => {
    try {
        var id = req.body.id

        await modulos.update(
            { ativo: 0 },
            { where: { id: id } }
        )

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'modulos',
            id_registro: id
        })

        res.status(200).redirect('/admin/listar_modulos')

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

Router.get('/alterar_modulos/:id', verificarAutenticacao, verificarPermAlterar, async (req, res) => {
    try {
        var id = req.params.id

        const [ModulosGeral] = await Promise.all([
            modulos.findOne({ where: { id: id } })
        ])

        res.status(200).render('private/Modulo/alterar_modulos', {
            modulo: ModulosGeral
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

Router.post('/update_modulos', verificarAutenticacao, verificarPermAlterar, async (req, res) => {
    try {
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
    
        if (modulo.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite um módulo válido.'
            })
        }
    
        if (moduloEncontrado) {
            return res.status(400).json({
                success: false,
                message: 'Este módulo já esta cadastrado.'
            })
        }

        await modulos.update(
            { modulo: modulo },
            { where: { id: id } }
        );

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

    } catch (err) {
        console.error(err.message)
        return res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        });
    }
})

module.exports = Router;