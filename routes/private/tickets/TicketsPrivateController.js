const express = require('express');
const Router = express.Router();

//Importando Middlewares
const verificarAutenticacao = require('../../../middlewares/VerificarAutenticacao');
const verificarPermInserir = require('../../../middlewares/VerificarPermInserir');
const verificarPermAlterar = require('../../../middlewares/VerificarPermAlterar');

//Importando conexoes com tabelas
const entidades = require('../../../database/entidades');
const tickets = require('../../../database/tickets');
const tipos_ticket = require('../../../database/tipos_ticket');
const prioridades = require('../../../database/prioridades');
const ticket_pausa = require('../../../database/ticket_pausa');
const usuarios = require('../../../database/usuarios');
const tipos_entidade = require('../../../database/tipos_entidade');
const grupos_de_usuarios = require('../../../database/grupos_de_usuarios');
const log = require('../../../database/log');

const { Op } = require('sequelize');  // Importa o operador Op do Sequelize


Router.get('/listar_tickets', verificarAutenticacao, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit
        const idUsuario = req.session.usuarioId
        const idGrupo = req.session.grupo

        // Captura os filtros da requisição
        const { search, ordenar, TipoTicketFiltro, PrioridadeFiltro, statusFiltro } = req.query;

        // Filtros dinâmicos
        const whereCondition = {}
        // Filtro de busca por entidades
        if (search) {
            const entidadesEncontradas = await entidades.findAll({
                where: { cidade: { [Op.like]: `%${search}%` } } // Ajuste conforme o campo correto
            });
            const idsEntidades = entidadesEncontradas.map(entidade => entidade.id); // Coleta os IDs das entidades encontradas

            if (idsEntidades.length > 0) {
                whereCondition.id_entidade = { [Op.in]: idsEntidades }; // Usa Op.in para filtrar pelas entidades encontradas
            } else {
                whereCondition.id_entidade = null; // Se nenhuma entidade for encontrada
            }
        }

        if (TipoTicketFiltro) whereCondition.id_tipo = TipoTicketFiltro

        if (PrioridadeFiltro) whereCondition.id_prioridade = PrioridadeFiltro

        if (statusFiltro !== undefined) {
            if (statusFiltro === '') {
                delete whereCondition.status_geral; // Remove o filtro se "Todos" for selecionado
            } else {
                whereCondition.status_geral = statusFiltro
            }
        }

        // Verificação do parâmetro de idEntidade
        const idEntidade = req.query.idEntidade || 0
        if (idEntidade !== 0) {
            whereCondition.id_entidade = idEntidade; // Aplica o filtro para id_entidade
        }

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
                orderCondition = [['id_entidade', 'ASC']];
                break;
            case 'z_a':
                orderCondition = [['id_entidade', 'DESC']];
                break;
            default:
                orderCondition = [['id_entidade', 'ASC']];
                break;
        }

        // Busca entidades com paginação e filtro
        const result = await tickets.findAndCountAll({
            where: whereCondition,
            order: orderCondition,
            limit: limit,
            offset: offset
        });

        const totalEntidades = result.count;
        const totalPages = Math.ceil(totalEntidades / limit);

        const [grupos, usuario, entidade, prioridade, tipo, tipo_entidade] = await Promise.all([
            grupos_de_usuarios.findOne({ where: { id: idGrupo } }),
            usuarios.findOne({ where: { id: idUsuario } }),
            entidades.findAll(),
            prioridades.findAll(),
            tipos_ticket.findAll(),
            tipos_entidade.findAll()
        ])

        res.status(200).render('private/tickets/listar_tickets', {
            tickets: result.rows,
            currentPage: page,
            totalPages: totalPages,
            infoUser: usuario,
            infoGrupo: grupos,
            filtros: { search, ordenar },
            ordenar: ordenar,
            TipoTicketFiltro: TipoTicketFiltro || '',
            PrioridadeFiltro: PrioridadeFiltro || '',
            statusFiltro: statusFiltro || '',
            entidades: entidade,
            prioridades: prioridade,
            tipos: tipo,
            tipos_entidade: tipo_entidade

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

Router.get('/inserir_ticket', verificarAutenticacao, verificarPermInserir, async (req, res) => {

    try {

        const [tipos, prioridade, entidade, tipo_entidade] = await Promise.all([
            tipos_ticket.findAll({ where: { ativo: 1 }, order: [['tipo_ticket', 'ASC']] }),
            prioridades.findAll({ where: { ativo: 1 }, order: [['prioridade', 'ASC']] }),
            entidades.findAll({ where: { ativo: 1 }, order: [['cidade', 'ASC'], ['estado', 'ASC']] }),
            tipos_entidade.findAll()
        ])

        res.status(200).render('private/tickets/inserir_ticket', {
            tipos: tipos,
            prioridades: prioridade,
            entidades: entidade,
            tipos_entidade: tipo_entidade
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

Router.post('/salvar_ticket', verificarAutenticacao, verificarPermInserir, async (req, res) => {
    try {
        const id_usuario = req.session.usuarioId

        const { id_entidade, id_tipo, id_prioridade, assunto, descricao } = req.body

        if (assunto.length < 5) {
            return res.status(400).json({
                success: false,
                message: 'Insira um assunto válido.'
            })
        }

        await tickets.create({
            id_entidade: id_entidade,
            id_tipo: id_tipo,
            id_prioridade: id_prioridade,
            assunto: assunto,
            descricao: descricao,
            dt_previsao: '0001-01-01',
            dt_inicio_ticket: '0001-01-01',
            observacao: '',
            observacao_interna: '',
            responsavel: 0,
            auxiliares: '',
            status_geral: 'aguardando',
            dt_finalizado: '0001-01-01'
        })

        log.create({
            usuario: id_usuario,
            acao: 'inserido',
            tabela: 'tickets',
            id_registro: 0
        })

        return res.status(201).json({
            success: true,
            message: 'Ticket Registrado!'
        })

    } catch (err) {
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor',
            error: err.message
        })
    }
})

Router.get('/alterar_ticket/:id', verificarAutenticacao, verificarPermAlterar, async (req, res) => {
    try {

        const idTicket = req.params.id

        const ticketEncontrado = await tickets.findOne({ where: { id: idTicket } })

        const [entidade, tipo, prioridade, usuario] = await Promise.all([
            entidades.findOne({ where: { id: ticketEncontrado.id_entidade } }),
            tipos_ticket.findOne({ where: { id: ticketEncontrado.id_tipo } }),
            prioridades.findOne({ where: { id: ticketEncontrado.id_prioridade } }),
            usuarios.findAll()
        ])

        const tipo_entidade = await tipos_entidade.findOne({ where: { id: entidade.tipo_entidade } })

        res.status(200).render('private/tickets/alterar_ticket', {
            ticket: ticketEncontrado,
            entidade: entidade,
            tipo: tipo,
            prioridade: prioridade,
            usuarios: usuario,
            tipo_entidade: tipo_entidade
        })

    }
    catch (err) {
        console.error(err.message)
        res.status(500).json({
            sucess: false,
            message: 'Erro interno no servidor',
            error: err.message
        })
    }
})

Router.post('/update_ticket', verificarAutenticacao, verificarPermAlterar, async (req, res) => {

    try {
        const id = req.body.id
        const previsao = req.body.previsao
        const status_geral = req.body.status_geral
        const id_responsavel = req.body.id_responsavel
        const id_auxiliar = req.body.id_auxiliar
        const obs = req.body.obs
        const observacao_interna = req.body.observacao_interna
        let data_inicio = null

        const TicketEncontrado = await tickets.findOne({ where: { id } });

        if (TicketEncontrado) {
            // Verifica se o status é "execucao" e a data de início não foi definida
            if (status_geral === 'execucao' && TicketEncontrado.dt_inicio_ticket === '0001-01-01') {
                data_inicio = new Date(); // Define data de início como a data atual
            } else {
                // Caso contrário, mantém a data de início atual do ticket
                data_inicio = TicketEncontrado.dt_inicio_ticket;
            }
        }

        await tickets.update({
            dt_previsao: previsao || '0001-01-01',
            status_geral: status_geral,
            responsavel: id_responsavel || 0,
            observacao: obs,
            observacao_interna: observacao_interna,
            auxiliares: id_auxiliar,
            dt_inicio_ticket: data_inicio

        },
        { where: { id: id } })

        res.status(200).json({ success: true, message: 'Ticket atualizado!' })

    }
    catch (err){
        console.error(err.message)
        res.status(500).json({
           success: false,
           message: 'Erro no servidor interno',
           error: err.message
        })
    }
})

Router.post('/ticketPausa', verificarAutenticacao, async (req, res) => {

    try {
        const id = req.body.id
        const pausa = req.body.pausa.trim()
        const retiradapausa = req.body.retiradapausa.trim()

        // Verificar e tratar a inserção de uma nova pausa
        if (pausa) {
            await ticket_pausa.create({
                id_ticket: id,
                motivo_pausa: pausa,
                motivo_retirada_pausa: retiradapausa
            });

            return res.status(201).json({
                success: true,
                message: 'Pausa inserida'
            });
        }

        // Verificar e tratar a atualização de retirada de pausa
        if (retiradapausa) {
            // Procurar o último registro de PausaTicket
            const PausaTicket = await ticket_pausa.findOne({
                where: { id_ticket: id },
                order: [['id', 'DESC']] // Ordenação pela coluna 'id' em ordem decrescente
            });
            if (PausaTicket) {
                await ticket_pausa.update({
                    motivo_retirada_pausa: retiradapausa
                }, {
                    where: { id: PausaTicket.id }
                });

                return res.status(201).json({
                    success: true,
                    message: 'Retirada de Pausa inserida'
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'Pausa não encontrada para atualização'
                });
            }
        }

        // Se nenhuma condição for atendida
        return res.status(400).json({
            success: false,
            message: 'Nenhuma ação válida realizada. Verifique os dados enviados.'
        });

    }
    catch (err){
        console.error(err.message)
        res.status(500).json({
            success: false,
            message: 'Erro no servidor interno',
            error: err.message
        })
    }
})


module.exports = Router;