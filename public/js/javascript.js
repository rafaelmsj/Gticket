
document.addEventListener("DOMContentLoaded", function() {
    function setupFiltro(grupoName) {
        const checkboxes = document.querySelectorAll(`input[name="${grupoName}"]`);
        const checkboxTodos = Array.from(checkboxes).find(cb => cb.value === "");

        checkboxes.forEach(cb => {
            cb.addEventListener("click", () => {
                if (cb.value === "") {
                    // Se clicou em "Todos", desmarca os outros
                    checkboxes.forEach(outro => {
                        if (outro !== cb) {
                            outro.checked = false;
                        }
                    });
                } else {
                    // Se clicou em qualquer um diferente de "Todos"
                    if (cb.checked && checkboxTodos) {
                        checkboxTodos.checked = false;
                    }

                    // Se nenhum outro estiver marcado, marca "Todos"
                    const algumMarcado = Array.from(checkboxes).some(c => c !== checkboxTodos && c.checked);
                    if (!algumMarcado && checkboxTodos) {
                        checkboxTodos.checked = true;
                    }
                }
            });
        });
    }

    setupFiltro("tipo_entidade");
    setupFiltro("versao");
    setupFiltro("modulo"); 
    setupFiltro("setor"); 
    setupFiltro("prioridade");
    setupFiltro("status_geral");
    setupFiltro("tipo_ticket");
});


function manterFiltrosNaURL(form) {
    const urlParams = new URLSearchParams(window.location.search);

    // Para cada parâmetro atual, criar inputs escondidos no form
    urlParams.forEach((value, key) => {
        // Evita duplicar os inputs que já estão no form
        if (!form.querySelector(`[name="${key}"]`)) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = value;
            form.appendChild(input);
        }
    });
}

// Aplicar isso em todos os formulários de filtro/ordenar/paginação
document.querySelectorAll("form").forEach(form => {
    form.addEventListener("submit", function () {
        manterFiltrosNaURL(form);
    });
});

// Também pode aplicar manualmente a qualquer link de paginação:
document.querySelectorAll(".pagination a").forEach(link => {
    link.addEventListener("click", function (e) {
        e.preventDefault();
        const urlParams = new URLSearchParams(window.location.search);
        const href = new URL(this.href);
        // Preserva todos os parâmetros da URL atual, mas atualiza o "page"
        href.searchParams.forEach((_, key) => href.searchParams.delete(key));
        urlParams.forEach((value, key) => href.searchParams.set(key, value));
        href.searchParams.set("page", this.href.split("page=")[1]);
        window.location.href = href.toString();
    });
});


// Seleção dos botões (divs) e do card
const sobreBtn = document.getElementById('sobreBtn');
const CardSobre = document.getElementById('CardSobre');
const ticketsBtn = document.getElementById('ticketsBtn');
const ticketsCard = document.getElementById('ticketsCard');

// Função para remover a seleção (borda inferior) de todos os botões
function removerSelecao() {
    sobreBtn.classList.remove('btn-selecao');
    ticketsBtn.classList.remove('btn-selecao');
}

// Função para adicionar a seleção (borda inferior) ao botão clicado
function selecionarBotao(btn) {
    removerSelecao();  // Remove a borda de todos os botões
    btn.classList.add('btn-selecao');  // Adiciona a borda ao botão selecionado
}

// Event listeners para quando os botões são clicados
sobreBtn.addEventListener('click', function (){
    ticketsCard.style.display = 'none'
    CardSobre.style.display = 'block'
    selecionarBotao(sobreBtn)
});
ticketsBtn.addEventListener('click', function(){
    CardSobre.style.display = 'none'
    ticketsCard.style.display = 'block'
    selecionarBotao(ticketsBtn)
});

window.addEventListener('load', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page'); // Obtém o valor da query "page"

    if (window.location.pathname.startsWith('/entidade/') || 
        window.location.pathname.startsWith('/ticket/') ||
        window.location.pathname.startsWith('/usuario/')){
        // Se a URL contiver a query "page", faça algo diferente
        if (page) {
            
            ticketsCard.style.display = 'block'; 
            CardSobre.style.display = 'none';
            selecionarBotao(ticketsBtn);
        } else {
            ticketsCard.style.display = 'none';
            CardSobre.style.display = 'block';
            selecionarBotao(sobreBtn);
        }

    }
});

//exibi div com os botoes de alterar/deletar/visualizar...
function carregaBtns(id){
    var divbotoes = document.getElementById(`botoes-${id}`)

    if (divbotoes.style.display == 'none'){
        divbotoes.style.display = 'block'
    }
    else {
        divbotoes.style.display = 'none'
    }

}
