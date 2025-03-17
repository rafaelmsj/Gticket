
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
                erros[index].style.display = "block";
                valido = false; // Indica que há erro
            } else {
                erros[index].style.display = "none"; // Esconde a mensagem de erro se o campo for preenchido
            }

        });
            if (valido){
                form.submit();
            }
        
    }

    function visualizaSenha() {
        var inputs = document.querySelectorAll('.camposenha');
        var visualizadores = document.querySelectorAll('.visualizaSenha');
    
        // Verificando se o número de inputs e visualizadores são iguais
        if (inputs.length !== visualizadores.length) {
            console.error('O número de inputs e visualizadores não é o mesmo.');
            return;
        }
    
        visualizadores.forEach(function(visualizador, index) {
            // Evento de clique para mostrar ou ocultar a senha
            visualizador.addEventListener('click', function() {
                if (inputs[index].type === 'password') {
                    inputs[index].type = 'text';
                } else {
                    inputs[index].type = 'password';
                }
            });
    
            // Alterando o cursor para pointer ao passar o mouse sobre o ícone
            visualizador.addEventListener('mouseenter', function() {
                visualizador.style.cursor = 'pointer';
            });
        });
    }
    
    function updateCheckboxValue(checkbox) {
        // Se o checkbox for marcado, o valor é 1, caso contrário, 0
        checkbox.value = checkbox.checked ? '1' : '0';
    }
    
}



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

//FUNCAO DE ALTERACAO DE SENHA DO USUARIO
function atualizasenha() {

    
    var senhaAntiga = document.getElementById('senhaAntiga').value.trim();
    var novaSenha = document.getElementById('novaSenha').value.trim();
    var confirmarNovaSenha = document.getElementById('confirmarNovaSenha').value.trim();
    var erros = document.querySelectorAll(".msg_erro"); // Mensagens de erro
    var alerta = document.getElementById('alertaerro')

    var valido = true;

    // Limpar as mensagens de erro
    erros.forEach(function(erro) {
        erro.style.display = 'none';
    });

    // Verificar se a senha antiga foi preenchida
    if (senhaAntiga === "") {
        erros[0].style.display = 'block';
        valido = false;
    }

    // Verificar se a nova senha foi preenchida
    if (novaSenha === "") {
        erros[1].style.display = 'block';
        valido = false;
    }

    // Verificar se a confirmação da nova senha foi preenchida
    if (confirmarNovaSenha === "") {
        erros[2].style.display = 'block';
        valido = false;
    }

    // Se todas as validações passarem, enviar o formulário
    if (valido) {
        // Fazer o envio dos dados via fetch
        fetch('/alterar_password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                senhaAntiga: senhaAntiga,
                novaSenha: novaSenha,
                confirmarNovaSenha: confirmarNovaSenha
            })
        })
        .then(response => response.json())
        .then(data => {
            // Se a resposta for sucesso, redirecionar ou exibir sucesso
            if (data.success) {
                alerta.style.display = 'none'
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block';
                alerta.innerHTML = 'Senha alterada com sucesso!';
                alerta.focus();
                
                setTimeout(function() {
                    alerta.style.display = 'none';
                    alerta.classList.remove('alert', 'alert-success')
                    window.location.href = '/admin'; // Redireciona para uma página de sucesso
                }, 3000); 
                
            } else {
                alerta.style.display = 'none'
                alerta.classList.add('alert', 'alert-danger')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message;
                alerta.focus();
                
                setTimeout(function() {
                    alerta.style.display = 'none';
                    alerta.classList.remove('alert', 'alert-danger')
                }, 3000); 
                
            }
        })
        .catch(error => {
            console.error('Erro ao alterar senha:', error);
        });
    }
}

