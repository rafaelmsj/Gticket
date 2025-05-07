const sequelize = require('sequelize')
const connection = require('./db')

const versao_sistema = connection.define('versao_sistema',{

    versao: {
        type: sequelize.STRING(50),
        allowNull: false
    },
    ativo: {
        type: sequelize.INTEGER,
        allowNull: false
    }
    
})

versao_sistema.sync({force:false}).then(()=>{})

module.exports = versao_sistema