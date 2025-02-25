const bodyParser = require('body-parser')
const express = require('express')
const app = express()
const bcrypt = require('bcryptjs'); //criptografa senha

//BANCO DE DADOS
const connection = require('./database/db') //TRAZ A A CONFIGURACAO DE CONEXAO DO BANCO DE DADOS 
const entidades = require('./database/entidades') //TRAZ CONEXAO COM A TABELA DO BD
const versao_sistema = require('./database/versao_sistema');
const setores = require('./database/setores');
const usuarios = require('./database/usuarios');
const grupos_de_usuarios = require('./database/grupos_de_usuarios');
const concorrentes = require('./database/concorrentes');
const modulos = require('./database/modulos')
const tipos_entidade = require('./database/tipos_entidade');
const { where } = require('sequelize');

//permissoes do usuario
const perm_inserir = 1
const perm_deletar = 1
const perm_alterar = 1


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



// ROTAS DAS ENTIDADES
app.get('/listar_entidades', (req, res) => {
    const page = parseInt(req.query.page) || 1; // Página atual (default: 1)
    const limit = 20;                          // Registros por página
    const offset = (page - 1) * limit;         // Calcula o deslocamento

    entidades.findAndCountAll({
        where: { ativo: 1 },
        order: [['estado', 'ASC'], ['cidade', 'ASC']],
        limit: limit,
        offset: offset
    }).then(result => {
        const totalEntidades = result.count;
        const totalPages = Math.ceil(totalEntidades / limit);

        tipos_entidade.findAll().then(tipos => {
            versao_sistema.findAll().then(versoes => {
                res.render('listar_entidades', {
                    inserir: perm_inserir,
                    alterar: perm_alterar,
                    deletar: perm_deletar,
                    entidades: result.rows,
                    tipos: tipos,
                    versoes: versoes,
                    currentPage: page,
                    totalPages: totalPages
                });
            });
        });
    }).catch(err => {
        console.error('Erro ao buscar entidades:', err);
        res.status(500).send('Erro interno no servidor');
    });
});

app.get('/inserir_entidades',(req,res)=>{
    tipos_entidade.findAll().then(tipos_entidade =>{
        modulos.findAll().then(modulos => {
            versao_sistema.findAll().then(versao_sistema => {
                concorrentes.findAll().then(concorrentes =>{
                    res.render('inserir_entidades',{
                        tipos_entidade: tipos_entidade,
                        modulos: modulos,
                        versao_sistema: versao_sistema,
                        concorrentes: concorrentes
                    })
                })
            })
        })
    })
    
})

app.post('/salvar_entidades',(req,res)=>{
    var cidade = req.body.cidade.toLowerCase()
    var estado = req.body.estado.toLowerCase()
    var tipo_entidade = req.body.tipo_entidade
    var modulos_contratados = req.body.modulos_contratados
    var versao_sistema = req.body.versao_sistema
    var website_concorrente = req.body.website_concorrente
    var sistema_concorrente = req.body.sistema_concorrente
    var ativo = 1

    entidades.create({
        cidade: cidade,
        estado: estado,
        website_concorrente: website_concorrente,
        sistema_concorrente: sistema_concorrente,
        tipo_entidade: tipo_entidade,
        modulos_contratados: Array.isArray(modulos_contratados) ? modulos_contratados.join(', ') : modulos_contratados,
        versao_sistema: versao_sistema,
        ativo: ativo
    }).then(()=>{
        res.redirect('/listar_entidades')
    })
    
})

app.post('/deletar_entidade', (req,res)=>{
    var id = req.body.id

    entidades.update(
        {ativo: 0},
        {where: {id:id}}
    ).then(()=>{
        res.redirect('/listar_entidades')
    })
})