function cadastrarUsuario(){
    var nome = document.getElementsByName('nome')[0].value
    var setor = document.getElementsByName('setor')[0].value
    var usuario = document.getElementsByName('usuario')[0].value
    var grupo = document.getElementsByName('grupo')[0].value
    var senha = document.getElementsByName('senha')[0].value
    var confirmar_senha = document.getElementsByName('confirmar_senha')[0].value
    var perm_usuarios = document.getElementsByName('perm_usuarios')[0].checked ? '1' : '0';
    var perm_grupoUsuarios = document.getElementsByName('perm_grupoUsuarios')[0].checked ? '1' : '0';
    var inputs = document.querySelectorAll('.inputs')
    var msg_erro = document.querySelectorAll('.msg_erro')
    var alerta = document.getElementById('alertaerro')
    var valido = true

    for(let i = 0; i < inputs.length; i++){
        msg_erro[i].style.display = 'none';
        if(inputs[i].value == ''){
            msg_erro[i].style.display = 'block';
            valido = false
        }
    }

    if (valido){
        
        // Fazer o envio dos dados via fetch
        fetch('/salvar_usuarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Definindo o tipo para JSON
            },
            body: JSON.stringify({
                nome: nome,
                usuario: usuario,
                grupo: grupo,
                setor: setor,
                senha: senha,
                confirmar_senha: confirmar_senha,
                perm_grupoUsuarios: perm_grupoUsuarios,
                perm_usuarios: perm_usuarios
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alerta.style.display = 'none'
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block'
                alerta.innerHTML = 'Usúario cadastrado com sucesso!'
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert', 'alert-success');
                    alerta.style.display = 'none'
                    window.location.href = '/listar_usuarios';s
                }, 1000);
                
            }
            else{
                alerta.style.display = 'none'
                alerta.classList.add('alert', 'alert-danger')
                alerta.style.display = 'block'
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.style.display = 'none';
                    alerta.classList.remove('alert', 'alert-danger')
                }, 2000);
            }
        })

    }



}

function updateUsuario(){
    var setor = document.getElementsByName('setor')[0].value
    var grupo = document.getElementsByName('grupo')[0].value
    var id = document.getElementsByName('id')[0].value
    var perm_usuarios = document.getElementsByName('perm_usuarios')[0].checked ? '1' : '0';
    var perm_grupoUsuarios = document.getElementsByName('perm_grupoUsuarios')[0].checked ? '1' : '0';
    var inputs = document.querySelectorAll('.inputs')
    var msg_erro = document.querySelectorAll('.msg_erro')
    var alerta = document.getElementById('alertaerro')
    var valido = true

    for(let i = 0; i < inputs.length; i++){
        msg_erro[i].style.display = 'none';
        if(inputs[i].value == ''){
            msg_erro[i].style.display = 'block';
            valido = false
        }
    }

    if (valido){
        
        // Fazer o envio dos dados via fetch
        fetch('/update_usuarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Definindo o tipo para JSON
            },
            body: JSON.stringify({
                grupo: grupo,
                setor: setor,
                perm_grupoUsuarios: perm_grupoUsuarios,
                perm_usuarios: perm_usuarios,
                id: id
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alerta.style.display = 'none'
                alerta.classList.remove('alert','alert-danger');
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-success');
                    alerta.style.display = 'none';
                    window.location.href = '/listar_usuarios'
                },1000);
            }
            else {
                alerta.style.display = 'none'
                alerta.classList.remove('alert', 'alert-success')
                alerta.classList.add('alert','alert-danger')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-danger');
                    alerta.style.display = 'none';
                    
                },2000)
            }
        })

    }



}

