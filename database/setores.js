const sequelize = require('sequelize');
const connection = require('./db')

const setores = connection.define('setores',{

    setor: {
        type: sequelize.STRING(50),
        allowNull: false 
    },
    sigla: {
        type: sequelize.STRING(5),
        allowNull: false
    },
    ativo:{
        type: sequelize.INTEGER,
        allowNull: false
    }
})
setores.sync({force: false}).then(()=>{})

module.exports = setores