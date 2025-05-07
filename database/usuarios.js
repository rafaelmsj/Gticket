const sequelize = require('sequelize');
const connection = require('./db');

const usuarios = connection.define('usuarios',{

    nome:{
        type: sequelize.STRING(50),
        allowNull: false
    },
    usuario:{
        type: sequelize.STRING(50),
        allowNull: false
    },
    setor: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    grupo: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    perm_grupo_usuarios: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    perm_usuarios: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    senha:{
        type: sequelize.STRING,
        allowNull: false
    },
    ativo: {
        type: sequelize.INTEGER,
        allowNull: false
    }
})

usuarios.sync({force:false}).then(()=>{})

module.exports = usuarios