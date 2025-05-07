const sequelize = require('sequelize');
const connection = require('./db');

const entidades = connection.define('entidades', {
    cidade:{
        type: sequelize.STRING,
        allowNull: false 
    },
    estado: {
        type: sequelize.STRING,
        allowNull: false
    },
    website_concorrente: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    sistema_concorrente: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    modulos_contratados:{
        type: sequelize.STRING(50),
        allowNull: false
    },
    versao_sistema: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    tipo_entidade: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    instalado: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    observacao: {
        type: sequelize.TEXT,
        allowNull: false
    },
    ativo: {
        type: sequelize.INTEGER,
        allowNull: false
    }

});

entidades.sync({force:false}).then(()=>{})

module.exports = entidades