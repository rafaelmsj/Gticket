const sequelize = require('sequelize');
const connection = require('./db');

const usuarios = connection.define('usuarios',{

    nome:{
        type: sequelize.TEXT,
        allowNull: false
    },
    usuario:{
        type: sequelize.TEXT,
        allowNull: false
    },
    setor: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    tipo: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    senha:{
        type: sequelize.TEXT,
        allowNull: false
    },
    ativo: {
        type: sequelize.INTEGER,
        allowNull: false
    }
})

usuarios.sync({force:false}).then(()=>{})

module.exports = usuarios