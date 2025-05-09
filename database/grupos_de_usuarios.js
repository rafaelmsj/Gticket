const sequelize = require('sequelize');
const connection = require('./db')

const grupos_de_usuarios = connection.define('grupos_de_usuarios', {
    grupo: {
        type: sequelize.STRING(50),
        allowNull: false
    },
    inserir: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    alterar: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    deletar: {
        type: sequelize.INTEGER,
        allowNull: false
    },
    ativo: {
        type: sequelize.INTEGER,
        allowNull: false
    }
})

grupos_de_usuarios.sync({ force: false }).then(() => { })

module.exports = grupos_de_usuarios;

async function CriarGrupoDeUsuarioPadrao() {
    // Verifica se o grupo padrão existe
    const grupoExistente = await grupos_de_usuarios.findOne({ where: { grupo: 'administrador' } });
    if (!grupoExistente) {
        // Cria o grupo padrão, caso não exista
        await grupos_de_usuarios.create({
            grupo: 'administrador',
            inserir: 1,
            alterar: 1,
            deletar: 1,
            ativo: 1
        });
        console.log('Grupo Padrão criado com sucesso!');
    }

}

CriarGrupoDeUsuarioPadrao()