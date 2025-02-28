
//FUNCOES DE APOIO
{
    //so insere no banco se campos nao for nulo
    function conferenull() {
        var inputs = document.querySelectorAll(".inputs"); // Seleciona todos os campos de input
        var erros = document.querySelectorAll(".msg_erro"); // Seleciona todas as mensagens de erro
        var form = document.querySelector("form"); // Seleciona o formulário
        var valido = true; // Assume que o formulário está válido
    
        // Percorre todos os inputs para validar
        inputs.forEach((input, index) => {
            if (input.value.trim() === "") { 
                console.log('oi')
                erros[index].style.display = "block";
                valido = false; // Indica que há erro
            } else {
                erros[index].style.display = "none"; // Esconde a mensagem de erro se o campo for preenchido
            }
        });
    
        // Se todos os campos estiverem preenchidos, submete o formulário
        if (valido) {
            form.submit();
        }
    }
}



// Função que será chamada quando a página carregar
function habilitaDesabilitaBotoes() {
    // Obtendo os valores corretamente
    var valor_inserir = document.getElementById('valor_inserir').textContent.trim();

    var btn_inserir = document.getElementById('botao_inserir')
    // Verificando valores e ajustando visibilidade
    if (valor_inserir == '1') {
        btn_inserir.style.display = 'inline-block';
    } else if (valor_inserir == '0') {
        btn_inserir.style.display = 'none';
    }

}
document.addEventListener("DOMContentLoaded", habilitaDesabilitaBotoes);


//FUncoes de estado e cidade no cadastro de entidade
{
    async function carregarEstados() {
        const response = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados");
        const estados = await response.json();
        const selectEstado = document.getElementById("estado");
    
        estados.sort((a, b) => a.nome.localeCompare(b.nome)); // Ordenar estados por nome
        estados.forEach(estado => {
            const option = document.createElement("option");
            option.value = estado.sigla; // Define a sigla como valor
            option.textContent = estado.nome;
            selectEstado.appendChild(option);
        });
    }
    
    async function carregarCidades(estadoSigla) {
        if (!estadoSigla) return;
        
        // Buscar o estado pelo nome para obter o ID necessário para a API
        const responseEstados = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados");
        const estados = await responseEstados.json();
        const estado = estados.find(e => e.sigla === estadoSigla);
    
        if (!estado) return;
    
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado.id}/municipios`);
        const cidades = await response.json();
        const selectCidade = document.getElementById("cidade");
    
        selectCidade.innerHTML = '<option value="">Selecione uma cidade</option>';
        cidades.forEach(cidade => {
            const option = document.createElement("option");
            option.value = cidade.nome; // Define o nome como valor
            option.textContent = cidade.nome;
            selectCidade.appendChild(option);
        });
    
        selectCidade.disabled = false;
    }
    
    document.getElementById("estado").addEventListener("change", function () {
        const estadoSigla = this.value;
        document.getElementById("cidade").innerHTML = '<option value="">Carregando...</option>';
        document.getElementById("cidade").disabled = true;
        carregarCidades(estadoSigla);
    });
    
    carregarEstados();
}

//EXIBE BOTOES DAS FUNCOES ALTERAR E DELETAR
function carregaBtns(id){
    var divbotoes = document.getElementById(`botoes-${id}`)

    if (divbotoes.style.display == 'none'){
        divbotoes.style.display = 'block'
    }
    else {
        divbotoes.style.display = 'none'
    }
    
}

//FAZ A CONFIRMAÇÃO SE O USUARIO QUER DELETAR O REGISTRO E MANDA O FORM PARA A ROTA
function deletar(id){
    
    var form = document.querySelector("form"); // Seleciona o formulário
    var formid = document.getElementsByName('id')[0]
    
    // Exibe um alerta com 2 botões: OK e Cancelar
    const resposta = confirm("Você tem certeza que deseja deletar  esse registro?");

    
    if (resposta) {
        formid.value = id
        form.submit()
    } else {
    
    }

}

function verificarAutenticacao(req, res, next) {
    if (req.session.usuarioId) {
        return next();
    }
    res.redirect('/login');
}