const paginasAdmin = [
    '/Usuarios', 
    '/Produto',
    '/Disciplinas',
    '/Laboratorio'
];

function mostrarAvisoDeAcessoNegado(motivo) {
    console.warn("Acesso negado disparado! O cargo lido foi:", motivo);
    
    const overlay = document.createElement('div');
    overlay.className = 'acesso-negado-overlay';

    const caixaAviso = document.createElement('div');
    caixaAviso.className = 'acesso-negado-caixa';

    caixaAviso.innerHTML = `
        <i class="fas fa-lock" style="font-size: 40px; color: #dc3545; margin-bottom: 15px;"></i>
        <h2 style="color: #333;">Acesso Restrito</h2>
        <p style="color: #666; margin-bottom: 10px;">Você não tem permissão para aceder a esta página.</p>
        <p style="font-size: 11px; color: red;">(Debug - Cargo detectado: <b>${motivo}</b>)</p>
    `;

    overlay.appendChild(caixaAviso);
    document.body.appendChild(overlay);

    // O redirecionamento acontece após 3 segundos
    setTimeout(() => {
        window.location.href = '/Inventario'; 
    }, 3000); 
}

async function verificarAcessoAdmin() {
    const paginaAtual = window.location.pathname;
    
    if (paginasAdmin.some(pagina => paginaAtual.includes(pagina))) {
        try {
            const response = await fetch('/api/usuario-logado');
            if (!response.ok) {
                console.error("Auth Guard: Usuário não está logado na API.");
                window.location.href = '/login.html';
                return;
            }

            const utilizador = await response.json();
            console.log("Auth Guard - Dados do Usuário:", utilizador);

            // Pega o tipo_usuario, tira espaços extras e joga pra minúsculo
            const tipoUser = utilizador.tipo_usuario ? utilizador.tipo_usuario.trim().toLowerCase() : 'vazio_ou_nulo';

            // Só bloqueia se não for admin e não for administrador
            if (tipoUser !== 'admin' && tipoUser !== 'administrador') {
                mostrarAvisoDeAcessoNegado(tipoUser); 
            }

        } catch (error) {
            console.error("Erro no auth-guard:", error);
            // Removi o redirecionamento aqui para não te chutar caso a rede apenas dê um engasgo
        }
    }
}

document.addEventListener('DOMContentLoaded', verificarAcessoAdmin);