function cadastrarModulo(){
    var modulo = document.getElementsByName('modulo')[0].value
    var inputs = document.querySelectorAll('.inputs')
    var msg_erro = document.querySelectorAll('.msg_erro')
    var alerta = document.getElementById('alertaerro')
    var valido = true

    for(let i = 0; i < inputs.length; i++){
        msg_erro[i].style.display = 'none';
        if(inputs[i].value == ''){
            msg_erro[i].style.display = 'block';
            valido = false
        }
    }

    if(valido){

        fetch('/salvar_modulos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                modulo: modulo
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alerta.style.display = 'none'
                alerta.classList.remove('alert','alert-danger');
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-success');
                    alerta.style.display = 'none';
                    window.location.href = '/listar_modulos'
                },1000);
            }
            else {
                alerta.style.display = 'none'
                alerta.classList.remove('alert', 'alert-success')
                alerta.classList.add('alert','alert-danger')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-danger');
                    alerta.style.display = 'none';
                    
                },2000)
            }
        })

    }

}

function updateModulos(){
    var modulo = document.getElementsByName('modulo')[0].value
    var id = document.getElementsByName('id')[0].value
    var inputs = document.querySelectorAll('.inputs')
    var msg_erro = document.querySelectorAll('.msg_erro')
    var alerta = document.getElementById('alertaerro')
    var valido = true

    for(let i = 0; i < inputs.length; i++){
        msg_erro[i].style.display = 'none';
        if(inputs[i].value == ''){
            msg_erro[i].style.display = 'block';
            valido = false
        }
    }

    if(valido){

        fetch('/update_modulos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                modulo: modulo,
                id: id
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alerta.style.display = 'none'
                alerta.classList.remove('alert','alert-danger');
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-success');
                    alerta.style.display = 'none';
                    window.location.href = '/listar_modulos'
                },1000);
            }
            else {
                alerta.style.display = 'none'
                alerta.classList.remove('alert', 'alert-success')
                alerta.classList.add('alert','alert-danger')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-danger');
                    alerta.style.display = 'none';
                    
                },2000)
            }
        })

    }
}

function cadastrarConcorrentes(){
        var concorrente = document.getElementsByName('concorrente')[0].value
        var inputs = document.querySelectorAll('.inputs')
        var msg_erro = document.querySelectorAll('.msg_erro')
        var alerta = document.getElementById('alertaerro')
        var valido = true

        for(let i = 0; i < inputs.length; i++){
            msg_erro[i].style.display = 'none';
            if(inputs[i].value == ''){
                msg_erro[i].style.display = 'block';
                valido = false
            }
        }
    
        if(valido){

            fetch('/salvar_concorrentes',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    concorrente: concorrente
                })
            })
            .then(response => response.json())
            .then(data => {
                if(data.success){
                    alerta.style.display = 'none'
                    alerta.classList.remove('alert','alert-danger');
                    alerta.classList.add('alert', 'alert-success')
                    alerta.style.display = 'block';
                    alerta.innerHTML = data.message
                    alerta.focus()
    
                    setTimeout(function(){
                        alerta.classList.remove('alert','alert-success');
                        alerta.style.display = 'none';
                        window.location.href = '/listar_concorrentes'
                    },1000);
                }
                else {
                    alerta.style.display = 'none'
                    alerta.classList.remove('alert', 'alert-success')
                    alerta.classList.add('alert','alert-danger')
                    alerta.style.display = 'block';
                    alerta.innerHTML = data.message
                    alerta.focus()
    
                    setTimeout(function(){
                        alerta.classList.remove('alert','alert-danger');
                        alerta.style.display = 'none';
                        
                    },2000)
                }
            })

        }
}

function updateConcorrentes(){
    var concorrente = document.getElementsByName('concorrente')[0].value
    var id = document.getElementsByName('id')[0].value
    var inputs = document.querySelectorAll('.inputs')
    var msg_erro = document.querySelectorAll('.msg_erro')
    var alerta = document.getElementById('alertaerro')
    var valido = true

    for(let i = 0; i < inputs.length; i++){
        msg_erro[i].style.display = 'none';
        if(inputs[i].value === ''){
            msg_erro[i].style.display = 'block'
            valido = false
        }
    }

    if(valido){

        fetch('/update_concorrentes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                concorrente: concorrente,
                id: id
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alerta.style.display = 'none'
                alerta.classList.remove('alert','alert-danger');
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-success');
                    alerta.style.display = 'none';
                    window.location.href = '/listar_concorrentes'
                },1000);
            }
            else {
                alerta.style.display = 'none'
                alerta.classList.remove('alert', 'alert-success')
                alerta.classList.add('alert','alert-danger')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-danger');
                    alerta.style.display = 'none';
                    
                },2000)
            }
        })

    }

}

