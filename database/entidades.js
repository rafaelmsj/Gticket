const sequelize = require('sequelize');
const connection = require('./db');

const entidades = connection.define('entidades', {
    cidade:{
        type: sequelize.TEXT,
        allowNull: false 
    },
    estado: {
        type: sequelize.TEXT,
        allowNull: false
    }
});

entidades.sync({force:false}).then(()=>{})

module.exports = entidades