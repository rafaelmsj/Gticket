const express = require('express');
const Router = express.Router();
const bcrypt = require('bcryptjs'); //criptografa senha

//Importando Middlewares
const verificarAutenticacao = require('../../../middlewares/VerificarAutenticacao');
const verificarPermInserir = require('../../../middlewares/VerificarPermInserir');
const verificarPermAlterar = require('../../../middlewares/VerificarPermAlterar');
const verificarPermDeletar = require('../../../middlewares/VerificarPermDeletar');

//Importando conexoes com tabelas
const usuarios = require('../../../database/usuarios');
const grupos_de_usuarios = require('../../../database/grupos_de_usuarios');
const setores = require('../../../database/setores');
const log = require('../../../database/log');

const { Op } = require('sequelize');  // Importa o operador Op do Sequelize


//ROTAS DE USUARIOS
Router.get('/listar_usuarios', verificarAutenticacao, async (req, res) => {

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;
        const idUsuario = req.session.usuarioId
        const idGrupo = req.session.grupo

        // Captura os filtros da requisição
        const { search, ordenar } = req.query;

        // Filtros dinâmicos
        const whereCondition = { ativo: 1 };
        if (search) whereCondition.nome = { [Op.like]: `%${search}%` };

        // Ordenação
        let orderCondition = [];
        switch (ordenar) {
            case 'mais_recente':
                orderCondition = [['id', 'DESC']];
                break;
            case 'menos_recente':
                orderCondition = [['id', 'ASC']];
                break;
            case 'a_z':
                orderCondition = [['nome', 'ASC']];
                break;
            case 'z_a':
                orderCondition = [['nome', 'DESC']];
                break;
            default:
                orderCondition = [['nome', 'ASC']];
                break;
        }

        if (req.session.perm_usuarios !== 1) {
            return res.status(401).json({
                success: false,
                message: 'Você não tem permissão para acessar esta página.'
            })
        }

        const [usuarioinfo, grupoinfo, SetoresGeral, grupos, usuariosGeral] = await Promise.all([
            usuarios.findOne({ where: { id: idUsuario } }),
            grupos_de_usuarios.findOne({ where: { id: idGrupo } }),
            setores.findAll(),
            grupos_de_usuarios.findAll(),
            usuarios.findAndCountAll({ where: whereCondition, order: orderCondition, limit: limit, offset: offset })
        ])

        const totalPages = Math.ceil(usuariosGeral.count / limit)

        res.status(200).render('private/usuarios/listar_usuarios', {
            usuarios: usuariosGeral.rows,
            currentPage: page,
            totalPages: totalPages,
            infoUser: usuarioinfo,
            infoGrupo: grupoinfo,
            setores: SetoresGeral,
            grupos: grupos,
            ordenar: ordenar
        })

    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor',
            error: err.message
        })
    }
})

Router.get('/inserir_usuarios', verificarAutenticacao, verificarPermInserir, async (req, res) => {

    try {
        const [SetogresGeral, grupos] = await Promise.all([
            setores.findAll({ order: [['setor', 'ASC']] }),
            grupos_de_usuarios.findAll({ where: { ativo: 1 }, order: [['grupo', 'ASC']] })
        ])

        res.status(200).render('private/usuarios/inserir_usuarios', {
            setores: SetogresGeral,
            grupos: grupos
        })
    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }

})

Router.post('/salvar_usuarios', verificarAutenticacao, verificarPermInserir, async (req, res) => {
    try {
        const { nome, usuario, setor, grupo, senha, confirmar_senha, perm_usuarios, perm_grupoUsuarios } = req.body;
        const ativo = 1;

        // Gerando o salt e hash da senha
        const salt = await bcrypt.genSalt(10); // Gera um salt com fator de custo 10
        const senhaHash = await bcrypt.hash(senha, salt); // Criptografa a senha

        if (nome.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite um nome valido.'
            })
        }

        if (usuario.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Digite um usúario valido.'
            })
        }

        if (senha.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'A senha deve ter pelomenos 6 digitos.'
            })
        }

        if (senha !== confirmar_senha) {
            return res.status(400).json({
                success: false,
                message: 'As senhas não conferem.'
            })
        }

        //VERIFICA SE O USUARIO JA ESTA CADASTRADO
        const userExistente = await usuarios.findOne({ where: { usuario: usuario.toLowerCase().trim() } })

        if (userExistente) {
            return res.status(400).json({
                success: false,
                message: 'Este usúario já esta cadastrado.'
            })
        }

        //VERIFICA SE JA TEM ESSE NOME CADASTRADO
        const nomeExistente = await usuarios.findOne({ where: { nome: nome.toLowerCase().trim() } })

        if (nomeExistente) {
            return res.status(400).json({
                success: false,
                message: 'Esse nome já está vinculado a um usúario.'
            })
        }


        await usuarios.create({
            nome: nome.toLowerCase().trim(),
            usuario: usuario.toLowerCase().trim(),
            setor: setor,
            perm_grupo_usuarios: perm_grupoUsuarios,
            perm_usuarios: perm_usuarios,
            grupo: grupo,
            senha: senhaHash,
            ativo: ativo
        });

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'inserido',
            tabela: 'usuarios',
            id_registro: 0
        })

        res.status(201).json({
            success: true,
            message: 'Usúario criado!'
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }
});

