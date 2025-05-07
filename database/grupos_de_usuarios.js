const sequelize = require('sequelize');
const connection = require('./db')

const grupos_de_usuarios = connection.define('grupos_de_usuarios',{
    grupo:{
        type: sequelize.STRING(50),
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

grupos_de_usuarios.sync({force:false}).then(()=>{})

module.exports = grupos_de_usuarios;