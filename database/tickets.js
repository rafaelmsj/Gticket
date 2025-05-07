const sequelize = require('sequelize');
const connection = require('./db');

const tickets = connection.define('tickets',{
    id_entidade: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    id_tipo: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    id_prioridade: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    assunto: {
        type: sequelize.STRING(50),
        allowNull: false
    },
    descricao: {
        type: sequelize.TEXT,
        allowNull: false
    },
    observacao: {
        type: sequelize.TEXT,
        allowNull: false
    },
    observacao_interna: {
        type: sequelize.TEXT,
        allowNull: false
    },
    dt_previsao: {
        type: sequelize.DATEONLY,
        allowNull: false
    },
    dt_inicio_ticket: {
        type: sequelize.DATEONLY,
        allowNull: false
    },
    responsavel: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    auxiliares: {
        type: sequelize.STRING(50),
        allowNull: false
    },
    status_geral: {
        type: sequelize.STRING(25),
        allowNull: false
    },
    dt_finalizado: {
        type: sequelize.DATEONLY,
        allowNull: false
    },
})

tickets.sync({force: false}).then(()=>{})

module.exports = tickets