    

var sidemenu = document.getElementById("sidemenu");
function openmenu(){
    sidemenu.style.left = "0px";
}
function clossmenu(){
    sidemenu.style.left = "-800px";
}


function Autenticado() {
    return fetch('/api/check-auth', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => data.Autenticado)
    .catch(() => false);
}

function redirecionarSeNaoAutenticado() {
    Autenticado().then(authenticated => {
        if (!authenticated) {
            window.location.href = 'index.html'; // Redireciona para a página de login
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname !== '/index.html') {
        redirecionarSeNaoAutenticado();
    }
});

// Função para abrir abas
function opentab(tabname) {
    var tablinks = document.getElementsByClassName("tab-links");
    var tabcontents = document.getElementsByClassName("tab-contents");

    for (var i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active-link");
    }
    for (var i = 0; i < tabcontents.length; i++) {
        tabcontents[i].classList.remove("active-tab");
        if (tabcontents[i].id === tabname) {
            tabcontents[i].classList.add("active-tab");
        }
    }
    event.currentTarget.classList.add("active-link");
}

// Pegar dados de laboratórios da API e preencher a tabela e o select
function loadLaboratorios(page = 1, limit = 20) { // Ajustando o limite padrão
    fetch(`/api/laboratoriosPag?page=${page}&limit=${limit}`)
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        const tbody = document.getElementById('laboratorio-tbody');
        tbody.innerHTML = ''; // Limpar a tabela
        data.data.forEach(laboratorio => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${laboratorio.nome_laboratorio}</td>
                <td>${laboratorio.nome_usuario}</td>
                <td>${laboratorio.usuario_email}</td>
            `;
            tbody.appendChild(tr);
        });
    })
    .catch(error => console.error('Erro ao carregar laboratórios:', error));
}


// Carregar laboratórios e nome do usuário logado 
document.addEventListener('DOMContentLoaded', function() {
    loadLaboratorios();
    loadLoggedInUser();
});

// Pegar dados de usuários da API e preencher o select para add laboratório
fetch('/api/usuarios')
    .then(response => response.json())
    .then(data => {
        const select = document.getElementById('usuarios-select');
        data.forEach(usuario => {
            const option = document.createElement('option');
            option.value = usuario.email;
            option.textContent = usuario.email;
            select.appendChild(option);
        });
    })
    .catch(error => console.error('Erro ao carregar usuários:', error));

// Add novo laboratório
document.getElementById('add-laboratorio-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const nomeLaboratorio = document.getElementById('nome_laboratorio').value;
    const usuarioEmail = document.getElementById('usuarios-select').value;

    console.log('Nome do Laboratório:', nomeLaboratorio);
    console.log('Email do Usuário:', usuarioEmail);

    fetch('/api/laboratorios', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nome_laboratorio: nomeLaboratorio, usuario_email: usuarioEmail })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Resposta do Servidor:', data);

        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message);

            // add o novo laboratório na tabela
            const tbody = document.getElementById('laboratorio-tbody');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${nomeLaboratorio}</td>
                <td>${usuarioEmail}</td>
            `;
            tbody.appendChild(tr);

            // add o novo laboratório no select para remoção
            const select = document.getElementById('laboratorios');
            const option = document.createElement('option');
            option.value = data.id_laboratorio;
            option.textContent = nomeLaboratorio;
            select.appendChild(option);

            // Limpar o formulário
            document.getElementById('add-laboratorio-form').reset();
            // Recarregar a página para atualizar os dados
            location.reload();
        }
    })
    .catch(error => console.error('Erro ao add laboratório:', error));
});

