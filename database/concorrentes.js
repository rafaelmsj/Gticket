const sequelize = require('sequelize');
const connection = require('./db')

const concorrentes = connection.define('concorrentes',{

    nome:{
        type: sequelize.STRING(50),
        allowNull: false
    },
    ativo: {
        type: sequelize.INTEGER,
        allowNull: false
    }
})

concorrentes.sync({force: false}).then(()=>{});

module.exports = concorrentes