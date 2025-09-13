    // ===================================================================
    // PONTO DE ENTRADA PRINCIPAL DA APLICAÇÃO
    // ===================================================================
    document.addEventListener('DOMContentLoaded', () => {
        // Inicializa todas as funcionalidades da página na ordem correta
        inicializarAplicacao();
    });

    /**
     * Função principal que orquestra o carregamento da página.
     */
    async function inicializarAplicacao() {
        // 1. Carrega o menu e ativa suas funcionalidades INTERNAS
        //    Isso resolve a condição de corrida (race condition).
        await carregarEMontarMenu();

        // 2. Verifica se o usuário está autenticado em páginas protegidas
        if (window.location.pathname !== '/login.html') {
            const autenticado = await verificarAutenticacao();
            if (!autenticado) {
                window.location.href = 'login.html';
                return; // Para a execução se não estiver autenticado
            }
        }

        // 3. Carrega os dados específicos da página (ex: lista de usuários)
        //    A função `loadUsers` só é chamada se o elemento da tabela existir.
        if (document.getElementById('usuarios-tbody')) {
            loadUsers();
            configurarFormulariosDeUsuario();
        }
    }


    // ===================================================================
    // FUNÇÕES DO MENU
    // ===================================================================

    /**
     * Carrega o menu.html, insere na página e ativa todas as suas funcionalidades.
     */
    async function carregarEMontarMenu() {
        const menuContainer = document.getElementById('menu-container');
        if (!menuContainer) return;

        try {
            const response = await fetch('menu.html');
            const menuHTML = await response.text();
            menuContainer.innerHTML = menuHTML;

            // Agora que o menu GARANTIDAMENTE existe no DOM, ativamos suas funções
            ativarFuncionalidadeMenu();
            await loadLoggedInUser(); // Carrega nome e ajusta menus visíveis

        } catch (error) {
            console.error('Erro ao carregar o menu:', error);
        }
    }

    /**
     * Adiciona os eventos de clique aos botões do menu (hambúrguer e submenus).
     */
    function ativarFuncionalidadeMenu() {
        const sidemenu = document.getElementById("sidemenu");
        if (!sidemenu) return;

        const openBtn = sidemenu.parentElement.querySelector(".fa-bars");
        const closeBtn = sidemenu.querySelector(".fa-circle-xmark");

        if (openBtn) openBtn.addEventListener('click', () => sidemenu.style.left = "0px");
        if (closeBtn) closeBtn.addEventListener('click', () => sidemenu.style.left = "-800px");

        document.querySelectorAll('.submenu > a').forEach(menu => {
            menu.addEventListener('click', function (e) {
                e.preventDefault();
                const submenuItems = this.nextElementSibling;
                const icon = this.querySelector('.fas.fa-chevron-down');
                if (submenuItems) submenuItems.classList.toggle('open');
                if (icon) icon.classList.toggle('rotate');
            });
        });
    }

    /**
     * Busca os dados do usuário logado para exibir o nome e ajustar os menus.
     * Esta é a versão limpa e eficiente.
     */
    async function loadLoggedInUser() {
        try {
            const response = await fetch('/api/usuario-logado');
            if (!response.ok) {
                // Se a sessão expirou, pode ser tratado aqui também
                throw new Error('Sessão inválida ou expirada.');
            }
            const data = await response.json();

            const userNameElement = document.getElementById('user-name-text');
            if (userNameElement) {
                userNameElement.innerHTML = data.nome_usuario || data.nome;
            }

            const userType = data.tipo_usuario ? data.tipo_usuario.trim().toLowerCase() : '';
            switch (userType) {
                case 'admin':
                    document.querySelector('.admin-menu').style.display = 'block';
                    document.querySelector('.produto').style.display = 'block';
                    break;
                case 'tecnico':
                    document.querySelector('.tecnico').style.display = 'block';
                    document.querySelector('.produto').style.display = 'block';
                    break;
                case 'professor':
                    document.querySelector('.professor').style.display = 'block';
                    break;
            }
        } catch (error) {
            console.error('Erro ao carregar usuário logado:', error);
            // Poderia redirecionar para login aqui também se a sessão expirar
            // window.location.href = 'login.html';
        }
    }


    // ===================================================================
    // FUNÇÕES DE AUTENTICAÇÃO
    // ===================================================================
    async function verificarAutenticacao() {
        try {
            const response = await fetch('/api/check-auth');
            const data = await response.json();
            return data.Autenticado;
        } catch {
            return false;
        }
    }


    // ===================================================================
    // FUNÇÕES DA PÁGINA DE GERENCIAMENTO DE USUÁRIOS
    // ===================================================================

    /**
     * Busca a lista de usuários da API e preenche a tabela e os selects.
     */
    async function loadUsers() {
        try {
            const response = await fetch('/api/usuarios');
            const data = await response.json();

            const tbody = document.getElementById('usuarios-tbody');
            const selectRemove = document.getElementById('usuarios-select');
            const selectActivate = document.getElementById('usuarios-select-ativar');

            tbody.innerHTML = '';
            selectRemove.innerHTML = '';
            selectActivate.innerHTML = '';

            data.forEach(usuario => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${usuario.nome_usuario}</td>
                    <td>${usuario.email}</td>
                    <td>${usuario.tipo_usuario}</td>
                    <td>${usuario.status}</td>
                `;
                tbody.appendChild(tr);

                const option = document.createElement('option');
                option.value = usuario.email;
                option.textContent = `${usuario.nome_usuario} (${usuario.email})`;
                
                if (usuario.status === 'ativado') {
                    selectRemove.appendChild(option);
                } else if (usuario.status === 'desativado') {
                    selectActivate.appendChild(option);
                }
            });
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    }

    /**
     * Configura os event listeners para os formulários de adicionar, ativar e desativar.
     */
    function configurarFormulariosDeUsuario() {
        // Adicionar novo usuário
        document.getElementById('add-user-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.target;
            const password = form.password.value;
            const confirmPassword = form['confirm-password'].value;

            if (password !== confirmPassword) {
                alert('As senhas não coincidem!');
                return;
            }

            const userData = {
                nome_usuario: form.username.value,
                email: form.email.value,
                tipo_usuario: form.type.value,
                senha: password
            };

            try {
                const response = await fetch('/api/usuarios', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                const data = await response.json();
                alert(data.message || data.error);
                if (response.ok) {
                    form.reset();
                    loadUsers(); // ATUALIZA A LISTA SEM RECARREGAR A PÁGINA
                }
            } catch (error) {
                console.error('Erro ao adicionar usuário:', error);
                alert('Ocorreu um erro. Tente novamente.');
            }
        });

        // Desativar usuário
        document.getElementById('remove-user-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('usuarios-select').value;
            if (!email) { alert('Selecione um usuário para desativar.'); return; }

            try {
                const response = await fetch(`/api/usuarios/${email}`, { method: 'PATCH' });
                const data = await response.json();
                alert(data.message || data.error);
                if (response.ok) {
                    loadUsers(); // ATUALIZA A LISTA SEM RECARREGAR A PÁGINA
                }
            } catch (error) {
                console.error('Erro ao desativar usuário:', error);
            }
        });

        // Ativar usuário
        document.getElementById('activate-user-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('usuarios-select-ativar').value;
            if (!email) { alert('Selecione um usuário para ativar.'); return; }
            
            try {
                const response = await fetch(`/api/usuarios/ativar/${email}`, { method: 'PATCH' });
                const data = await response.json();
                alert(data.message || data.error);
                if (response.ok) {
                    loadUsers(); // ATUALIZA A LISTA SEM RECARREGAR A PÁGINA
                }
            } catch (error) {
                console.error('Erro ao ativar usuário:', error);
            }
        });
    }

    // ===================================================================
    // FUNÇÕES GERAIS (EX: ABAS)
    // ===================================================================

    function opentab(tabname, event) {
        const tablinks = document.getElementsByClassName("tab-links");
        const tabcontents = document.getElementsByClassName("tab-contents");

        Array.from(tablinks).forEach(link => link.classList.remove("active-link"));
        Array.from(tabcontents).forEach(content => content.classList.remove("active-tab"));

        document.getElementById(tabname).classList.add("active-tab");
        event.currentTarget.classList.add("active-link");
    }

