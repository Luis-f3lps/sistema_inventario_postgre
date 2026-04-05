// ==========================================
// 1. CARREGAMENTO INICIAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadLoggedInUser();
});

// ==========================================
// 2. NAVEGAÇÃO E AUTENTICAÇÃO
// ==========================================
function opentab(tabname) {
    const tablinks = document.getElementsByClassName("tab-links");
    const tabcontents = document.getElementsByClassName("tab-contents");

    Array.from(tablinks).forEach(link => link.classList.remove("active-link"));
    Array.from(tabcontents).forEach(content => content.classList.remove("active-tab"));

    const targetTab = document.getElementById(tabname);
    if (targetTab) targetTab.classList.add("active-tab");

    const clickedLink = document.querySelector(`.tab-links[onclick*="${tabname}"]`);
    if (clickedLink) clickedLink.classList.add("active-link");
}

async function loadLoggedInUser() {
    try {
        const response = await fetch('/api/usuario-logado');
        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }
        const data = await response.json();

        // Espera o menu carregar para preencher o nome na tela
        const preencherNome = () => {
            const userNameElement = document.getElementById("user-name-text");
            if (userNameElement) {
                userNameElement.innerHTML = data.nome || "Usuário";
            } else {
                setTimeout(preencherNome, 100);
            }
        };
        preencherNome();

        // Libera os botões do menu baseado no cargo
        const atualizarMenu = () => {
            const adminMenu = document.querySelector(".admin-menu");
            if (adminMenu || document.querySelector(".tecnico")) {
                const userType = data.tipo_usuario ? data.tipo_usuario.trim().toLowerCase() : "";

                if (userType === "admin" || userType === "administrador") {
                    document.querySelectorAll(".admin-menu, .produto").forEach(el => el.style.display = "block");
                } else if (userType === "tecnico") {
                    document.querySelectorAll(".tecnico, .Home, .produto").forEach(el => el.style.display = "block");
                } else if (userType === "professor") {
                    document.querySelectorAll(".professor, .Home, .Horarios").forEach(el => el.style.display = "block");
                }
            } else {
                setTimeout(atualizarMenu, 100);
            }
        };
        atualizarMenu();

    } catch (error) {
        console.error("Erro ao carregar usuário logado:", error);
    }
}

// ==========================================
// 3. BUSCA DE DADOS
// ==========================================
function loadUsers() {
    fetch('/api/usuarios')
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('usuarios-tbody');
            const selectRemove = document.getElementById('usuarios-select');
            const selectActivate = document.getElementById('usuarios-select-ativar');

            if(!tbody) return;

            // Limpa as tabelas e selects antes de popular novamente
            tbody.innerHTML = '';
            if(selectRemove) selectRemove.innerHTML = '<option value="">Selecione um usuário...</option>';
            if(selectActivate) selectActivate.innerHTML = '<option value="">Selecione um usuário...</option>';

            data.forEach(usuario => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${usuario.nome_usuario}</td>
                    <td>${usuario.email}</td>
                    <td style="text-transform: capitalize;">${usuario.tipo_usuario}</td>
                    <td><span class="etiqueta-status status-${usuario.status}">${usuario.status}</span></td>
                `;
                tbody.appendChild(tr);

                if (usuario.status === 'ativado' && selectRemove) {
                    const optionRemove = document.createElement('option');
                    optionRemove.value = usuario.email;
                    optionRemove.textContent = `${usuario.nome_usuario} (${usuario.status})`;
                    selectRemove.appendChild(optionRemove);
                }

                if (usuario.status === 'desativado' && selectActivate) {
                    const optionActivate = document.createElement('option');
                    optionActivate.value = usuario.email;
                    optionActivate.textContent = `${usuario.nome_usuario} (${usuario.status})`;
                    selectActivate.appendChild(optionActivate);
                }
            });
        })
        .catch(error => console.error('Erro ao carregar usuários:', error));
}

// ==========================================
// 4. FORMULÁRIOS (CRUD)
// ==========================================
document.getElementById('add-user-form')?.addEventListener('submit', function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const userType = document.getElementById('type').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        alert('As senhas não coincidem!');
        return;
    }

    fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome_usuario: username, email: email, tipo_usuario: userType, senha: password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message);
                document.getElementById('add-user-form').reset();
                loadUsers(); // Recarrega os dados da tela silenciosamente
            }
        })
        .catch(error => console.error('Erro ao adicionar usuário:', error));
});

document.getElementById('remove-user-form')?.addEventListener('submit', function (event) {
    event.preventDefault();
    const email = document.getElementById('usuarios-select').value;

    if (!email) {
        alert("Por favor, selecione um usuário para desativar.");
        return;
    }

    fetch(`/api/usuarios/${email}`, { method: 'PATCH' })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message);
                loadUsers(); 
            }
        })
        .catch(error => console.error('Erro ao desativar usuário:', error));
});

document.getElementById('activate-user-form')?.addEventListener('submit', function (event) {
    event.preventDefault();
    const email = document.getElementById('usuarios-select-ativar').value;

    if (!email) {
        alert("Por favor, selecione um usuário para ativar.");
        return;
    }

    fetch(`/api/usuarios/ativar/${email}`, { method: 'PATCH' })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message);
                loadUsers(); 
            }
        })
        .catch(error => console.error('Erro ao ativar usuário:', error));
});