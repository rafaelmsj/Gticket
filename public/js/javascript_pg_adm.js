//CK EDITOR
ClassicEditor
.create(document.querySelector('#observacao'))
.then(newEditor => {
    editor = newEditor;
})
.catch(error => {
    console.error(error);
});

$(document).ready(function() {
    // Inicializar Select2 para todos os selects com a classe 'camposBuscaPesquisa'
    $('.camposBuscaPesquisa').select2({
        allowClear: false
    });

    // Atualizar Select2 após carregamento dos estados
    carregarEstados().then(() => {
        $("#estado").select2();
    });

    // Atualizar Select2 após carregamento das cidades
    $("#estado").on("change", function() {
        const estadoSigla = this.value;
        $("#cidade").html('<option value="">Carregando...</option>').prop("disabled", true);
        carregarCidades(estadoSigla).then(() => {
            $("#cidade").select2();
        });
    });
});
//COLOCA CHECKED NOS CHECKBOX CONFORME O VALOR
function updateCheckboxValue(checkbox) {
    // Se o checkbox for marcado, o valor é 1, caso contrário, 0
    checkbox.value = checkbox.checked ? '1' : '0';
}



//API DO IBGE(ESTADOS E CIDADES) PARA CADASTRO DAS ENTIDADES
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
        
        const responseEstados = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados");
        const estados = await responseEstados.json();
        const estado = estados.find(e => e.sigla === estadoSigla);
    
        if (!estado) return;
    
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado.id}/municipios`);
        const cidades = await response.json();
        const selectCidade = $("#cidade"); // Usando jQuery para Select2
    
        selectCidade.html('<option value="">Selecione uma cidade</option>');
        cidades.forEach(cidade => {
            selectCidade.append(new Option(cidade.nome, cidade.nome));
        });
    
        selectCidade.prop("disabled", false); // Habilitar o select
        selectCidade.trigger("change"); // Atualizar Select2
    }

//FUNCOES RELACIONADAS A LOGIN
    //funcao para alterar senha do usuario
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
            fetch('/admin/alterar_password', {
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

    //funcao para efetuar o login
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

    //funcao de exibir senha dos campos password
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



//FUNCOES DE CADASTRO E UPDATE

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
            
            // Verifique se o campo é um Select2 (usando .select2() no jQuery)
            if ($(inputs[i]).hasClass('camposBuscaPesquisa')) {
                // Para Select2, verificar o valor do campo select
                if ($(inputs[i]).val() === null || $(inputs[i]).val() === "") {
                    msg_erro[i].style.display = 'block';
                    valido = false;
                }
            } else {
                // Para os outros campos, verifique o valor normalmente
                if (inputs[i].value === '') {
                    msg_erro[i].style.display = 'block';
                    valido = false;
                }
            }
        }

        if (valido){
            
            // Fazer o envio dos dados via fetch
            fetch('/admin/salvar_usuarios', {
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
                        window.location.href = '/admin/listar_usuarios';
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
            fetch('/admin/update_usuarios', {
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
                        window.location.href = '/admin/listar_usuarios'
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

            fetch('/admin/salvar_modulos', {
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
                        window.location.href = '/admin/listar_modulos'
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

            fetch('/admin/update_modulos', {
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
                        window.location.href = '/admin/listar_modulos'
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

                fetch('/admin/salvar_concorrentes',{
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
                            window.location.href = '/admin/listar_concorrentes'
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

            fetch('/admin/update_concorrentes', {
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
                        window.location.href = '/admin/listar_concorrentes'
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

            fetch('/admin/salvarversao',{
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
                        window.location.href = '/admin/listar_versaosis'
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

            fetch('/admin/update_versao', {
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
                        window.location.href = '/admin/listar_versaosis'
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

            fetch('/admin/salvarsetor',{
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
                        window.location.href = '/admin/listar_setor'
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

            fetch('/admin/update_setor', {
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
                        window.location.href = '/admin/listar_setor'
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

            fetch('/admin/salvar_tipos_entidade',{
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
                        window.location.href = '/admin/listar_tipos_entidade'
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

            fetch('/admin/update_tipo_entidade', {
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
                        window.location.href = '/admin/listar_tipos_entidade'
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

            fetch('/admin/salvar_grupos_de_usuarios',{
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
                        window.location.href = '/admin/listar_grupos_de_usuarios'
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

            fetch('/admin/update_grupos_de_usuarios',{
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
                        window.location.href = '/admin/listar_grupos_de_usuarios'
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
        var observacao = editor.getData();
        var instalado = document.getElementsByName('instalado')[0].checked ? '1' : '0';
        var inputs = document.querySelectorAll('.inputs')
        var msg_erro = document.querySelectorAll('.msg_erro')
        var alerta = document.getElementById('alertaerro')
        var valido = true

        // Obtém todos os checkboxes com o nome "modulos_contratados[]"
        const modulos_contratados_checkboxes = document.getElementsByName('modulos_contratados[]');

        // Cria um array com os valores dos checkboxes marcados
        const modulos_contratados = Array.from(modulos_contratados_checkboxes)
        .filter(checkbox => checkbox.checked)  // Filtra apenas os marcados
        .map(checkbox => checkbox.value);      // Extrai os valores dos checkboxes marcados


        for(let i = 0; i < inputs.length; i++){
            msg_erro[i].style.display = 'none';
            if(inputs[i].value == ''){
                msg_erro[i].style.display = 'block';
                valido = false
            }
        }

        if(valido){

            fetch('/admin/salvar_entidades',{
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
                    observacao: observacao,
                    instalado: instalado
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
                        window.location.href = '/admin/listar_entidades'
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
        var instalado = document.getElementsByName('instalado')[0].checked ? '1' : '0';
        var observacao = editor.getData();
        var id = document.getElementsByName('id')[0].value
        var inputs = document.querySelectorAll('.inputs')
        var msg_erro = document.querySelectorAll('.msg_erro')
        var alerta = document.getElementById('alertaerro')
        var valido = true

        const modulos_contratados_checkboxes = document.getElementsByName('modulos_contratados[]');

        // Cria um array com os valores dos checkboxes marcados
        const modulos_contratados = Array.from(modulos_contratados_checkboxes)
        .filter(checkbox => checkbox.checked)  // Filtra apenas os marcados
        .map(checkbox => checkbox.value);      // Extrai os valores dos checkboxes marcados

        for(let i = 0; i < inputs.length; i++){
            msg_erro[i].style.display = 'none';
            if(inputs[i].value == ''){
                msg_erro[i].style.display = 'block';
                valido = false
            }
        }

        if(valido){

            fetch('/admin/update_entidade',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    modulos_contratados: modulos_contratados,
                    versao_sistema: versao_sistema,
                    website_concorrente: website_concorrente,
                    sistema_concorrente: sistema_concorrente,
                    instalado: instalado,
                    observacao: observacao,
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
                        window.location.href = '/admin/listar_entidades'
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

    function cadastrarPrioridade(){
        var prioridade = document.getElementsByName('prioridade')[0].value
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

            fetch('/admin/salvar_prioridade',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prioridade: prioridade
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
                        window.location.href = '/admin/listar_prioridades'
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

    function updatePrioridade(){
        var prioridade = document.getElementsByName('prioridade')[0].value
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

            fetch('/admin/update_prioridade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prioridade: prioridade,
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
                        window.location.href = '/admin/listar_prioridades'
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

    function cadastrarTipodeTicket(){
        var tipo_ticket = document.getElementsByName('tipo_ticket')[0].value
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

            fetch('/admin/salvar_tipos_ticket',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tipo_ticket: tipo_ticket
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
                        window.location.href = '/admin/listar_tipos_ticket'
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

    function updateTipodeTicket(){
        var tipo_ticket = document.getElementsByName('tipo_ticket')[0].value
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

            fetch('/admin/update_tipos_ticket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tipo_ticket: tipo_ticket,
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
                        window.location.href = '/admin/listar_tipos_ticket'
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

    function cadastrarTicket(){
        var id_prioridade = document.getElementsByName('id_prioridade')[0].value
        var id_tipo = document.getElementsByName('id_tipo')[0].value
        var assunto = document.getElementsByName('assunto')[0].value
        var id_entidade = document.getElementsByName('id_entidade')[0].value
        var descricao = document.getElementsByName('descricao')[0].value
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

            fetch('/admin/salvar_ticket',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_tipo: id_tipo,
                    assunto: assunto,
                    id_prioridade: id_prioridade,
                    id_entidade: id_entidade,
                    descricao: descricao
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
                        window.location.href = '/admin/listar_tickets'
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

    function updateTicket(){
        var previsao = document.getElementsByName('previsao')[0].value
        var status_geral = document.getElementsByName('status_geral')[0].value
        var status_atual = document.getElementsByName('status_atual')[0].value
        var id_responsavel = document.getElementsByName('id_responsavel')[0].value
        var obs = document.getElementsByName('obs')[0].value
        var observacao_interna = editor.getData();
        var id = document.getElementsByName('id')[0].value
        var alerta = document.getElementById('alertaerro')

        const idAuxiliarSelect = document.getElementById('id_auxiliar')
        // Cria um array com os valores das opções selecionadas
        const idAuxiliarSelecionados = Array.from(idAuxiliarSelect.selectedOptions)
        .map(option => option.value)
        .join(','); // Usando vírgula como separador
        
         
        fetch('/admin/update_ticket',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                previsao: previsao,
                status_geral: status_geral,
                id_responsavel: id_responsavel,
                id_auxiliar: idAuxiliarSelecionados,
                obs: obs,
                observacao_interna: observacao_interna,
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
                    window.location.href = '/admin/listar_tickets'
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

    function PausaTicket(){
        verificarStatusComModal()
    }

    // Função que retorna uma Promise e aguarda o usuário interagir com o modal
function esperarMotivoModal() {
    return new Promise((resolve) => {
        // Configura o fechamento do modal para resolver a promise
        $('#ModalPausa').on('hide.bs.modal', function () {
            resolve(null); // Se o modal for fechado, retorna null
        });

        var botaoConfirmar = document.getElementById("botaoConfirmar");
        botaoConfirmar.addEventListener('click', function() {
            var msg_erro = document.getElementById('msg_erro')
            msg_erro.style.display = 'none'
            msg_erro.textContent = ''
            var pausa = document.getElementById("pausa").value;
            var retiradapausa = document.getElementById("retiradapausa").value;

            var motivo = pausa || retiradapausa
            if (motivo.trim() == ''){
                msg_erro.style.display = 'block'
                msg_erro.textContent = '*Campo Obrigatório'
            }
            else if (motivo.trim().length < 5){
                msg_erro.style.display = 'block'
                msg_erro.textContent = 'Digite um motivo válido'
            }
            else {
                resolve(motivo); 
                $('#ModalPausa').modal('hide');
            }
            
        });
    });
}

async function verificarStatusComModal() {
    var status_geral = document.getElementsByName('status_geral')[0].value
    var status_atual = document.getElementsByName('status_atual')[0].value
    var id = document.getElementsByName('id')[0].value
    if (status_atual != 'pausado' && status_geral == 'pausado') {
        var MotivoPausa = document.getElementById("MotivoPausa");
        $('#ModalPausa').modal('show');
        MotivoPausa.style.display = 'block';

        // Aguarda a interação do usuário no modal
        var motivo = await esperarMotivoModal();
        
        if (motivo){
            fetch('/admin/ticketPausa',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: id,
                    pausa: motivo,
                    retiradapausa: ''
                })
            })
            .then(response => response.json())
            .then(data => {
                if(data.success){
                    updateTicket()
                }
            })
        }
    }
    else if (status_atual == 'pausado' && status_geral != 'pausado'){
        var MotivoRetiradaPausa = document.getElementById("MotivoRetiradaPausa");
        $('#ModalPausa').modal('show');
        MotivoRetiradaPausa.style.display = 'block';

        // Aguarda a interação do usuário no modal
        var motivo = await esperarMotivoModal();
        
        if (motivo){
            fetch('/admin/ticketPausa',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: id,
                    pausa: '',
                    retiradapausa: motivo
                })
            })
            .then(response => response.json())
            .then(data => {
                if(data.success){
                    updateTicket()
                }
            })
        }
    }
    else {
        updateTicket()
    }
}


//FUNCOES DE PERMISSAO, SO ACESSA PAGINA SE O USUARIO TIVER PERMISSAO
    function acessaPGgrupoUsuario() {

    const alerta = document.getElementById('alertaerro');

    fetch('/admin/listar_grupos_de_usuarios', {
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
        window.location.href = '/admin/listar_grupos_de_usuarios'
    });
    }

    function acessaPGUsuario() {

    const alerta = document.getElementById('alertaerro');

    fetch('/admin/listar_usuarios', {
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
        window.location.href = '/admin/listar_usuarios'
    });
    }



//FUNCOES DE EXIBIR DIVS
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

    //exibi div dos filtros
    function carregarFiltros(){
    var divfiltros = document.getElementById('DivFiltros')

    if (divfiltros.style.display === 'none'){
        divfiltros.style.display = 'flex'
    }
    else {
        divfiltros.style.display = 'none'
    }
    }

    //faz confirmação se o usuario realmente quer deletar o registro
    function deletar(id){
        var form = document.getElementById("formDelete"); // Seleciona o formulário
        var formid = document.getElementsByName('id')[0]
        
        // Exibe um alerta com 2 botões: OK e Cancelar
        const resposta = confirm("Você tem certeza que deseja deletar  esse registro?");

        if (resposta) {
            formid.value = id
            form.submit()
        } 
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.checkFiltros').forEach(function(check){
            console.log('Elemento encontrado:', check);  // Verifica se os elementos estão sendo encontrados
            check.addEventListener('click', function(){
                console.log(check.value);  // Verifica se o valor está sendo capturado corretamente
            });
        });
    });

    function filtro(){
        var formulario = document.getElementById('formulariofiltro')

        formulario.submit()
    }