//VERSAO DO SISTEMA
app.get('/listar_versaosis', (req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    versao_sistema.findAndCountAll({
        where: { ativo: 1 },
        order: [['versao', 'ASC']],
        limit: limit,
        offset: offset
    }).then(versoes => {
        const totalPages = Math.ceil(versoes.count / limit); // Calcular o número total de páginas
        res.render('listar_versaosis',{
            versoes: versoes.rows,
            currentPage: page,
            totalPages: totalPages,
            inserir: perm_inserir,
            alterar: perm_alterar,
            deletar: perm_deletar
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

app.post('/deletar_versao', (req,res)=>{
    var id = req.body.id

    versao_sistema.update(
        { ativo: 0 },  // O campo que você quer atualizar
        { where: { id: id } }    // Condição para localizar o registro pelo ID
    ).then(()=>{
        res.redirect('/listar_versaosis')
    })
})



//SETOR DA EMPRESA
app.get('/listar_setor',(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    setores.findAndCountAll({
        where: {ativo: 1},
        order: [['setor', 'ASC']],
        limit: limit,
        offset: offset
    }).then(setores=>{
        const totalPages = Math.ceil(setores.count / limit); // Calcular o número total de páginas
        res.render('listar_setor',{
            setores: setores.rows,
            currentPage: page,
            totalPages: totalPages,
            inserir: perm_inserir,
            alterar: perm_alterar,
            deletar: perm_deletar
        })
    })
    
})

app.get('/inserir_setor',(req,res)=>{
    res.render('inserir_setor')
})

app.post('/salvarsetor',(req,res)=>{
    var setor = req.body.setor.toLowerCase()
    var sigla = req.body.sigla.toLowerCase()
    var ativo = 1

    setores.create({
        setor: setor,
        sigla: sigla,
        ativo: ativo
    }).then(()=>{
        res.redirect('/listar_setor')
    })
})

app.post('/deletar_setor', (req,res)=>{
    var id = req.body.id

    setores.update(
        {ativo: 0},
        {where: {id: id}}
    ).then(()=>{
        res.redirect('/listar_setor')
    })
})



//ROTAS DE USUARIOS
app.get('/listar_usuarios',(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    usuarios.findAndCountAll({
        where: {ativo: 1},
        order: [['nome','ASC']],
        limit: limit,
        offset: offset
    }).then(usuarios=>{
        const totalPages = Math.ceil(usuarios.count / limit)
        setores.findAll().then(setores =>{
            grupos_de_usuarios.findAll().then(grupos => {
                res.render('listar_usuarios',{
                    usuarios: usuarios.rows,
                    currentPage: page,
                    totalPages: totalPages,
                    inserir: perm_inserir,
                    deletar: perm_deletar,
                    alterar: perm_alterar,
                    setores: setores,
                    grupos: grupos
                })    
            })
        })

    })
    
})

app.get('/inserir_usuarios',(req,res)=>{
    setores.findAll().then(setores => {
        grupos_de_usuarios.findAll({
            where: {ativo: 1}
        }).then(grupos => {
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
            nome: nome.toLowerCase(),
            usuario: usuario.toLowerCase(),
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

app.post('/deletar_usuario',(req,res)=>{
    var id = req.body.id

    usuarios.update(
        {ativo: 0},
        {where: {id:id}}
    ).then(()=>{
        res.redirect('/listar_usuarios')
    })
})



//GRUPOS DE USUARIOS
app.get('/listar_grupos_de_usuarios',(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    grupos_de_usuarios.findAndCountAll({
        where: {ativo : 1},
        order: [['grupo','ASC']],
        offset,
        limit
    }).then(grupos_user => {
        const totalPages = Math.ceil(grupos_user.count / limit)
        res.render('listar_grupos_de_usuarios',{
            grupos: grupos_user.rows,
            totalPages: totalPages,
            currentPage: page,
            inserir: perm_inserir,
            alterar: perm_alterar,
            deletar: perm_deletar,
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

app.post('/deletar_grupo', (req,res)=>{
    var id = req.body.id

    grupos_de_usuarios.update(
        {ativo: 0}    ,
        { where : {id:id}}
    ).then(()=>{
        res.redirect('/listar_grupos_de_usuarios')
    })

})



//ROTAS CONCORRENTES
app.get('/listar_concorrentes',(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    concorrentes.findAndCountAll({
        where: {ativo: 1},
        order: [['nome','ASC']],
        limit: limit,
        offset: offset
    }).then(concorrentes=>{
        const totalPages = Math.ceil(concorrentes.count / limit);
        res.render('listar_concorrentes',{
            concorrentes: concorrentes.rows,
            currentPage: page,
            totalPages: totalPages,
            inserir: perm_inserir,
            deletar: perm_deletar,
            alterar: perm_alterar
        })
    })
    
})

app.get('/inserir_concorrentes',(req,res)=>{
    res.render('inserir_concorrentes')
})

app.post('/salvar_concorrentes', (req,res)=>{
    var nome = req.body.concorrente.toLowerCase()

    concorrentes.create({
        nome: nome.toLowerCase(),
        ativo: 1
    }).then(()=>{
        res.redirect('/listar_concorrentes')
    })
})

app.post('/deletar_concorrente',(req,res)=>{
    var id = req.body.id;

    concorrentes.update(
        {ativo: 0},
        {where: {id:id}}
    ).then(()=>{
        res.redirect('/listar_concorrentes')
    })
})

app.get('/alterar_concorrentes/:id',(req,res)=>{
    const id = req.params.id

    concorrentes.findOne(
        {where: {id:id}}
    ).then(concorrentes =>{
        res.render('alterar_concorrentes',{
            concorrente: concorrentes
        })
    })
    
})



//ROTAS PARA MODULOS DO SISTEMA
app.get('/listar_modulos', (req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    modulos.findAndCountAll({
        where: {ativo: 1},
        order: [['modulo','ASC']],
        limit: limit,
        offset: offset
    }).then(modulos=>{
        const totalPages = Math.ceil(modulos.count / limit)
        res.render('listar_modulos',{
            modulos: modulos.rows,
            totalPages: totalPages,
            currentPage: page,
            inserir: perm_inserir,
            deletar: perm_deletar,
            alterar: perm_alterar
        })
    })
    
})

app.get('/inserir_modulos', (req,res)=>{
    res.render('inserir_modulos')
})

app.post('/salvar_modulos',(req,res)=>{
    var modulo = req.body.modulo.toLowerCase()

    modulos.create({
        modulo: modulo,
        ativo: 1
    }).then(()=>{
        res.redirect('/listar_modulos')
    })
})

app.post('/deletar_modulos',(req,res)=>{
    var id = req.body.id

    modulos.update(
        {ativo: 0},
        {where: {id:id}}
    ).then(()=>{
        res.redirect('/listar_modulos')
    })
})



//ROTAS TIPOS DE ENTIDADE
app.get('/listar_tipos_entidade', (req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit

    tipos_entidade.findAndCountAll({
        where: {ativo: 1},
        order: [['tipo_entidade','ASC']],
        limit: limit,
        offset: offset
    }).then(tipos => {
        const totalPages = Math.ceil(tipos.count / limit)
        res.render('listar_tipos_entidade',{
            tipos: tipos.rows,
            totalPages: totalPages,
            currentPage: page,
            inserir: perm_inserir,
            alterar: perm_alterar,
            deletar: perm_deletar
        })
    })
    
})

app.get('/inserir_tipos_entidade',(req,res)=>{
    res.render('inserir_tipos_entidade')
})

app.post('/salvar_tipos_entidade',(req,res)=>{
    var tipo_entidade = req.body.tipo_entidade.toLowerCase()

    tipos_entidade.create({
        tipo_entidade: tipo_entidade,
        ativo: 1
    }).then(()=>{
        res.redirect('/listar_tipos_entidade')
    })
})

app.post('/deletar_tipo_entidade',(req,res)=>{
    var id = req.body.id

    tipos_entidade.update(
        {ativo: 0},
        {where: {id:id}}
    ).then(()=>{
        res.redirect('/listar_tipos_entidade')
    })
})

//CRIANDO O SERVIDOR
app.listen(8080, ()=>{
    console.log('Aplicativo Online')
})


