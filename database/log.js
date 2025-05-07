const sequelize = require('sequelize');
const connection = require('./db');

const log = connection.define('log',{
    usuario: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    acao: {
        type: sequelize.STRING(50),
        allowNull: false  
    },
    tabela: {
        type: sequelize.STRING,
        allowNull: false  
    },
    id_registro: {
        type: sequelize.INTEGER,
        allowNull: false  
    }

})

log.sync({force:false}).then(()=>{})

module.exports = log