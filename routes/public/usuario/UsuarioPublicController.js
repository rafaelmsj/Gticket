const express = require('express');
const Router = express.Router();

//Importando conexoes com tabelas
const usuarios = require('../../../database/usuarios');
const entidades = require('../../../database/entidades');
const tipos_entidade = require('../../../database/tipos_entidade');
const tipos_ticket = require('../../../database/tipos_ticket');
const prioridades = require('../../../database/prioridades');
const setores = require('../../../database/setores');
const tickets = require('../../../database/tickets');

const { Op } = require('sequelize');  // Importa o operador Op do Sequelize


Router.get('/usuario/:id', async (req, res) => {
    try {
        const id = req.params.id
        const page = parseInt(req.query.page) || 1; // Página atual (default: 1)
        const limit = 5;                           // Registros por página
        const offset = (page - 1) * limit;          // Calcula o deslocamento

        // Busca a entidade
        const UsuarioEncontrado = await usuarios.findOne({ where: { id: id } });

        // Se não encontrar a entidade, retorna erro
        if (!UsuarioEncontrado) {
            return res.status(404).json({ error: "Usúario não encontrado" });
        }

        // Buscar os dados relacionados em paralelo
        const [entidade, tipo, ticket, tipo_ticket, prioridade, setor, TicketTotal] = await Promise.all([
            entidades.findAll(),
            tipos_entidade.findAll(),
            tickets.findAndCountAll({
                where: {
                    [Op.or]: [
                        { responsavel: id }, // responsavel é igual ao id
                        { auxiliares: { [Op.like]: `%,${id},%` } }, // Verifica se o id está entre os ids na string (com vírgulas)
                        { auxiliares: { [Op.like]: `${id},%` } },   // Verifica se o id é o primeiro na lista
                        { auxiliares: { [Op.like]: `%,${id}` } },   // Verifica se o id é o último na lista
                        { auxiliares: id }                          // Verifica se o id é o único valor na lista
                    ]
                }, order: [['id', 'DESC']], limit: limit, offset: offset
            }),
            tipos_ticket.findAll(),
            prioridades.findAll(),
            setores.findOne({ where: { id: UsuarioEncontrado.setor } }),
            tickets.findAll()
        ]);

        const totalPages = Math.ceil(ticket.count / limit);

        // Renderiza a página com os dados
        res.status(200).render('public/usuarios/usuario', {
            usuario: UsuarioEncontrado,
            entidades: entidade || null,
            tipos: tipo || null,
            Tickets: ticket.rows || [],
            tipos_ticket: tipo_ticket || null,
            prioridades: prioridade || [],
            currentPage: page,
            totalPages: totalPages,
            setor: setor,
            TicketTotal: TicketTotal
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor',
            error: err.message
        });
    }
})

