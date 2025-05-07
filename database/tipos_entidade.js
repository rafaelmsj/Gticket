const sequelize = require('sequelize');
const connection = require('./db');

const tipos_entidade = connection.define('tipos_entidade', {
    tipo_entidade: {
        type: sequelize.STRING(50),
        allowNull: false
    },
    ativo: {
        type: sequelize.INTEGER,
        allowNull: false
    }
})

tipos_entidade.sync({force: false}).then(()=>{})

module.exports = tipos_entidade