function cadastrarVersao(){
    var versaosis = document.getElementsByName('versaosis')[0].value
    var inputs = document.querySelectorAll('.inputs')
    var msg_erro = document.querySelectorAll('.msg_erro')
    var alerta = document.getElementById('alertaerro')
    var valido = true

    for(let i = 0; i < inputs.length; i++){
        msg_erro[i].style.display = 'none';
        if(inputs[i].value == ''){
            msg_erro[i].style.display = 'block';
            valido = false
        }
    }

    if(valido){

        fetch('/salvarversao',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                versaosis: versaosis
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alerta.style.display = 'none'
                alerta.classList.remove('alert','alert-danger');
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-success');
                    alerta.style.display = 'none';
                    window.location.href = '/listar_versaosis'
                },1000);
            }
            else {
                alerta.style.display = 'none'
                alerta.classList.remove('alert', 'alert-success')
                alerta.classList.add('alert','alert-danger')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-danger');
                    alerta.style.display = 'none';
                    
                },2000)
            }
        })

    }

}

function updateVersao(){
    var versaosis = document.getElementsByName('versaosis')[0].value
    var id = document.getElementsByName('id')[0].value
    var inputs = document.querySelectorAll('.inputs')
    var msg_erro = document.querySelectorAll('.msg_erro')
    var alerta = document.getElementById('alertaerro')
    var valido = true

    for(let i = 0; i < inputs.length; i++){
        msg_erro[i].style.display = 'none';
        if(inputs[i].value == ''){
            msg_erro[i].style.display = 'block';
            valido = false
        }
    }

    if(valido){

        fetch('/update_versao', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                versaosis: versaosis,
                id: id
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alerta.style.display = 'none'
                alerta.classList.remove('alert','alert-danger');
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-success');
                    alerta.style.display = 'none';
                    window.location.href = '/listar_versaosis'
                },2000);
            }
            else {
                alerta.style.display = 'none'
                alerta.classList.remove('alert', 'alert-success')
                alerta.classList.add('alert','alert-danger')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-danger');
                    alerta.style.display = 'none';
                    
                },1000)
            }
        })

    }
}

function cadastrarSetor(){
    var setor = document.getElementsByName('setor')[0].value
    var sigla = document.getElementsByName('sigla')[0].value
    var inputs = document.querySelectorAll('.inputs')
    var msg_erro = document.querySelectorAll('.msg_erro')
    var alerta = document.getElementById('alertaerro')
    var valido = true

    for(let i = 0; i < inputs.length; i++){
        msg_erro[i].style.display = 'none';
        if(inputs[i].value == ''){
            msg_erro[i].style.display = 'block';
            valido = false
        }
    }

    if(valido){

        fetch('/salvarsetor',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                setor: setor,
                sigla: sigla
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alerta.style.display = 'none'
                alerta.classList.remove('alert','alert-danger');
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-success');
                    alerta.style.display = 'none';
                    window.location.href = '/listar_setor'
                },2000);
            }
            else {
                alerta.style.display = 'none'
                alerta.classList.remove('alert', 'alert-success')
                alerta.classList.add('alert','alert-danger')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-danger');
                    alerta.style.display = 'none';
                    
                },1000)
            }
        })

    }

}