Router.post('/deletar_usuarios', verificarAutenticacao, verificarPermDeletar, async (req, res) => {

    try {
        var id = req.body.id

        await usuarios.update(
            { ativo: 0 },
            { where: { id: id } }
        )

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'deletado',
            tabela: 'usuarios',
            id_registro: id
        })

        res.status(200).redirect('/admin/listar_usuarios')
    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }

})

Router.get('/alterar_usuarios/:id', verificarAutenticacao, verificarPermAlterar, async (req, res) => {

    try {
        const id = req.params.id

        const [usuario, grupos, SetoresGeral] = await Promise.all([
            usuarios.findOne({ where: { id: id } }),
            grupos_de_usuarios.findAll({ order: [['grupo', 'ASC']] }),
            setores.findAll({ order: [['setor', 'ASC']] })
        ])

        res.status(200).render('private/usuarios/alterar_usuario', {
            usuario: usuario,
            setores: SetoresGeral,
            grupos: grupos
        })
    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }

})

Router.post('/update_usuarios', verificarAutenticacao, verificarPermAlterar, async (req, res) => {

    try {
        const id = req.body.id
        const setor = req.body.setor
        const grupo = req.body.grupo
        const perm_usuarios = req.body.perm_usuarios
        const perm_grupoUsuarios = req.body.perm_grupoUsuarios

        await usuarios.update(
            {
                setor: setor,
                grupo: grupo,
                perm_grupo_usuarios: perm_grupoUsuarios,
                perm_usuarios: perm_usuarios
            },
            { where: { id: id } }
        )

        await log.create({
            usuario: res.locals.usuarioid,
            acao: 'alterado',
            tabela: 'usuarios',
            id_registro: id
        })

        res.status(200).json({
            success: true,
            message: 'Usúario alterado!'
        })
    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }

})

//ROTAS DE CONFIGURAÇÃO DE USUARIO
Router.get('/configurar_usuario', verificarAutenticacao, async (req, res) => {

    try {

        const idUsuario = req.session.usuarioId

        const [usuario] = await Promise.all([
            usuarios.findOne({ where: { id: idUsuario } })
        ])

        res.status(200).render('private/usuarios/configurar_usuario', {
            usuario: usuario,
            erro: null
        })

    }
    catch (err) {
        console.log(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        })
    }
})

Router.post('/alterar_password', async (req, res) => {

    try {

        const senhaOld = req.body.senhaAntiga; // Senha antiga fornecida pelo usuário
        const senhaNew = req.body.novaSenha;   // Nova senha fornecida pelo usuário
        const senhaNew2 = req.body.confirmarNovaSenha; // Confirmação da nova senha fornecida pelo usuário
        const idUser = req.session.usuarioId; // ID do usuário logado (assumindo que você usa sessões)

        // Primeiro, verificar se todos os campos foram preenchidos
        if (!senhaOld || !senhaNew || !senhaNew2) {
            return res.status(400).json({ success: false, message: 'Todos os campos devem ser preenchidos.' });
        }

        // Verificar se as novas senhas coincidem
        if (senhaNew !== senhaNew2) {
            return res.status(400).json({ success: false, message: 'As senhas não coincidem.' });
        }
        
        // Verificar se a nova senha tem pelo menos 6 caracteres
        if (senhaNew.length < 6) {
            return res.status(400).json({ success: false, message: 'A nova senha deve ter pelo menos 6 caracteres.' });
        }

        // Encontrar o usuário no banco de dados
        const usuario = await usuarios.findOne({ where: { id: idUser } });

        // Se o usuário não for encontrado
        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        // Verificar se a senha antiga está correta
        const senhaOK = await bcrypt.compare(senhaOld, usuario.senha);

        // Se a senha antiga não for correta
        if (!senhaOK) {
            return res.status(400).json({ success: false, message: 'Senha antiga incorreta.' });
        }

        const novaSenhaOK = await bcrypt.compare(senhaNew, usuario.senha);
        if (novaSenhaOK) {
            return res.status(400).json({ success: false, message: 'Você já está utilizando esta senha.' })
        }

        // Caso tudo esteja correto, fazer o update da senha
        const novaSenhaHash = await bcrypt.hash(senhaNew, 10); // Criptografar a nova senha

        // Atualizar a senha do usuário no banco de dados
        await usuarios.update({ senha: novaSenhaHash }, { where: { id: idUser } });

        // Enviar resposta de sucesso
        return res.json({ success: true, message: 'Senha alterada com sucesso!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao alterar a senha.'
        });
    }
});

module.exports = Router;