document.addEventListener('DOMContentLoaded', () => {
    const formCadastro = document.getElementById('form-cadastro');

    if (formCadastro) {
        formCadastro.addEventListener('submit', async function(event) {
            event.preventDefault(); // Evita o recarregamento padrão da página

            const nome_usuario = document.getElementById('nome_usuario').value;
            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;
            const tipo_usuario = document.getElementById('tipo_usuario').value;

            if (senha.length > 12) {
                exibirMensagem('A senha não pode ter mais de 12 caracteres.', 'red');
                return;
            }

            const dados = { nome_usuario, email, senha, tipo_usuario };

            try {
                const response = await fetch('/api/usuarios', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dados)
                });

                const result = await response.json();

                if (response.ok) {
                    exibirMensagem('Usuário cadastrado com sucesso!', 'green');
                    formCadastro.reset(); // Limpa os campos do formulário
                } else {
                    exibirMensagem(result.error || 'Erro ao cadastrar usuário.', 'red');
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                exibirMensagem('Erro de conexão com o servidor.', 'red');
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