function updateSetor(){
    var setor = document.getElementsByName('setor')[0].value
    var sigla = document.getElementsByName('sigla')[0].value
    var id = document.getElementsByName('id')[0].value
    var inputs = document.querySelectorAll('.inputs')
    var msg_erro = document.querySelectorAll('.msg_erro')
    var alerta = document.getElementById('alertaerro')
    var valido = true

    for(let i = 0; i < inputs.length; i++){
        msg_erro[i].style.display = 'none';
        if(inputs[i].value == ''){
            msg_erro[i].style.display = 'block';
            valido = false
        }
    }

    if(valido){

        fetch('/update_setor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                setor: setor,
                sigla: sigla,
                id: id
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alerta.style.display = 'none'
                alerta.classList.remove('alert','alert-danger');
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-success');
                    alerta.style.display = 'none';
                    window.location.href = '/listar_setor'
                },1000);
            }
            else {
                alerta.style.display = 'none'
                alerta.classList.remove('alert', 'alert-success')
                alerta.classList.add('alert','alert-danger')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-danger');
                    alerta.style.display = 'none';
                    
                },2000)
            }
        })

    }
}

function cadastrarTipodeEntidade(){
    var tipo_entidade = document.getElementsByName('tipo_entidade')[0].value
    var inputs = document.querySelectorAll('.inputs')
    var msg_erro = document.querySelectorAll('.msg_erro')
    var alerta = document.getElementById('alertaerro')
    var valido = true

    for(let i = 0; i < inputs.length; i++){
        msg_erro[i].style.display = 'none';
        if(inputs[i].value == ''){
            msg_erro[i].style.display = 'block';
            valido = false
        }
    }

    if(valido){

        fetch('/salvar_tipos_entidade',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo_entidade: tipo_entidade
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alerta.style.display = 'none'
                alerta.classList.remove('alert','alert-danger');
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-success');
                    alerta.style.display = 'none';
                    window.location.href = '/listar_tipos_entidade'
                },1000);
            }
            else {
                alerta.style.display = 'none'
                alerta.classList.remove('alert', 'alert-success')
                alerta.classList.add('alert','alert-danger')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-danger');
                    alerta.style.display = 'none';
                    
                },2000)
            }
        })

    }

}

function updateTipodeEntidade(){
    var tipo_entidade = document.getElementsByName('tipo_entidade')[0].value
    var id = document.getElementsByName('id')[0].value
    var inputs = document.querySelectorAll('.inputs')
    var msg_erro = document.querySelectorAll('.msg_erro')
    var alerta = document.getElementById('alertaerro')
    var valido = true

    for(let i = 0; i < inputs.length; i++){
        msg_erro[i].style.display = 'none';
        if(inputs[i].value == ''){
            msg_erro[i].style.display = 'block';
            valido = false
        }
    }

    if(valido){

        fetch('/update_tipo_entidade', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo_entidade: tipo_entidade,
                id: id
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alerta.style.display = 'none'
                alerta.classList.remove('alert','alert-danger');
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-success');
                    alerta.style.display = 'none';
                    window.location.href = '/listar_tipos_entidade'
                },1000);
            }
            else {
                alerta.style.display = 'none'
                alerta.classList.remove('alert', 'alert-success')
                alerta.classList.add('alert','alert-danger')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-danger');
                    alerta.style.display = 'none';
                    
                },2000)
            }
        })

    }
}

function cadastrarGrupodeUsuarios(){
    var gruposusuario = document.getElementsByName('gruposusuario')[0].value
    var inserir = document.getElementsByName('inserir')[0].checked ? '1' : '0';
    var alterar = document.getElementsByName('alterar')[0].checked ? '1' : '0';
    var deletar = document.getElementsByName('deletar')[0].checked ? '1' : '0';
    var inputs = document.querySelectorAll('.inputs')
    var msg_erro = document.querySelectorAll('.msg_erro')
    var alerta = document.getElementById('alertaerro')
    var valido = true

    for(let i = 0; i < inputs.length; i++){
        msg_erro[i].style.display = 'none';
        if(inputs[i].value == ''){
            msg_erro[i].style.display = 'block';
            valido = false
        }
    }

    if(valido){

        fetch('/salvar_grupos_de_usuarios',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gruposusuario: gruposusuario,
                inserir: inserir,
                alterar: alterar,
                deletar: deletar
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alerta.style.display = 'none'
                alerta.classList.remove('alert','alert-danger');
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-success');
                    alerta.style.display = 'none';
                    window.location.href = '/listar_grupos_de_usuarios'
                },1000);
            }
            else {
                alerta.style.display = 'none'
                alerta.classList.remove('alert', 'alert-success')
                alerta.classList.add('alert','alert-danger')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-danger');
                    alerta.style.display = 'none';
                    
                },2000)
            }
        })

    }

}

