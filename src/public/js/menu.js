// Conteúdo do arquivo: js/menu.js

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
    // Tenta buscar o usuário logado. Se não conseguir, redireciona para o login.
    const userData = await verificarLogin();
    if (!userData) return; // Para a execução se o usuário não estiver logado

    // Se o login for bem-sucedido, ativa as funcionalidades do menu
    ativarFuncionalidadeMenu();
    preencherDadosDoMenu(userData);

    // Dispara um evento para avisar a outros scripts (como o home.js) que o menu está pronto
    // e envia os dados do usuário para que não precisem ser buscados novamente.
    document.dispatchEvent(new CustomEvent('menuReady', { detail: { userData } }));
}

/**
 * Busca os dados do usuário logado na API.
 * Se não estiver logado, redireciona para a página de login.
 * Se estiver, retorna os dados do usuário.
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
 * Adiciona os eventos de clique aos botões do menu (hambúrguer e submenus).
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
function preencherDadosDoMenu(userData) {
    const userNameElement = document.getElementById('user-name-text');
    if (userNameElement) {
        userNameElement.textContent = userData.nome_usuario || userData.nome;
    }

    const userType = userData.tipo_usuario ? userData.tipo_usuario.trim().toLowerCase() : '';
    const show = (selector) => {
        const el = document.querySelector(selector);
        if (el) el.style.display = 'list-item';
    };

    switch (userType) {
        case 'admin':
            // Lógica de redirecionamento para o admin
            if (window.location.pathname !== '/Inventario' && window.location.pathname !== '/Inventario.html') {
                window.location.href = '/Inventario';
                return; // Para a execução para evitar piscar da página
            }
            show('.admin-menu');
            show('.produto');
            break;
        case 'tecnico':
            show('.tecnico');
            show('.Home');
            show('.produto');
            break;
        case 'professor':
            show('.Home');
            show('.professor');
            show('.Horarios');
            break;
    }
}