const express = require('express');
const Router = express.Router();

//Importando Middlewares
const verificarAutenticacao = require('../../middlewares/VerificarAutenticacao');

//Importando conexoes com tabelas
const log = require('../../database/log');
const usuarios = require('../../database/usuarios');

//Importando Rotas Privadas
const RoutesPrivateGruposDeUsuarios = require('./GruposDeUsuario/GruposDeUsuarioPrivateController'); //Grupos de usuarios
const RoutesPrivateTiposDeEntidade = require('./TiposDeEntidade/TiposDeEntidadePrivateController'); //Tipos de entidade
const RoutesPrivateTiposDeTicket = require('./TiposDeTicket/TiposDeTicketPrivateController'); //Tipos de Ticket
const RoutesPrivatePrioridade = require('./Prioridade/PrioridadePrivateController'); //Prioridade
const RoutesPrivateVersaoSistema = require('./VersaoSistema/VersaoSistemaPrivateController'); //Versao sistema
const RoutesPrivateSetor = require('./Setor/SetorPrivateController'); //Setor
const RoutesPrivateConcorrente = require('./Concorrente/ConcorrentePrivateController'); //Concorrente
const RoutesPrivateModulo = require('./Modulo/ModuloPrivateController'); //Modulo
const RoutesPrivateEntidades = require('./entidades/EntidadesPrivateController'); //Entidades
const RoutesPrivateTickets = require('./tickets/TicketsPrivateController'); //Tickets
const RoutesPrivateUsuarios = require('./usuario/UsuarioPrivateController'); //Usuarios


//ROTAS

Router.get('/admin', verificarAutenticacao, async (req, res) => {
    try {

        const [logs, UsuariosGeral] = await Promise.all([
            log.findAll({ order: [['id', 'DESC']] }),
            usuarios.findAll()
        ])

        res.status(200).render('private/admin', {
            usuarios: UsuariosGeral,
            logs: logs
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
});

//ROTAS IMPORTADAS
Router.use('/admin/', RoutesPrivateEntidades); //entidades
Router.use('/admin/', RoutesPrivateTickets); //tickets
Router.use('/admin/', RoutesPrivateUsuarios); //usuarios
Router.use('/admin/', RoutesPrivateGruposDeUsuarios); //Grupos de usuarios
Router.use('/admin/', RoutesPrivateTiposDeEntidade); //Tipos de entidade
Router.use('/admin/', RoutesPrivateTiposDeTicket); //Tipos de Ticket
Router.use('/admin/', RoutesPrivatePrioridade); //Prioridade
Router.use('/admin/', RoutesPrivateVersaoSistema); //Versão do sistema
Router.use('/admin/', RoutesPrivateSetor); //Setor
Router.use('/admin/', RoutesPrivateConcorrente); //Concorrente
Router.use('/admin/', RoutesPrivateModulo); //Modulo
module.exports = Router;