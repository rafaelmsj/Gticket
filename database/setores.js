const sequelize = require('sequelize');
const connection = require('./db')

var setores = connection.define('setores',{

    setor: {
        type: sequelize.TEXT,
        allowNull: false 
    },
    sigla: {
        type: sequelize.TEXT,
        allowNull: false
    },
    ativo:{
        type: sequelize.INTEGER,
        allowNull: false
    }
})
setores.sync({force: false}).then(()=>{})

module.exports = setores