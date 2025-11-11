// Passo 1: Defina aqui quais páginas são exclusivas para administradores.
const paginasAdmin = [
    '/Usuarios', // Adapte para os nomes exatos das suas páginas
    '/Produto',
        '/Disciplinas',
    '/Laboratorio'
];

/**
 * Mostra uma mensagem de acesso negado e redireciona o utilizador.
 */
function mostrarAvisoDeAcessoNegado() {
    // Cria os elementos do aviso
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

    // Redireciona para a página de inventário após 2.5 segundos
    setTimeout(() => {
        window.location.href = '/Inventario'; // Redireciona para a página segura
    }, 2500); // 2.5 segundos para o utilizador ler a mensagem
}

/**
 * Verifica se o utilizador está logado e se é um administrador.
 */
async function verificarAcessoAdmin() {
    // Verifica se a página atual é uma das páginas de admin
    const paginaAtual = window.location.pathname;
    if (paginasAdmin.some(pagina => paginaAtual.includes(pagina))) {
        try {
            const response = await fetch('/api/usuario-logado');
            if (!response.ok) {
                // Se não estiver logado, redireciona para o login
                window.location.href = '/login.html';
                return;
            }

            const utilizador = await response.json();

            // A verificação principal: se o tipo de utilizador NÃO for 'admin'...
            if (utilizador.tipo_usuario.trim().toLowerCase() !== 'admin') {
                mostrarAvisoDeAcessoNegado(); // ...mostra o aviso e redireciona.
            }
            // Se for 'admin', não faz nada e a página carrega normalmente.

        } catch (error) {
            console.error("Erro na verificação de autorização:", error);
            // Em caso de erro, redireciona para uma página segura por precaução
            window.location.href = '/Inventario';
        }
    }
}

// Executa a verificação assim que a página é carregada
document.addEventListener('DOMContentLoaded', verificarAcessoAdmin);