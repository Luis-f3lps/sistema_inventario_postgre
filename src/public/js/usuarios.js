    // ===================================================================
    // FUNÇÕES GLOBAIS (acessíveis via onclick no HTML)
    // ===================================================================

    function openmenu() {
        const sidemenu = document.getElementById("sidemenu");
        if (sidemenu) sidemenu.style.left = "0px";
    }

    function clossmenu() {
        const sidemenu = document.getElementById("sidemenu");
        if (sidemenu) sidemenu.style.left = "-800px";
    }

    function opentab(tabname, event) {
        const tablinks = document.getElementsByClassName("tab-links");
        const tabcontents = document.getElementsByClassName("tab-contents");

        Array.from(tablinks).forEach(link => link.classList.remove("active-link"));
        Array.from(tabcontents).forEach(content => content.classList.remove("active-tab"));

        document.getElementById(tabname).classList.add("active-tab");
        if(event) event.currentTarget.classList.add("active-link");
    }

    // ===================================================================
    // PONTO DE ENTRADA PRINCIPAL DA APLICAÇÃO
    // ===================================================================
    document.addEventListener('DOMContentLoaded', () => {
        inicializarAplicacao();
    });

    /**
     * Função principal que orquestra o carregamento da página.
     */
    async function inicializarAplicacao() {
        // Se estiver na página de login, não faz mais nada.
        if (window.location.pathname.includes('/login.html')) {
            return;
        }

        const userData = await carregarEMontarMenu();
        if (!userData) return;

        // Carrega os dados específicos da página de Usuários (só se ela estiver aberta)
        if (document.getElementById('usuarios-tbody')) {
            if (userData.tipo_usuario === 'admin') {
                loadUsers();
                configurarFormulariosDeUsuario();
            } else {
                alert('Acesso negado. Apenas administradores podem ver esta página.');
                window.location.href = 'Home.html';
            }
        }
    }

    // ===================================================================
    // FUNÇÕES DO MENU E AUTENTICAÇÃO
    // ===================================================================
    
    /**
     * Carrega o menu.html, insere na página, verifica o login e ativa as funcionalidades.
     * Retorna os dados do usuário se o login for bem-sucedido.
     */
    async function carregarEMontarMenu() {
        const userData = await loadLoggedInUser();
        if (!userData) return null;

        const menuContainer = document.getElementById('menu-container');
        if (!menuContainer) {
            console.error("Elemento #menu-container não encontrado no HTML.");
            return userData;
        }

        try {
            const response = await fetch('menu.html');
            if (!response.ok) throw new Error("menu.html não encontrado.");
            
            const menuHTML = await response.text();
            menuContainer.innerHTML = menuHTML;
            
            ativarFuncionalidadeMenu();
            preencherDadosDoMenu(userData);
            return userData;
        } catch (error) {
            console.error('Erro ao carregar o menu:', error);
            return userData;
        }
    }

    /**
     * Adiciona os eventos de clique aos botões do menu.
     */
    function ativarFuncionalidadeMenu() {
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
     * Busca os dados do usuário logado. Se não estiver logado, REDIRECIONA.
     */
    async function loadLoggedInUser() {
        try {
            const response = await fetch('/api/usuario-logado');
            if (!response.ok) {
                window.location.href = 'login.html';
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error('Erro de conexão ao verificar usuário:', error);
            window.location.href = 'login.html';
            return null;
        }
    }

    /**
     * Usa os dados do usuário já buscados para preencher o nome e mostrar/esconder menus.
     */
    function preencherDadosDoMenu(userData) {
        const userNameElement = document.getElementById('user-name-text');
        if (userNameElement) {
            userNameElement.innerHTML = userData.nome_usuario || userData.nome;
        }

        const userType = userData.tipo_usuario ? userData.tipo_usuario.trim().toLowerCase() : '';
        const sidemenu = document.getElementById('sidemenu');
        if(!sidemenu) return;

        const show = (selector) => {
            const el = sidemenu.querySelector(selector);
            if(el) el.style.display = 'block';
        };

        switch (userType) {
            case 'admin':
                show('.admin-menu');
                show('.produto');
                break;
            case 'tecnico':
                show('.tecnico');
                show('.produto');
                break;
            case 'professor':
                show('.professor');
                break;
        }
    }

    // ===================================================================
    // FUNÇÕES DA PÁGINA DE GERENCIAMENTO DE USUÁRIOS
    // ===================================================================

    async function loadUsers() {
        try {
            const response = await fetch('/api/usuarios');
            if (!response.ok) throw new Error('Falha ao carregar usuários.');
            
            const data = await response.json();
            const tbody = document.getElementById('usuarios-tbody');
            const selectRemove = document.getElementById('usuarios-select');
            const selectActivate = document.getElementById('usuarios-select-ativar');

            tbody.innerHTML = '';
            selectRemove.innerHTML = '<option value="">Selecione um usuário...</option>';
            selectActivate.innerHTML = '<option value="">Selecione um usuário...</option>';

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
                    selectActivate.appendChild(option.cloneNode(true));
                }
            });
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            showUserMessage('Não foi possível carregar a lista de usuários.', true);
        }
    }

    function configurarFormulariosDeUsuario() {
        const addUserForm = document.getElementById('add-user-form');
        const removeUserForm = document.getElementById('remove-user-form');
        const activateUserForm = document.getElementById('activate-user-form');

        if(addUserForm) {
            addUserForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const form = event.target;
                const password = form.password.value;
                const confirmPassword = form['confirm-password'].value;

                if (password !== confirmPassword) {
                    return showUserMessage('As senhas não coincidem!', true);
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
                    showUserMessage(data.message || data.error, !response.ok);
                    if (response.ok) {
                        form.reset();
                        loadUsers();
                    }
                } catch (error) {
                    showUserMessage('Ocorreu um erro de conexão. Tente novamente.', true);
                }
            });
        }

        if(removeUserForm) {
            removeUserForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const email = document.getElementById('usuarios-select').value;
                if (!email) return showUserMessage('Selecione um usuário para desativar.', true);

                try {
                    const response = await fetch(`/api/usuarios/${email}`, { method: 'PATCH' });
                    const data = await response.json();
                    showUserMessage(data.message || data.error, !response.ok);
                    if (response.ok) loadUsers();
                } catch (error) {
                    showUserMessage('Ocorreu um erro de conexão. Tente novamente.', true);
                }
            });
        }
        
        if(activateUserForm) {
            activateUserForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const email = document.getElementById('usuarios-select-ativar').value;
                if (!email) return showUserMessage('Selecione um usuário para ativar.', true);
                
                try {
                    const response = await fetch(`/api/usuarios/ativar/${email}`, { method: 'PATCH' });
                    const data = await response.json();
                    showUserMessage(data.message || data.error, !response.ok);
                    if (response.ok) loadUsers();
                } catch (error) {
                    showUserMessage('Ocorreu um erro de conexão. Tente novamente.', true);
                }
            });
        }
    }
    
    /**
     * Exibe uma mensagem de status para o usuário (substituto do 'alert').
     */
    function showUserMessage(message, isError = false) {
        const messageEl = document.getElementById('user-message');
        if (!messageEl) {
            alert(message);
            return;
        }
        
        messageEl.textContent = message;
        messageEl.className = isError ? 'message-status erro' : 'message-status sucesso';
        messageEl.style.display = 'block';

        setTimeout(() => { messageEl.style.display = 'none'; }, 5000);
    }
