const bodyParser = require('body-parser')
const express = require('express')
const app = express()

//BANCO DE DADOS
const connection = require('./database/db') //TRAZ A A CONFIGURACAO DE CONEXAO DO BANCO DE DADOS 
const entidades = require('./database/entidades') //TRAZ CONEXAO COM A TABELA DO BD
const versao_sistema = require('./database/versao_sistema')
const setores = require('./database/setores');
const usuarios = require('./database/usuarios');

app.set('view engine','ejs') //importando EJS
app.use(express.static('public')) //Permitindo arquivos estaticos

// CONFIGURA BODY-PARSER
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

//CRIA CONEXAO COM O BD
connection
    .authenticate()
    .then(()=>{
        console.log('Banco de dados conectado')
    })
    .catch((msgerro)=>{
        console.log(msgerro)
    })


app.get('/',(req,res)=>{
    res.render('index')
})


app.get('/admin', (req,res)=>{
    res.render('admin')
})

app.post('/salvarentidade',(req,res)=>{
    var cidade = req.body.cidade
    var estado = req.body.estado

    entidades.create({
        cidade: cidade,
        estado: estado
    }).then(()=>{
        res.redirect('/')
    })
    
})


//VERSAO DO SISTEMA
app.get('/listar_versaosis', (req,res)=>{
    versao_sistema.findAll().then(versoes => {
        res.render('listar_versaosis',{
            versoes: versoes
        })
    })
    
})

app.get('/inserir_versao',(req,res)=>{
    res.render('inserir_versaosis')
})

app.post('/salvarversao',(req,res)=>{
    var versao = req.body.versaosis.toLowerCase().trim()

    versao_sistema.create({
        versao: versao,
        ativo: 1
    }).then(()=>{
        res.redirect('/listar_versaosis')
    })
})

//SETOR DA EMPRESA
app.get('/listar_setor',(req,res)=>{
    setores.findAll().then(setores=>{
        res.render('listar_setor',{
            setores: setores
        })
    })
    
})

app.get('/inserir_setor',(req,res)=>{
    res.render('inserir_setor')
})

app.post('/salvarsetor',(req,res)=>{
    var setor = req.body.setor.toLowerCase()
    var sigla = req.body.sigla.toUpperCase()
    var ativo = 1

    setores.create({
        setor: setor,
        sigla: sigla,
        ativo: ativo
    }).then(()=>{
        res.redirect('/listar_setor')
    })
})

//CRIANDO O SERVIDOR
app.listen(8080, ()=>{
    console.log('Aplicativo Online')
})