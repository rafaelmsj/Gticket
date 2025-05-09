const sequelize = require('sequelize');
const connection = require('./db');
const bcrypt = require('bcryptjs'); //criptografa senha

const usuarios = connection.define('usuarios', {

    nome: {
        type: sequelize.STRING(50),
        allowNull: false
    },
    usuario: {
        type: sequelize.STRING(50),
        allowNull: false
    },
    setor: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    grupo: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    perm_grupo_usuarios: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    perm_usuarios: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    senha: {
        type: sequelize.STRING,
        allowNull: false
    },
    ativo: {
        type: sequelize.INTEGER,
        allowNull: false
    }
})

usuarios.sync({ force: false }).then(() => { })

module.exports = usuarios

async function CriarUsuarioPadrao() {
    // Verifica se o usuário padrão existe
    const usuarioExistente = await usuarios.findOne({ where: { usuario: 'admin' } });
    if (!usuarioExistente) {
        // Cria o usuário padrão, caso não exista
        const senhaCriptografada = await bcrypt.hash('admin', 10); // Criptografa a senha
        await usuarios.create({
            nome: 'administrador',
            usuario: 'admin',
            setor: 0,
            grupo: 1,
            perm_grupo_usuarios: 1,
            perm_usuarios: 1,
            senha: senhaCriptografada,
            ativo: 1  // Usuário ativo
        });
        console.log('Usuário padrão criado com sucesso!');
    }
}

CriarUsuarioPadrao()