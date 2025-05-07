const sequelize = require('sequelize');
const connection = require('./db')

const tipos_ticket = connection.define('tipos_ticket',{
    tipo_ticket: {
        type: sequelize.STRING(50),
        allowNull: false
    },
    ativo: {
        type: sequelize.INTEGER,
        allowNull: false
    }
})

tipos_ticket.sync({force: false}).then(()=>{})

module.exports = tipos_ticket