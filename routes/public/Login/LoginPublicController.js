const express = require('express');
const Router = express.Router();
const bcrypt = require('bcryptjs'); //criptografa senha

//Importando conexoes com tabelas
const usuarios = require('../../../database/usuarios');
const log = require('../../../database/log');

//ROTAS E FUNCOES DE LOGIN E LOGOUT
Router.get('/login', async (req, res) => {
    try {
        res.status(200).render('public/login');
    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }
});

Router.post('/login', async (req, res) => {

    try {
        const { usuario, senha } = req.body;

        const usuarioEncontrado = await usuarios.findOne({ where: { usuario } });

        if (!usuarioEncontrado) {
            return res.status(401).json({
                success: false,
                message: '*Usuário inválido.'
            });
        }

        if (usuarioEncontrado.ativo !== 1) {
            return res.status(401).json({
                success: false,
                message: '*Usuário inativo.'
            });
        }

        const senhaValida = await bcrypt.compare(senha, usuarioEncontrado.senha);
        if (!senhaValida) {
            return res.status(401).json({
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

        await log.create({
            usuario: req.session.usuarioId,
            acao: 'login',
            tabela: '',
            id_registro: 0
        })

        res.status(200).json({
            success: true,
            message: 'Login efetuado!'
        })


    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }
});

Router.get('/logout', async (req, res) => {
    try {
        if (req.session.usuarioId) {
            req.session.destroy(() => {
                log.create({
                    usuario: res.locals.usuarioid,
                    acao: 'logout',
                    tabela: '',
                    id_registro: 0
                }).then(() => {
                    res.redirect('/');
                })
            });
        } else {
            res.redirect('/')
        }
    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }
   
});

module.exports = Router;