//Importando o express e o Router
const express = require('express');
const Router = express.Router()

//Importando conexoes com tabelas
const tickets = require('../../../database/tickets');
const tipos_entidade = require('../../../database/tipos_entidade');
const versao_sistema = require('../../../database/versao_sistema');
const modulos = require('../../../database/modulos');
const entidades = require('../../../database/entidades');
const concorrentes = require('../../../database/concorrentes');
const tipos_ticket = require('../../../database/tipos_ticket');
const prioridades = require('../../../database/prioridades');

const { Op } = require('sequelize');  // Importa o operador Op do Sequelize

Router.get('/entidade/:id', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Página atual (default: 1)
        const limit = 5;                           // Registros por página
        const offset = (page - 1) * limit;          // Calcula o deslocamento
        const idEntidade = req.params.id;

        // Busca a entidade
        const entidadeEncontrada = await entidades.findOne({ where: { id: idEntidade } });

        // Se não encontrar a entidade, retorna erro
        if (!entidadeEncontrada) {
            return res.status(404).json({
                success: false,
                message: "Entidade não encontrada"
            });
        }

        // Buscar os dados relacionados em paralelo
        const [concorrente, modulo, versao, tipo, ticket, tipo_ticket, prioridade] = await Promise.all([
            concorrentes.findAll(),
            modulos.findAll(),
            versao_sistema.findOne({ where: { id: entidadeEncontrada.versao_sistema } }),
            tipos_entidade.findOne({ where: { id: entidadeEncontrada.tipo_entidade } }),
            tickets.findAndCountAll({ where: { id_entidade: idEntidade }, order: [['id', 'DESC']], limit: limit, offset: offset }),
            tipos_ticket.findAll(),
            prioridades.findAll(),
        ]);

        const totaltickets = ticket.count;
        const totalPages = Math.ceil(totaltickets / limit);

        // Renderiza a página com os dados
        res.status(200).render('public/entidades/entidade', {
            entidade: entidadeEncontrada,
            concorrentes: concorrente,
            modulos: modulo || null, // Garante que será null caso não encontre
            versao: versao || null,
            tipo: tipo || null,
            Tickets: ticket.rows || [],
            tipos_ticket: tipo_ticket || null,
            prioridades: prioridade || [],
            currentPage: page,
            totalPages: totalPages
        });

    } catch (err) {
        console.error("Erro ao buscar entidade:", err);
        res.status(500).json({
            success: false,
            message: 'Erro no servidor Interno.',
            error: err.message
        });
    }
});

Router.get('/entidades', async (req, res) => {
    try {
        // Importando filtros da query string
        const { instalado, tipo_entidade, versao, ticket, ordenar, search, exibir, data_inicial, data_final } = req.query;

        // Pegando a página da query string, com valor padrão 1 caso não seja fornecido
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(exibir, 10) || 10;  // Convertendo `exibir` para número inteiro
        const offset = (page - 1) * limit; // Calcula o deslocamento para a consulta

        // Pegando dados do usuário e grupo (caso necessário)
        const idUsuario = req.session.usuarioId;
        const idGrupo = req.session.grupo;

        // Trazendo as tabelas que são usadas para os filtros
        const [tickets_geral, tipo, versao_sis, modulo_geral] = await Promise.all([
            tickets.findAll({ where: { status_geral: { [Op.notLike]: 'finalizado' } } }),
            tipos_entidade.findAll(),
            versao_sistema.findAll(),
            modulos.findAll()
        ]);

        // Filtros dinâmicos - base para consulta
        const whereCondition = { ativo: 1 };

        // Filtro de pesquisa (search) - exemplo: busca pela cidade
        if (search && search.trim() !== "") {
            whereCondition.cidade = { [Op.like]: `%${search}%` };
        }

        // Filtro de "Instalado"
        if (instalado) whereCondition.instalado = instalado;

        // Filtro para "Tipo de Entidade" - Aceita múltiplos valores (checkbox)
        if (tipo_entidade) {
            const tiposSelecionados = Array.isArray(tipo_entidade) ? tipo_entidade : [tipo_entidade];
            whereCondition.tipo_entidade = { [Op.in]: tiposSelecionados };
        }

        // Filtro para "Versão" - Aceita múltiplos valores (checkbox)
        if (versao) {
            const versoesSelecionadas = Array.isArray(versao) ? versao : [versao];
            whereCondition.versao_sistema = { [Op.in]: versoesSelecionadas };
        }

        // Filtro para "Ticket" - Aceita valores filtrados
        if (ticket) {
            if (ticket === '1') {
                // Quando o ticket é "1", busca as entidades que estão associadas a algum ticket
                const TicketsEncontrados = await tickets.findAll();  // Encontra todos os tickets
                const idsEntidades = TicketsEncontrados.map(entidade => entidade.id_entidade);  // Mapeia os ids das entidades

                if (idsEntidades.length > 0) {
                    whereCondition.id = { [Op.in]: idsEntidades };  // Filtra as entidades com esses ids
                }
            }
            else if (ticket === '0') {
                // Quando o ticket é "0", busca as entidades que NÃO estão associadas a nenhum ticket
                const TicketsEncontrados = await tickets.findAll({
                    attributes: ['id_entidade'],
                    where: { id_entidade: { [Op.ne]: null } }, // Filtra as entidades com tickets não nulos
                });

                const idsEntidadesComTicket = TicketsEncontrados.map(entidade => entidade.id_entidade);

                // Filtra as entidades que NÃO estão nesses ids
                whereCondition.id = {
                    [Op.notIn]: idsEntidadesComTicket
                };
            }
        }

        var modulosg = req.query.modulo;

        if (!Array.isArray(modulosg)) {
            modulosg = modulosg ? [modulosg] : [];
        }

        // Se "nenhum" for selecionado, filtra as entidades onde a coluna "modulos_contratados" é vazia
        if (modulosg.includes('nenhum')) {
            whereCondition.modulos_contratados = { [Op.eq]: '' };  // Filtra para colunas vazias
        } else if (modulosg.length > 0) {
            // Filtra as entidades com base nos módulos selecionados
            whereCondition[Op.or] = modulosg.map(id =>
                Sequelize.where(
                    Sequelize.fn('FIND_IN_SET', id, Sequelize.col('modulos_contratados')),
                    {
                        [Op.gt]: 0
                    }
                )
            );
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
                orderCondition = [['cidade', 'ASC'], ['estado', 'ASC']];
                break;
            case 'z_a':
                orderCondition = [['cidade', 'DESC'], ['estado', 'DESC']];
                break;
            default:
                orderCondition = [['id', 'DESC']];
                break;
        }

        // Consultando as entidades com os filtros e a paginação
        const result = await entidades.findAndCountAll({
            where: whereCondition,
            order: orderCondition,
            limit: limit,
            offset: offset
        });

        // Calculando o total de páginas para a navegação
        const totalEntidades = result.count;
        const totalPages = Math.ceil(totalEntidades / limit);

        // Renderizando a página com os dados encontrados
        res.render('public/entidades/entidades', {
            currentPage: page,
            totalPages: totalPages,
            entidades: result.rows,
            tickets: tickets_geral,
            tipos: tipo,
            versoes: versao_sis,
            modulos: modulo_geral,
            i: instalado,
            t: ticket,
            te: tipo_entidade,
            v: versao,
            m: modulosg,
            o: ordenar,
            e: exibir,
            dt_i: data_inicial,
            dt_f: data_final
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Erro ao trazer entidades',
            error: err.message
        });
    }
});

module.exports = Router;