const sequelize = require('sequelize');

const DBname = process.env.DB_DATABASE
const DBuser = process.env.DB_USER
const DBpassword = process.env.DB_PASSWORD
const DBhost = process.env.DB_HOST

const connection = new sequelize(DBname, DBuser, DBpassword,{
    host: DBhost,
    dialect: 'mysql'
});

module.exports = connection;