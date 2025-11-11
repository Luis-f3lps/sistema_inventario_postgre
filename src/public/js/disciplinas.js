
function openmenu() {
    const sidemenu = document.getElementById("sidemenu");
    if (sidemenu) {
        sidemenu.style.left = "0px";
    }
}


function closemenu() {
    const sidemenu = document.getElementById("sidemenu");
    if (sidemenu) {

        sidemenu.style.left = "-800px"; 
    }
}


function opentab(event, tabname) {
    const tablinks = document.getElementsByClassName("tab-links");
    const tabcontents = document.getElementsByClassName("tab-contents");

    Array.from(tablinks).forEach(link => link.classList.remove("active-link"));
    Array.from(tabcontents).forEach(content => content.classList.remove("active-tab"));

    const activeTab = document.getElementById(tabname);
    if (activeTab) {
        activeTab.classList.add("active-tab");
    }
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active-link");
    }
}


document.addEventListener('DOMContentLoaded', () => {
    loadLoggedInUser();
    loadDisciplinas();
    loadProfessoresParaSelect();

    setupEventListeners();

    setupSubmenuListeners();
});

/**
 * Gerencia a troca de abas (tabs).
 * @param {Event} event - O objeto do evento de clique.
 * @param {string} tabname - O ID do conteúdo da aba para abrir.
 */
function opentab(event, tabname) {
    // 1. Pega todos os "botões" (links) e remove a classe ativa
    const tablinks = document.getElementsByClassName("tab-links");
    Array.from(tablinks).forEach(link => {
        link.classList.remove("active-link");
    });

    // 2. Pega todos os "conteúdos" e esconde eles
    const tabcontents = document.getElementsByClassName("tab-contents");
    Array.from(tabcontents).forEach(content => {
        content.classList.remove("active-tab");
    });

    // 3. Mostra o conteúdo da aba clicada
    const activeTab = document.getElementById(tabname);
    if (activeTab) {
        activeTab.classList.add("active-tab");
    }
    
    // 4. Adiciona a classe ativa de volta apenas no link que foi clicado
    // (É por isso que precisamos do 'event')
    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active-link");
    }
}