function updateGrupodeUsuarios(){
    var gruposusuario = document.getElementsByName('gruposusuario')[0].value
    var inserir = document.getElementsByName('inserir')[0].checked ? '1' : '0';
    var alterar = document.getElementsByName('alterar')[0].checked ? '1' : '0';
    var deletar = document.getElementsByName('deletar')[0].checked ? '1' : '0';
    var id = document.getElementsByName('id')[0].value
    var inputs = document.querySelectorAll('.inputs')
    var msg_erro = document.querySelectorAll('.msg_erro')
    var alerta = document.getElementById('alertaerro')
    var valido = true

    for(let i = 0; i < inputs.length; i++){
        msg_erro[i].style.display = 'none';
        if(inputs[i].value == ''){
            msg_erro[i].style.display = 'block';
            valido = false
        }
    }

    if(valido){

        fetch('/update_grupos_de_usuarios',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gruposusuario: gruposusuario,
                inserir: inserir || 0,
                alterar: alterar || 0,
                deletar: deletar || 0,
                id: id
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alerta.style.display = 'none'
                alerta.classList.remove('alert','alert-danger');
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-success');
                    alerta.style.display = 'none';
                    window.location.href = '/listar_grupos_de_usuarios'
                },1000);
            }
            else {
                alerta.style.display = 'none'
                alerta.classList.remove('alert', 'alert-success')
                alerta.classList.add('alert','alert-danger')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-danger');
                    alerta.style.display = 'none';
                    
                },2000)
            }
        })

    }

}

function cadastrarEntidade(){
    var tipo_entidade = document.getElementsByName('tipo_entidade')[0].value
    var estado = document.getElementsByName('estado')[0].value
    var cidade = document.getElementsByName('cidade')[0].value
    var versao_sistema = document.getElementsByName('versao_sistema')[0].value
    var website_concorrente = document.getElementsByName('website_concorrente')[0].value
    var sistema_concorrente = document.getElementsByName('sistema_concorrente')[0].value
    var inputs = document.querySelectorAll('.inputs')
    var msg_erro = document.querySelectorAll('.msg_erro')
    var alerta = document.getElementById('alertaerro')
    var valido = true

    const modulos_contratados_select = document.getElementsByName('modulos_contratados')[0];
    const modulos_contratados = Array.from(modulos_contratados_select.selectedOptions).map(option => option.value);


    for(let i = 0; i < inputs.length; i++){
        msg_erro[i].style.display = 'none';
        if(inputs[i].value == ''){
            msg_erro[i].style.display = 'block';
            valido = false
        }
    }

    if(valido){

        fetch('/salvar_entidades',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo_entidade: tipo_entidade,
                estado: estado,
                cidade: cidade,
                modulos_contratados: modulos_contratados,
                versao_sistema: versao_sistema,
                website_concorrente: website_concorrente,
                sistema_concorrente: sistema_concorrente,
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alerta.style.display = 'none'
                alerta.classList.remove('alert','alert-danger');
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-success');
                    alerta.style.display = 'none';
                    window.location.href = '/listar_entidades'
                },1000);
            }
            else {
                alerta.style.display = 'none'
                alerta.classList.remove('alert', 'alert-success')
                alerta.classList.add('alert','alert-danger')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-danger');
                    alerta.style.display = 'none';
                    
                },2000)
            }
        })

    }

}

