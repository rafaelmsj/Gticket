const sequelize = require('sequelize');
const connection = require('./db')

const tipos_de_usuarios = connection.define('tipos_de_usuarios',{
    tipo:{
        type: sequelize.TEXT,
        allowNull: false
    },
    inserir:{
        type: sequelize.INTEGER,
        allowNull: false
    },
    alterar: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    deletar:{
        type: sequelize.INTEGER,
        allowNull: false
    },
    ativo: {
        type: sequelize.INTEGER,
        allowNull: false
    }
})

tipos_de_usuarios.sync({force:false}).then(()=>{})

module.exports = tipos_de_usuarios;