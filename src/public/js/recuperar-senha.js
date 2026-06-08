document.addEventListener('DOMContentLoaded', () => {
    const formRedefinir = document.getElementById('form-redefinir');
    const btnSubmit = document.getElementById('btn-submit');

    if (formRedefinir) {
        formRedefinir.addEventListener('submit', async function (event) {
            event.preventDefault(); 

            const email = document.getElementById('email').value;
            const novaSenha = document.getElementById('nova_senha').value;
            const confirmaSenha = document.getElementById('confirma_senha').value;

            if (novaSenha !== confirmaSenha) {
                exibirMensagem('As senhas não coincidem!', 'red');
                return;
            }

            if (novaSenha.length > 12) {
                exibirMensagem('A senha deve ter no máximo 12 caracteres.', 'red');
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.innerText = 'Processando...';
            exibirMensagem('', 'transparent');

            try {
                const response = await fetch('/api/recuperar-senha-direto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, nova_senha: novaSenha })
                });

                const result = await response.json();

                if (response.ok) {
                    exibirMensagem('Senha alterada! Sua conta foi desativada e aguarda liberação do admin.', 'green');
                    formRedefinir.reset();
                    
                    // Opcional: Redirecionar pro login após 4 segundos
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 4000);
                } else {
                    exibirMensagem(result.error || 'Erro ao alterar a senha.', 'red');
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                exibirMensagem('Erro de conexão com o servidor.', 'red');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerText = 'Salvar Nova Senha';
            }
        });
    }
});

function exibirMensagem(texto, cor) {
    const mensagemDiv = document.getElementById('mensagem-retorno');
    if (mensagemDiv) {
        mensagemDiv.innerText = texto;
        mensagemDiv.style.color = cor;
        mensagemDiv.style.display = 'block';
    }
}