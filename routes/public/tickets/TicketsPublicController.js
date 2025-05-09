const express = require('express');
const Router = express.Router();

//Importando conexoes com tabelas
const entidades = require('../../../database/entidades');
const tickets = require('../../../database/tickets');
const tipos_ticket = require('../../../database/tipos_ticket');
const prioridades = require('../../../database/prioridades');
const ticket_pausa = require('../../../database/ticket_pausa');
const usuarios = require('../../../database/usuarios');
const tipos_entidade = require('../../../database/tipos_entidade');

const { Op } = require('sequelize');  // Importa o operador Op do Sequelize


Router.get('/ticket/:id', async (req, res) => {

    try {

        const id = req.params.id
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const offset = (page - 1) * limit
        const idUsuario = req.session.usuarioId
        const idGrupo = req.session.grupo

        const ticketEncontrado = await tickets.findOne({ where: { id: id } })

        const [entidade, tipo_ticket, prioridade, pausas, usuariosGeral] = await Promise.all([
            entidades.findOne({ where: { id: ticketEncontrado.id_entidade } }),
            tipos_ticket.findOne({ where: { id: ticketEncontrado.id_tipo } }),
            prioridades.findOne({ where: { id: ticketEncontrado.id_prioridade } }),
            ticket_pausa.findAndCountAll({
                where: { id_ticket: ticketEncontrado.id },
                order: [['id', 'DESC']],
                limit: limit,
                offset: offset
            }),
            usuarios.findAll()
        ])

        const tipo_entidade = await tipos_entidade.findOne({ where: { id: entidade.tipo_entidade } })

        const totalPausas = pausas.count;
        const totalPages = Math.ceil(totalPausas / limit);

        res.status(200).render('public/tickets/ticket', {
            currentPage: page,
            totalPages: totalPages,
            entidade: entidade,
            tipo: tipo_ticket,
            prioridade: prioridade,
            ticket: ticketEncontrado,
            tipo_entidade: tipo_entidade,
            pausas: pausas.rows,
            usuarios: usuariosGeral,
            idGrupo: idGrupo,
            idUsuario: idUsuario
        })
    }
    catch (err) {
        console.error(err.message)
        return res.json({
            success: false,
            message: 'Erro no servidor Interno.',
            error: err.message
        })
    }

})

Router.get('/tickets', async (req, res) => {
    try {
        // Importando filtros da query string
        const { prioridade, status_geral, ordenar, search, exibir, data_inicial, data_final, tipo_ticket } = req.query;

        // Pegando a página da query string, com valor padrão 1 caso não seja fornecido
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(exibir, 10) || 10;  // Convertendo `exibir` para número inteiro
        const offset = (page - 1) * limit; // Calcula o deslocamento para a consulta

        // Trazendo as tabelas que são usadas para os filtros
        const [prioridadeG, tipo, entidadeG, tipoTicket] = await Promise.all([
            prioridades.findAll(),
            tipos_entidade.findAll(),
            entidades.findAll(),
            tipos_ticket.findAll()
        ]);

        // Filtros dinâmicos - base para consulta
        const whereCondition = {};

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

        // Filtro para "prioridade" - Aceita múltiplos valores (checkbox)
        if (prioridade) {
            const prioridadeSelecionados = Array.isArray(prioridade) ? prioridade : [prioridade];
            whereCondition.id_prioridade = { [Op.in]: prioridadeSelecionados };
        }

        // Filtro para "tipo_ticket" - Aceita múltiplos valores (checkbox)
        if (tipo_ticket) {
            const tipoTicketSelecionados = Array.isArray(tipo_ticket) ? tipo_ticket : [tipo_ticket];
            whereCondition.id_tipo = { [Op.in]: tipoTicketSelecionados };
        }

        // Filtro para "status_geral" - Aceita múltiplos valores (checkbox)
        if (status_geral) {
            const statusSelecionadas = Array.isArray(status_geral) ? status_geral : [status_geral];
            whereCondition.status_geral = { [Op.in]: statusSelecionadas };
        }

        if (data_inicial) {
            if (data_final) {
                whereCondition.createdAt = {
                    [Op.between]: [data_inicial, data_final]
                };
            } else {
                whereCondition.createdAt = {
                    [Op.gte]: data_inicial
                };
            }
        } else if (data_final) {
            whereCondition.createdAt = {
                [Op.lte]: data_final
            };
        }

        // Definindo a ordenação
        let orderCondition = [];
        switch (ordenar) {
            case 'mais_recente':
                orderCondition = [['id', 'DESC']];
                break;
            case 'menos_recente':
                orderCondition = [['id', 'ASC']];
                break;
            case 'a_z':
                orderCondition = [['id', 'ASC'], ['id', 'ASC']];
                break;
            case 'z_a':
                orderCondition = [['id', 'DESC'], ['id', 'DESC']];
                break;
            default:
                orderCondition = [['id', 'DESC']];
                break;
        }

        // Consultando as entidades com os filtros e a paginação
        const result = await tickets.findAndCountAll({
            where: whereCondition,
            order: orderCondition,
            limit: limit,
            offset: offset
        });

        // Calculando o total de páginas para a navegação
        const totalTickets = result.count;
        const totalPages = Math.ceil(totalTickets / limit);

        // Renderizando a página com os dados encontrados
        res.status(200).render('public/tickets/tickets', {
            currentPage: page,
            totalPages: totalPages,
            tickets: result.rows,
            entidades: entidadeG,
            tipos: tipo,
            prioridades: prioridadeG,
            tipos_ticket: tipoTicket,
            o: ordenar,
            e: exibir,
            dt_i: data_inicial,
            dt_f: data_final,
            p: prioridade,
            st: status_geral,
            tt: tipo_ticket
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Erro no servidor interno.',
            error: err.message
        });
    }
});

module.exports = Router;