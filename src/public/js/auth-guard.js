const paginasAdmin = [
    '/Usuarios', 
    '/Produto',
    '/Disciplinas',
    '/Laboratorio'
];

function mostrarAvisoDeAcessoNegado() {
    const overlay = document.createElement('div');
    overlay.className = 'acesso-negado-overlay';

    const caixaAviso = document.createElement('div');
    caixaAviso.className = 'acesso-negado-caixa';

    caixaAviso.innerHTML = `
        <i class="fas fa-lock"></i>
        <h2>Acesso Restrito</h2>
        <p>Você não tem permissão para aceder a esta página. A redirecionar...</p>
    `;

    overlay.appendChild(caixaAviso);
    document.body.appendChild(overlay);

    setTimeout(() => {
        window.location.href = '/Inventario'; 
    }, 2500); 
}

async function verificarAcessoAdmin() {
    const paginaAtual = window.location.pathname;
    
    if (paginasAdmin.some(pagina => paginaAtual.includes(pagina))) {
        try {
            const response = await fetch('/api/usuario-logado');
            if (!response.ok) {
                window.location.href = '/login.html';
                return;
            }

            const utilizador = await response.json();
            const tipoUser = utilizador.tipo_usuario ? utilizador.tipo_usuario.trim().toLowerCase() : '';

            // Aceita tanto 'admin' quanto 'administrador'
            if (tipoUser !== 'admin' && tipoUser !== 'administrador') {
                mostrarAvisoDeAcessoNegado(); 
            }

        } catch (error) {
            console.error("Erro na verificação de autorização:", error);
            window.location.href = '/Inventario';
        }
    }
}

document.addEventListener('DOMContentLoaded', verificarAcessoAdmin);