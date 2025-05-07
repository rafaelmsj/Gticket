const sequelize = require('sequelize');
const connection = require('./db');

const prioridades = connection.define('prioridades',{
    prioridade: {
        type: sequelize.STRING(15),
        allowNull: false
    },
    ativo: {
        type: sequelize.INTEGER,
        allowNull: false
    }
})

prioridades.sync({force: false}).then(()=>{})

module.exports = prioridades