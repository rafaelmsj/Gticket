const express = require('express');
const Router = express.Router()
const session = require('express-session');

const setores = require('../database/setores')

function verificarAutenticacao(req, res, next) {
    if (req.session.usuarioId) {
        return next();
    }
    res.redirect('/login');
}

Router.use(session({
    secret: 'segredo_super_secreto', // Troque por algo mais seguro em produção
    resave: false,
    saveUninitialized: false, // mais seguro
    cookie: { secure: false } // true somente com HTTPS
}));

Router.use(async (req, res, next) => {
    try {
        if (req.session.usuario) {
            // Espera a consulta ao banco de dados ser resolvida
            const setorInfo = await setores.findOne({ where: { id: req.session.setor } });

            // Passa as informações para o res.locals
            res.locals.setornome = setorInfo ? setorInfo.setor : null; // Assumindo que 'nome' é o campo que você quer
            res.locals.usuario = req.session.usuario;
            res.locals.usuarioid = req.session.usuarioId;
            res.locals.nome = req.session.nome;
            res.locals.setor = req.session.setor;
            res.locals.grupo = req.session.grupo;
            res.locals.perm_t_usuarios = req.session.perm_usuarios;
            res.locals.perm_t_grupos = req.session.perm_grupos;
        } else {
            res.locals.usuario = null;
            res.locals.nome = null;
            res.locals.setor = null;
            res.locals.grupo = null;
            res.locals.setornome = null;
        }
        next();
    } catch (error) {
        console.error('Erro ao buscar setor:', error);
        next();
    }
});

module.exports = [verificarAutenticacao, Router]