document.addEventListener('DOMContentLoaded', () => {
    // Carregar os laboratórios no select
    function loadLaboratorios(page = 1, limit = 10) {
        fetch(`/api/laboratoriosPag?page=${page}&limit=${limit}`)
            .then(response => response.json())
            .then(data => {
                const tbody = document.getElementById('laboratorio-tbody');
                tbody.innerHTML = ''; // Limpar a tabela

                data.data.forEach(laboratorio => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${laboratorio.nome_laboratorio}</td>
                        <td>${laboratorio.nome_usuario}</td>
                        <td>${laboratorio.usuario_email}</td>
                    `;
                    tbody.appendChild(tr);
                });

                // Atualizar paginação
                updatePagination(data.totalPages, page);
            })
            .catch(error => console.error('Erro ao carregar laboratórios:', error));
    }

    // Carregar laboratórios ao inicializar a página
    loadLaboratorios();
});

function loadLaboratorios2() {
    fetch('/api/laboratorios')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('laboratorios-select2');
            select.innerHTML = ''; // Limpar opções 
            data.forEach(laboratorio => {
                const option = document.createElement('option');
                option.value = laboratorio.id_laboratorio;
                option.textContent = laboratorio.nome_laboratorio;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar laboratórios:', error));
}

function loadLaboratorios3() {
    fetch('/api/laboratorios')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('remove-laboratorio');
            select.innerHTML = ''; // Limpar o select
            data.forEach(laboratorio => {
                const option = document.createElement('option');
                option.value = laboratorio.id_laboratorio;
                option.textContent = laboratorio.nome_laboratorio;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar laboratórios:', error));
}

// Função para remover laboratório
document.getElementById('remove-laboratorio-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const selectElement = document.getElementById('remove-laboratorio');
    const idLaboratorio = selectElement.value;

    console.log('ID do Laboratório:', idLaboratorio); // Verifique o valor aqui

    if (!idLaboratorio) {
        alert('Por favor, selecione um laboratório.');
        return;
    }

    fetch(`/api/laboratorios/${idLaboratorio}`, {
        method: 'DELETE',
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message);

            // Recarregar a lista de laboratórios
            loadLaboratorios3();
            loadLaboratorios();
        }
    })
    .catch(error => console.error('Erro ao remover laboratório:', error));
});

 // Pegar o nome do usuário logado
function loadLoggedInUser() {
    fetch('/api/usuario-logado')
        .then(response => response.json())
        .then(data => {
            const userNameElement = document.getElementById('user-name-text');
            userNameElement.innerHTML = data.nome;
            if (data.tipo_usuario === 'admin') {
                document.querySelector('.admin-menu').style.display = 'block';
            }
        })
        .catch(error => console.error('Erro ao carregar usuário logado:', error));
}

loadLoggedInUser();

// Coisa legal do submenu
document.querySelectorAll('.submenu > a').forEach(menu => {
    menu.addEventListener('click', function(e) {
        e.preventDefault();
        const submenuItems = this.nextElementSibling;
        submenuItems.classList.toggle('open');
        this.querySelector('.fas.fa-chevron-down').classList.toggle('rotate');
    });
});

document.getElementById('update-responsavel-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const laboratorioSelect = document.getElementById('laboratorios-select2');
    const responsavelSelect = document.getElementById('usuarios-select2');

    const idLaboratorio = laboratorioSelect.value;
    const emailResponsavel = responsavelSelect.value;

    console.log('ID do Laboratório:', idLaboratorio);
    console.log('Email do Novo Responsável:', emailResponsavel);

    // Verificação dos valores
    if (!idLaboratorio || !emailResponsavel) {
        alert('Por favor, selecione um laboratório e um novo responsável.');
        return;
    }

    // Envio da solicitação para atualizar o responsável
    fetch('/api/atualizar-responsavel', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idLaboratorio, usuarioEmail: emailResponsavel })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message);
            loadLaboratorios(); // Atualiza a lista de laboratórios
            loadUsuarios(); // Atualiza a lista de usuários
        }
    })
    .catch(error => console.error('Erro ao atualizar responsável:', error));
});


// Função para carregar usuários no select
function loadUsuarios2() {
    fetch('/api/usuarios')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('usuarios-select2');
            select.innerHTML = ''; // Limpar opções existentes
            data.forEach(usuario => {
                const option = document.createElement('option');
                option.value = usuario.email;
                option.textContent = usuario.email;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar usuários:', error));
}

// Função para atualizar a paginação
function updatePagination(totalPages, currentPage) {
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = ''; // Limpar a paginação

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.classList.add('pagination-button');
        if (i === currentPage) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            loadLaboratorios(i); // Carregar a tabela para a página clicada
        });
        paginationDiv.appendChild(button);
    }
}

// Carregar laboratórios e usuários quando a página carregar
window.onload = function() {
    loadLaboratorios2();
    loadLaboratorios3();
    loadUsuarios2();
};