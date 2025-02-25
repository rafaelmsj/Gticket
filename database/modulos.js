const sequelize = require('sequelize');
const connection = require('./db')

const modulos = connection.define('modulos', {
    modulo: {
        type: sequelize.STRING,
        allowNull: false
    },
    ativo: {
        type: sequelize.INTEGER,
        allowNull: false
    }
})

modulos.sync({force: false}).then(()=>{})

module.exports = modulos