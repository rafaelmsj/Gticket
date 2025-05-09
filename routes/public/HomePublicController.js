const express = require('express');
const Router = express.Router();

//Importando conexoes com tabelas
const entidades = require('../../database/entidades');
const tickets = require('../../database/tickets');
const tipos_entidade = require('../../database/tipos_entidade');
const versao_sistema = require('../../database/versao_sistema');

//Importando os arquivos com rotas publicas
const RoutesPublicLogin = require('./Login/LoginPublicController'); //Login
const RoutesPublicEntidades = require('./entidades/EntidadesPublicController'); //Entidades
const RoutesPublicTickets = require('./tickets/TicketsPublicController'); //Tickets
const RoutesPublicUsuarios = require('./usuario/UsuarioPublicController'); //Usuarios

//ROTAS

Router.get('/', async (req, res) => {
    try {

        const [entidade, ticket, entidadeG, tipo, versao] = await Promise.all([
            entidades.findAll({ order: [['id', 'DESC']], limit: 4 }),
            tickets.findAll({ order: [['id', 'DESC']], limit: 4 }),
            entidades.findAll(),
            tipos_entidade.findAll(),
            versao_sistema.findAll()
        ])

        res.status(200).render('public/index', {
            entidades: entidade,
            tickets: ticket,
            entidadesG: entidadeG,
            tipos: tipo,
            versoes: versao
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

//Rotas Publicas Importadas
Router.use('/', RoutesPublicLogin) //Routes login
Router.use('/', RoutesPublicEntidades) // Router Entidades
Router.use('/', RoutesPublicTickets) // Routes Tickets
Router.use('/', RoutesPublicUsuarios) // Routes Usuarios

module.exports = Router;