// Pegar o nome do usuário logado
async function loadLoggedInUser() {
                        const response = await fetch('/api/usuario-logado');
                    if (!response.ok) {
                        // Se não conseguir encontrar o usuário, redireciona para o login
                        window.location.href = '/login.html';
                        return;
                    }
    fetch('/api/usuario-logado')
        .then(response => {
            // É uma boa prática verificar se a resposta da rede foi bem-sucedida
            if (!response.ok) {
                throw new Error('Falha ao buscar usuário. Status: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            const userNameElement = document.getElementById('user-name-text');
            userNameElement.innerHTML = data.nome;

            // Correção 1: Normaliza o tipo de usuário usando a variável 'data'
            const userType = data.tipo_usuario ? data.tipo_usuario.trim().toLowerCase() : '';

            // Correção 2: Usa uma estrutura 'switch' para um código mais limpo e organizado
switch (userType) {
                        case 'admin':
                            document.querySelector('.admin-menu').style.display = 'block';
                            document.querySelector('#sidemenu > li.submenu.produto').style.display = 'block';

                            break;
                        case 'tecnico':
                            document.querySelector('.tecnico').style.display = 'block';
                            document.querySelector('.Home').style.display = 'block';
                            document.querySelector('#sidemenu > li.submenu.produto').style.display = 'block';

                            break;
                        case 'professor':
                            document.querySelector('.Home').style.display = 'block';
                            document.querySelector('.professor').style.display = 'block';
                            document.querySelector('.Horarios').style.display = 'block';

                            break;
                    }
        })
        .catch(error => console.error('Erro ao carregar usuário logado:', error));
}

async function loadDisciplinas() {
    try {
        const response = await fetch('/api/disciplinas'); // Assumindo este endpoint
        const data = await response.json();

        const tbody = document.getElementById('disciplinas-tbody');
        const selectRemove = document.getElementById('disciplinas-select');
        const selectActivate = document.getElementById('disciplinas-select-ativar');

        tbody.innerHTML = '';
        selectRemove.innerHTML = '';
        selectActivate.innerHTML = '';

        data.forEach(disciplina => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${disciplina.nome_disciplina}</td>
                <td>${disciplina.professor_email_responsavel}</td>
            `;
            tbody.appendChild(tr);

            if (disciplina.status === 'ativado') {
                const optionRemove = document.createElement('option');
                optionRemove.value = disciplina.id_disciplina; // O valor é o ID
                optionRemove.textContent = `${disciplina.nome_disciplina} (Professor: ${disciplina.professor_email_responsavel})`;
                selectRemove.appendChild(optionRemove);
            } else if (disciplina.status === 'desativado') {
                const optionActivate = document.createElement('option');
                optionActivate.value = disciplina.id_disciplina; // O valor é o ID
                optionActivate.textContent = `${disciplina.nome_disciplina} (Status: ${disciplina.status})`;
                selectActivate.appendChild(optionActivate);
            }
        });

    } catch (error) {
        console.error('Erro ao carregar disciplinas:', error);
    }
}

async function loadProfessoresParaSelect() {
    try {
        const selectProfessores = document.getElementById('usuarios-select');
        if (!selectProfessores) return;

        const response = await fetch('/api/usuarios'); // Puxa todos os usuários
        const data = await response.json();

        selectProfessores.innerHTML = ''; // Limpa o select

        data.forEach(usuario => {
            if (usuario.tipo_usuario === 'professor' && usuario.status === 'ativado') {
                const option = document.createElement('option');
                option.value = usuario.email; // O valor é o e-mail, como na sua FK
                option.textContent = `${usuario.nome_usuario} (${usuario.email})`;
                selectProfessores.appendChild(option);
            }
        });

    } catch (error) {
        console.error('Erro ao carregar professores no select:', error);
    }
}

function setupEventListeners() {
    document.getElementById('add-user-form').addEventListener('submit', handleAddDisciplina);
    
    document.getElementById('remove-user-form').addEventListener('submit', handleDeactivateDisciplina);

    document.getElementById('activate-user-form').addEventListener('submit', handleActivateDisciplina);
}


async function handleAddDisciplina(event) {
    event.preventDefault();
    const form = event.currentTarget;

    const nomeDisciplina = document.getElementById('username').value;
    const emailProfessor = document.getElementById('usuarios-select').value;

    if (!nomeDisciplina || !emailProfessor) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    try {
        const response = await fetch('/api/disciplinas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome_disciplina: nomeDisciplina,
                professor_email_responsavel: emailProfessor
            })
        });

        const data = await response.json();

        if (data.error) {
            alert(`Erro: ${data.error}`); // Ex: O erro da Foreign Key
        } else {
            alert(data.message);
            form.reset(); // Limpa o formulário
            loadDisciplinas(); // Recarrega a lista de disciplinas
        }
    } catch (error) {
        console.error('Erro ao adicionar disciplina:', error);
    }
}

async function handleDeactivateDisciplina(event) {
    event.preventDefault();
    const disciplinaId = document.getElementById('disciplinas-select').value;
    if (!disciplinaId) {
        alert('Selecione uma disciplina para desativar.');
        return;
    }

    try {
        const response = await fetch(`/api/disciplinas/desativar/${disciplinaId}`, { 
            method: 'PATCH' 
        }); 
        const data = await response.json();

        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message);
            loadDisciplinas(); // Recarrega a lista
        }
    } catch (error) {
        console.error('Erro ao desativar disciplina:', error);
    }
}

async function handleActivateDisciplina(event) {
    event.preventDefault();
    const disciplinaId = document.getElementById('disciplinas-select-ativar').value;
    if (!disciplinaId) {
        alert('Selecione uma disciplina para ativar.');
        return;
    }

    try {
        const response = await fetch(`/api/disciplinas/ativar/${disciplinaId}`, { 
            method: 'PATCH' 
        });
        const data = await response.json();

        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message);
            loadDisciplinas(); // Recarrega a lista
        }
    } catch (error) {
        console.error('Erro ao ativar disciplina:', error);
    }
}

function setupSubmenuListeners() {
    document.querySelectorAll('.submenu > a').forEach(menu => {
        menu.addEventListener('click', function (e) {
            e.preventDefault();
            const submenuItems = this.nextElementSibling;
            if (submenuItems) {
                submenuItems.classList.toggle('open');
            }
            this.querySelector('.fas.fa-chevron-down')?.classList.toggle('rotate');
        });
    });
}
