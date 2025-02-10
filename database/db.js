const sequelize = require('sequelize');

const connection = new sequelize('import_tickets','root','showmypc',{
    host: 'localhost',
    dialect: 'mysql'
});

module.exports = connection;