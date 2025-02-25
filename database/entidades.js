const sequelize = require('sequelize');
const connection = require('./db');
const tipos_entidade = require('./tipos_entidade');

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
        type: sequelize.STRING,
        allowNull: false
    },
    sistema_concorrente: {
        type: sequelize.STRING,
        allowNull: false
    },
    modulos_contratados:{
        type: sequelize.STRING,
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
    ativo: {
        type: sequelize.INTEGER,
        allowNull: false
    }

});

entidades.sync({force:false}).then(()=>{})

module.exports = entidades