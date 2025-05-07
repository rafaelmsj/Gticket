const sequelize = require('sequelize');

const connection = new sequelize('gticket','root','showmypc',{
    host: 'localhost',
    dialect: 'mysql'
});

module.exports = connection;