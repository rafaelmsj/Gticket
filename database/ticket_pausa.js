const sequelize = require('sequelize');
const connection = require('./db')

const ticket_pausa = connection.define('ticket_pausa', {
    id_ticket: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    motivo_pausa: {
        type: sequelize.STRING(50),
        allowNull: false
    },
    motivo_retirada_pausa: {
        type: sequelize.STRING(50),
        allowNull: false
    }
})

ticket_pausa.sync({force: false}).then(()=>{})

module.exports = ticket_pausa