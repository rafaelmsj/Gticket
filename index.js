const bodyParser = require('body-parser')
const express = require('express')
const app = express()
const bcrypt = require('bcryptjs'); //criptografa senha

//BANCO DE DADOS
const connection = require('./database/db') //TRAZ A A CONFIGURACAO DE CONEXAO DO BANCO DE DADOS 
const entidades = require('./database/entidades') //TRAZ CONEXAO COM A TABELA DO BD
const versao_sistema = require('./database/versao_sistema')
const setores = require('./database/setores');
const usuarios = require('./database/usuarios');
const grupos_de_usuarios = require('./database/grupos_de_usuarios');

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

//ROTAS DE USUARIOS
app.get('/listar_usuarios',(req,res)=>{
    usuarios.findAll().then(usuarios=>{
        res.render('listar_usuarios',{
            usuarios: usuarios
        })    
    })
    res.render('listar_usuarios')
})
app.get('/inserir_usuarios',(req,res)=>{
    setores.findAll().then(setores => {
        grupos_de_usuarios.findAll().then(grupos => {
            res.render('inserir_usuarios',{
                setores:setores,
                grupos: grupos
            })
        })
        
    })    
})
app.post('/salvar_usuarios', async (req, res) => {
    try {
        const { nome, usuario, setor, grupo, senha } = req.body;
        const ativo = 1;

        // Gerando o salt e hash da senha
        const salt = await bcrypt.genSalt(10); // Gera um salt com fator de custo 10
        const senhaHash = await bcrypt.hash(senha, salt); // Criptografa a senha

        await usuarios.create({
            nome: nome,
            usuario: usuario,
            setor: setor,
            grupo: grupo,
            senha: senhaHash, // Salvando a senha criptografada
            ativo: ativo
        });

        res.redirect('/listar_usuarios');
    } catch (error) {
        console.error("Erro ao salvar usuário:", error);
        res.status(500).send("Erro ao salvar usuário.");
    }
});


//GRUPOS DE USUARIOS
app.get('/listar_grupos_de_usuarios',(req,res)=>{
    grupos_de_usuarios.findAll().then(grupos_user => {
        res.render('listar_grupos_de_usuarios',{
            grupos: grupos_user
        })
    })
    
})
app.get('/inserir_grupos_de_usuarios',(req,res)=>{
    res.render('inserir_grupos_de_usuarios')
})
app.post('/salvar_grupos_de_usuarios', (req, res)=>{
    var grupo = req.body.gruposusuario.toLowerCase()
    var inserir = req.body.inserir || 0
    var alterar = req.body.alterar || 0
    var deletar = req.body.deletar || 0

    grupos_de_usuarios.create({
        grupo: grupo,
        inserir: inserir,
        alterar: alterar,
        deletar: deletar,
        ativo: 1
    }).then(()=>{
        res.redirect('/listar_grupos_de_usuarios')
    })
})

//CRIANDO O SERVIDOR
app.listen(8080, ()=>{
    console.log('Aplicativo Online')
})