Router.get('/usuarios', async (req, res) => {
    try {
        // Importando filtros da query string
        const { setor, ticket, ordenar, search, exibir, data_inicial, data_final } = req.query;

        // Pegando a página da query string, com valor padrão 1 caso não seja fornecido
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(exibir, 10) || 10;  // Convertendo `exibir` para número inteiro
        const offset = (page - 1) * limit; // Calcula o deslocamento para a consulta

        // Pegando dados do usuário e grupo (caso necessário)
        const idUsuario = req.session.usuarioId;
        const idGrupo = req.session.grupo;

        // Trazendo as tabelas que são usadas para os filtros
        const [tickets_geral, tipo, setorG] = await Promise.all([
            tickets.findAll({ where: { status_geral: { [Op.notLike]: 'finalizado' } } }),
            tipos_entidade.findAll(),
            setores.findAll()
        ]);


        // Filtros dinâmicos - base para consulta
        const whereCondition = { id: { [Op.notLike]: 1 } };

        // Filtro de pesquisa (search) - exemplo: busca pela cidade
        if (search && search.trim() !== "") {
            whereCondition.nome = { [Op.like]: `%${search}%` };
        }

        // Filtro para "Tipo de Entidade" - Aceita múltiplos valores (checkbox)
        if (setor) {
            const setorSelecionados = Array.isArray(setor) ? setor : [setor];
            whereCondition.setor = { [Op.in]: setorSelecionados };
        }

        // Filtro para "Usuário" - Aceita valores filtrados
        if (ticket) {
            if (ticket === '1') {
                // Quando o ticket é "1", busca os usuários que estão associados a algum ticket (responsável ou auxiliar)
                const TicketsEncontrados = await tickets.findAll();  // Encontra todos os tickets

                // Filtra os usuários que estão associados a algum ticket (responsável ou auxiliar)
                const idsUsuariosComTicket = TicketsEncontrados.reduce((acc, ticket) => {
                    // Verifica se o usuário é o responsável
                    if (ticket.responsavel) {
                        acc.push(ticket.responsavel);  // Adiciona o responsável
                    }

                    // Verifica se o usuário está na lista de auxiliares
                    const auxiliaresArray = ticket.auxiliares.split(',').map(aux => aux.trim());
                    auxiliaresArray.forEach(aux => {
                        if (aux) acc.push(aux);  // Adiciona cada auxiliar encontrado
                    });

                    return acc;
                }, []);

                // Remove IDs duplicados
                const uniqueIdsUsuariosComTicket = [...new Set(idsUsuariosComTicket)];

                // Verifica se algum usuário foi encontrado
                if (uniqueIdsUsuariosComTicket.length > 0) {
                    whereCondition.id = { [Op.in]: uniqueIdsUsuariosComTicket };  // Filtra os usuários associados aos tickets
                }
            }
            else if (ticket === '0') {
                // Quando o ticket é "0", busca os usuários que NÃO estão associados a nenhum ticket (nem como responsável, nem como auxiliar)
                const TicketsEncontrados = await tickets.findAll({
                    attributes: ['responsavel', 'auxiliares'],  // Pegando apenas os campos necessários
                });

                const idsUsuariosComTicket = TicketsEncontrados.reduce((acc, ticket) => {
                    // Verifica se o ticket tem algum responsável ou auxiliares
                    if (ticket.responsavel) {
                        acc.push(ticket.responsavel);  // Adiciona o responsável
                    }
                    const auxiliaresArray = ticket.auxiliares.split(',').map(aux => aux.trim());
                    auxiliaresArray.forEach(aux => {
                        if (aux) acc.push(aux);  // Adiciona cada auxiliar encontrado
                    });
                    return acc;
                }, []);

                // Remove IDs duplicados
                const uniqueIdsUsuariosComTicket = [...new Set(idsUsuariosComTicket)];

                // Filtra os usuários que NÃO estão nesses ids
                whereCondition.id = {
                    [Op.notIn]: uniqueIdsUsuariosComTicket
                };
            }
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
                orderCondition = [['nome', 'ASC']];
                break;
            case 'z_a':
                orderCondition = [['nome', 'DESC']];
                break;
            default:
                orderCondition = [['id', 'DESC']];
                break;
        }

        // Consultando as entidades com os filtros e a paginação
        const result = await usuarios.findAndCountAll({
            where: whereCondition,
            order: orderCondition,
            limit: limit,
            offset: offset
        });

        const totalPages = Math.ceil(result.count / limit);

        // Renderizando a página com os dados encontrados
        res.status(200).render('public/usuarios/usuarios', {
            currentPage: page,
            totalPages: totalPages,
            usuarios: result.rows,
            tickets: tickets_geral,
            tipos: tipo,
            setores: setorG,
            t: ticket,
            se: setor,
            o: ordenar,
            e: exibir,
            dt_i: data_inicial,
            dt_f: data_final
        });

    } catch (err) {
        // Caso ocorra algum erro, mostrando mensagem e log
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor.',
            error: err.message
        });
    }
});


module.exports = Router;