function updateEntidade(){
    var versao_sistema = document.getElementsByName('versao_sistema')[0].value
    var website_concorrente = document.getElementsByName('website_concorrente')[0].value
    var sistema_concorrente = document.getElementsByName('sistema_concorrente')[0].value
    var id = document.getElementsByName('id')[0].value
    var inputs = document.querySelectorAll('.inputs')
    var msg_erro = document.querySelectorAll('.msg_erro')
    var alerta = document.getElementById('alertaerro')
    var valido = true

    const modulos_contratados_select = document.getElementsByName('modulos_contratados')[0];
    const modulos_contratados = Array.from(modulos_contratados_select.selectedOptions).map(option => option.value);


    for(let i = 0; i < inputs.length; i++){
        msg_erro[i].style.display = 'none';
        if(inputs[i].value == ''){
            msg_erro[i].style.display = 'block';
            valido = false
        }
    }

    if(valido){

        fetch('/update_entidade',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                modulos_contratados: modulos_contratados,
                versao_sistema: versao_sistema,
                website_concorrente: website_concorrente,
                sistema_concorrente: sistema_concorrente,
                id: id
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alerta.style.display = 'none'
                alerta.classList.remove('alert','alert-danger');
                alerta.classList.add('alert', 'alert-success')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-success');
                    alerta.style.display = 'none';
                    window.location.href = '/listar_entidades'
                },1000);
            }
            else {
                alerta.style.display = 'none'
                alerta.classList.remove('alert', 'alert-success')
                alerta.classList.add('alert','alert-danger')
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.classList.remove('alert','alert-danger');
                    alerta.style.display = 'none';
                    
                },2000)
            }
        })

    }

}

function login(){
    var usuario = document.getElementsByName('usuario')[0].value
    var senha = document.getElementsByName('senha')[0].value
    var alerta = document.getElementById('alertaerro')


        fetch('/login',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuario: usuario,
                senha: senha,
                
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alerta.style.display = 'none'
                alerta.style.color = 'green'
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.style.display = 'none';
                    window.location.href = '/admin'
                },500);
            }
            else {
                alerta.style.display = 'none'
                alerta.style.color = 'red'
                alerta.style.display = 'block';
                alerta.innerHTML = data.message
                alerta.focus()

                setTimeout(function(){
                    alerta.style.display = 'none';                    
                },2000)
            }
        })

}

function acessaPGgrupoUsuario() {
   
    const alerta = document.getElementById('alertaerro');

    fetch('/listar_grupos_de_usuarios', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    })
    .then(response => response.json())
    .then(data => {
        if(!data.success){
            // Se a resposta for um erro, exibe um alerta de erro
            alerta.style.display = 'none';
            alerta.classList.remove('alert', 'alert-success');
            alerta.classList.add('alert', 'alert-danger');
            alerta.style.display = 'block';
            alerta.innerHTML = data.message;
            alerta.focus();

            setTimeout(function(){
                alerta.classList.remove('alert', 'alert-danger');
                alerta.style.display = 'none';
            }, 3000);
        }
    })
    .catch(error => {
        window.location.href = '/listar_grupos_de_usuarios'
    });
}

function acessaPGUsuario() {
   
    const alerta = document.getElementById('alertaerro');

    fetch('/listar_usuarios', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    })
    .then(response => response.json())
    .then(data => {
        if(!data.success){
            // Se a resposta for um erro, exibe um alerta de erro
            alerta.style.display = 'none';
            alerta.classList.remove('alert', 'alert-success');
            alerta.classList.add('alert', 'alert-danger');
            alerta.style.display = 'block';
            alerta.innerHTML = data.message;
            alerta.focus();

            setTimeout(function(){
                alerta.classList.remove('alert', 'alert-danger');
                alerta.style.display = 'none';
            }, 3000);
        }
    })
    .catch(error => {
        window.location.href = '/listar_usuarios'
    });
}
