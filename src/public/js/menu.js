// Conteúdo do arquivo: js/menu.js (CORRIGIDO)

/**
 * Ponto de entrada: espera o HTML da página carregar para iniciar.
 */
document.addEventListener('DOMContentLoaded', () => {
    inicializarMenuEAutenticacao();
});

/**
 * Orquestra o carregamento do menu e a verificação de login.
 */
async function inicializarMenuEAutenticacao() {
    
    // --- PASSO 1: CARREGAR O HTML DO MENU ---
    // Esta parte estava faltando.
    const menuContainer = document.getElementById('menu-container');
    if (menuContainer) {
        try {
            const response = await fetch('menu.html');
            if(response.ok) {
                menuContainer.innerHTML = await response.text();
            } else {
                // Se não encontrar o menu.html, exibe um erro visível
                menuContainer.innerHTML = '<p style="color: red; text-align: center;">Erro: menu.html não pôde ser carregado.</p>';
            }
        } catch (error) { 
            console.error("Erro ao carregar menu.html:", error); 
        }
    } else {
        console.error('O elemento <div id="menu-container"></div> não foi encontrado no seu HTML principal.');
        // Se o container não existe, não há como continuar.
        return; 
    }

    // --- PASSO 2: VERIFICAR O LOGIN E PREENCHER OS DADOS ---
    // Esta parte do código já estava correta.
    const userData = await verificarLogin();
    if (!userData) return; // Para a execução se o usuário não estiver logado

    // Se o login for bem-sucedido, ativa as funcionalidades do menu
    ativarFuncionalidadeMenu();
    preencherDadosDoMenu(userData);

    // Dispara um evento para avisar a outros scripts (como o home.js) que o menu está pronto
    document.dispatchEvent(new CustomEvent('menuReady', { detail: { userData } }));
}

/**
 * Busca os dados do usuário logado na API.
 * Se não estiver logado, redireciona para a página de login.
 */
async function verificarLogin() {
    try {
        const response = await fetch('/api/usuario-logado');
        if (!response.ok) {
            window.location.href = '/login.html';
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error("Erro de conexão ao verificar login:", error);
        window.location.href = '/login.html';
        return null;
    }
}

/**
 * Adiciona os eventos de clique aos botões do menu.
 */
function ativarFuncionalidadeMenu() {
    const sideMenu = document.getElementById("sidemenu");
    if (!sideMenu) return;

    const openMenuBtn = document.querySelector(".fa-bars");
    const closeMenuBtn = sideMenu.querySelector(".fa-circle-xmark");

    if (openMenuBtn) openMenuBtn.addEventListener('click', () => sideMenu.style.left = "0px");
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', () => sideMenu.style.left = "-800px");

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
 * Preenche o nome do usuário e mostra/esconde os links do menu apropriados.
 */
/**
 * Preenche o nome do usuário e mostra/esconde os links do menu e os painéis do dashboard.
 * (VERSÃO CORRIGIDA E ORGANIZADA)
 */
function preencherDadosDoMenu(userData) {
    // --- Preenche o nome do usuário ---
    const userNameElement = document.getElementById('user-name-text');
    if (userNameElement) {
        userNameElement.textContent = userData.nome_usuario || userData.nome;
    }

    const userType = userData.tipo_usuario ? userData.tipo_usuario.trim().toLowerCase() : '';

    // --- Funções Auxiliares para mostrar elementos ---
    const showMenuItem = (selector) => {
        const el = document.querySelector(selector);
        if (el) el.style.display = 'list-item'; // 'list-item' é o correto para <li>
    };
    const showDashboardCard = (selector) => {
        const el = document.querySelector(selector);
        if (el) el.style.display = 'block'; // 'block' é o correto para <div>
    };

    // --- Lógica de Exibição ---

    // 1. Esconde todos os painéis para começar do zero
    document.querySelectorAll('.cartao-painel').forEach(card => card.style.display = 'none');

    // 2. Mostra os menus e painéis corretos para cada tipo de usuário
    switch (userType) {
        case 'admin':
            if (window.location.pathname !== '/Inventario' && window.location.pathname !== '/Inventario.html') {
                window.location.href = '/Inventario';
                return;
            }
            showMenuItem('.admin-menu');
            showMenuItem('.produto');
            break;

        case 'tecnico':
            // Mostra os menus do técnico
            showMenuItem('.tecnico');
            showMenuItem('.Home');
            showMenuItem('.produto');
            // Mostra os painéis do técnico
            showDashboardCard('.cartao-aulas-tecnico');
            showDashboardCard('.cartao-meus-laboratorios');
            break;

        case 'professor':
            // Mostra os menus do professor
            showMenuItem('.Home');
            showMenuItem('.professor');
            showMenuItem('.Horarios');
            // Mostra os painéis do professor (usando a classe corrigida)
            showDashboardCard('.cartao-aulas-autorizadas'); // <--- CORRIGIDO
            showDashboardCard('.cartao-solicitacoes');
            break;
    }
}