const bodyParser = require('body-parser')
const express = require('express')
const app = express()
require('dotenv').config()
const PORT = process.env.PORT

//BANCO DE DADOS
const connection = require('./database/db') //TRAZ A A CONFIGURACAO DE CONEXAO DO BANCO DE DADOS 

//Middlewares
const [verificarAutenticacao, MiddewareDeSessao] = require('./middlewares/VerificarAutenticacao');

//IMPORTANDO OS ARQUIVOS CONTROLLER DE ROTAS
const RoutesPrivate = require('./routes/private/AdminController')
const RoutesPublic = require('./routes/public/HomePublicController')


app.set('view engine', 'ejs') //importando EJS
app.use(express.static('public')) //Permitindo arquivos estaticos

// CONFIGURA BODY-PARSER
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Middleware que carrega dados do usuário para res.locals
app.use(MiddewareDeSessao)


// Criando a conexão com o banco de dados
connection.authenticate()
    .then(async () => {
        console.log('Banco de dados conectado');
    })
    .catch((msgerro) => {
        console.log(msgerro);
    });


//ROTAS

app.use('/', RoutesPublic); //Public Routes
app.use('/', RoutesPrivate) //Private Routes


//SERVIDOR
app.listen(PORT, () => {
    console.log('Aplicativo Online')
})
