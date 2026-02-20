document.addEventListener('DOMContentLoaded', () => {
    inicializarMenuEAutenticacao();
});

async function inicializarMenuEAutenticacao() {

    const menuContainer = document.getElementById('menu-container');
    if (menuContainer) {
        try {
            const response = await fetch('menu.html');
            if (response.ok) {
                menuContainer.innerHTML = await response.text();
            } else {
                menuContainer.innerHTML = '<p style="color: red; text-align: center;">Erro: menu.html não pôde ser carregado.</p>';
            }
        } catch (error) {
            console.error("Erro ao carregar menu.html:", error);
        }
    } else {
        console.error('O elemento <div id="menu-container"></div> não foi encontrado no seu HTML principal.');
        return;
    }

    const userData = await verificarLogin();
    if (!userData) return;

    ativarFuncionalidadeMenu();
    preencherDadosDoMenu(userData);

    document.dispatchEvent(new CustomEvent('menuReady', { detail: { userData } }));
}


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

function ativarFuncionalidadeMenu() {
    const navMenu = document.querySelector("nav"); 
    if (!navMenu) return;

    const openMenuBtn = document.querySelector(".fa-bars");
    const closeMenuBtn = navMenu.querySelector(".fa-circle-xmark");

    if (openMenuBtn) openMenuBtn.addEventListener('click', () => navMenu.style.left = "0px");
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', () => navMenu.style.left = "-100%");

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

function preencherDadosDoMenu(userData) {
    const userNameElement = document.getElementById('user-name-text');
    if (userNameElement) {
        userNameElement.textContent = userData.nome_usuario || userData.nome || "Usuário";
    }

    const userType = userData.tipo_usuario ? userData.tipo_usuario.trim().toLowerCase() : '';

    const showMenuItem = (selector) => {
        const el = document.querySelector(selector);
        if (el) el.style.display = 'block'; 
    };
    
    const showDashboardCard = (selector) => {
        const el = document.querySelector(selector);
        if (el) el.style.display = 'block';
    };

    document.querySelectorAll('.cartao-painel').forEach(card => card.style.display = 'none');

    switch (userType) {
        case 'admin':
        case 'administrador': 
            showMenuItem('.admin-menu');
            showMenuItem('.produto');
            break;

        case 'tecnico':
            showMenuItem('.tecnico');
            showMenuItem('.Home');
            showMenuItem('.produto');
            showDashboardCard('.cartao-aulas-tecnico');
            showDashboardCard('.cartao-meus-laboratorios');
            break;

        case 'professor':
            showMenuItem('.Home');
            showMenuItem('.professor');
            showMenuItem('.Horarios');
            showDashboardCard('.cartao-aulas-autorizadas');
            showDashboardCard('.cartao-solicitacoes');
            break;
    }
}function openmenu() {
    const nav = document.querySelector("nav");
    const menu = document.querySelector(".menu");
    const conteudo = document.querySelector(".conteudo");
    const conteiner = document.querySelector(".container");

    if (nav) {
        nav.style.left = "0px";
    }
    if (menu) {
        menu.style.width = "20%";
    }
    if (conteudo) {
        conteudo.style.width = "80%";
    }
    if (conteiner) {
        conteiner.style.width = "80%";
    }
}

function closemenu() {
    const nav = document.querySelector("nav");
    const menu = document.querySelector(".menu");
    const conteudo = document.querySelector(".conteudo");
    const conteiner = document.querySelector(".container");

    if (window.innerWidth <= 768 && nav) {
        nav.style.left = "-100%";
    }

    if (menu) {
        menu.style.width = "3%";
    }
    if (conteudo) {
        conteudo.style.width = "95%";
    }
    if (conteiner) {
        conteiner.style.width = "95%";
    }
}