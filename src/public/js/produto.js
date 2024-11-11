
var sidemenu = document.getElementById("sidemenu");
function openmenu(){
    sidemenu.style.left = "0px";
}
function clossmenu(){
    sidemenu.style.left = "-800px";
}

function Autenticado() {
    return fetch('/api/check-auth', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => data.Autenticado)
    .catch(() => false);
}

function redirecionarSeNaoAutenticado() {
    Autenticado().then(authenticated => {
        if (!authenticated) {
            window.location.href = 'index.html'; // Redireciona para a página de login
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname !== '/index.html') {
        redirecionarSeNaoAutenticado();
    }
});



// Função para abrir abas
function opentab(tabname) {
    var tablinks = document.getElementsByClassName("tab-links");
    var tabcontents = document.getElementsByClassName("tab-contents");

    for (var i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active-link");
    }
    for (var i = 0; i < tabcontents.length; i++) {
        tabcontents[i].classList.remove("active-tab");
        if (tabcontents[i].id === tabname) {
            tabcontents[i].classList.add("active-tab");
        }
    }
    document.querySelector(`.tab-links[onclick="opentab('${tabname}')"]`).classList.add("active-link");
}

// Função para carregar dados de produtos e preencher a tabela
function loadProdutos(page = 1, limit = 20) { // Ajustando o limite padrão
    fetch(`/api/produtosPag?page=${page}&limit=${limit}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const tbody = document.getElementById('produto-tbody');
            tbody.innerHTML = ''; // Limpar a tabela

            // Verifique se há dados
            if (!data || !data.data || !Array.isArray(data.data)) {
                console.error('Dados inválidos recebidos:', data);
                return;
            }

            data.data.forEach(produto => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${produto.sigla || 'N/A'}</td>
                    <td>${produto.nome_produto || 'N/A'}</td>
                    <td>${produto.concentracao || 'N/A'}</td>
                    <td>${produto.densidade || 'N/A'}</td>
                    <td class="numeric">${produto.quantidade || 'N/A'}</td>
                    <td>${produto.tipo_unidade_produto || 'N/A'}</td>
                    <td>${produto.ncm || 'N/A'}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => console.error('Erro ao carregar produtos:', error));
}



// Chame a função para carregar os usuários
loadProdutos();


// Função para carregar produtos no select
function loadProdutosSelect() {
    fetch('/api/produto')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro na rede ao buscar produtos: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            const select = document.getElementById('id_produto');
            select.innerHTML = ''; // Limpa o select antes

            if (!Array.isArray(data)) {
                console.error('Os dados recebidos não são um array.');
                return;
            }

            data.forEach(produto => {
                const option = document.createElement('option');
                option.value = produto.id_produto; // Certifique-se de que id_produto está disponível
                option.textContent = produto.nome_produto || 'N/A';
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar produtos:', error));
}


// Função para enviar o formulário
document.getElementById('add-produto-form').addEventListener('submit', function(event) {
    event.preventDefault(); 

    // Captura os valores dos campos do formulário
    const sigla = document.getElementById('sigla').value;
    const concentracao = document.getElementById('concentracao').value;
    const densidade = document.getElementById('densidade').value;
    const nome_produto = document.getElementById('nome_produto').value;
    const tipo_unidade_produto = document.getElementById('tipo_unidade_produto').value;
    const ncm = document.getElementById('ncm').value;
    const quantidade = document.getElementById('quantidade').value;

    // Cria o objeto de dados para enviar
    const data = {
        sigla: sigla,
        concentracao: concentracao,
        densidade: densidade,
        nome_produto: nome_produto,
        tipo_unidade_produto: tipo_unidade_produto,
        ncm: ncm,
        quantidade: quantidade
    };

    // Envia os dados para a API
    fetch('/api/addproduto', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(result => {
        if (result.message) {
            alert(result.message); 
            loadProdutos(); // Atualiza a tabela após adicionar o produto
            document.getElementById('add-produto-form').reset();
            loadproduto();
        } else {
            alert(result.error); 
        }
    })
    .catch(error => console.error('Erro ao adicionar produto:', error));
});


// Chamar as funções para carregar produtos e selecionar produtos ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    loadProdutos();       
    loadProdutosSelect();
    loadproduto(); 
});

// menu
document.querySelectorAll('.submenu > a').forEach(menu => {
    menu.addEventListener('click', function(e) {
        e.preventDefault();
        const submenuItems = this.nextElementSibling;
        submenuItems.classList.toggle('open');
        this.querySelector('.fas.fa-chevron-down').classList.toggle('rotate');
    });
});

// Pegar o nome do usuário logado
function loadLoggedInUser() {
  fetch('/api/usuario-logado')
    .then(response => response.json())
    .then(data => {
      const userNameElement = document.getElementById('user-name-text');
      userNameElement.innerHTML = data.nome;
      if (data.tipo_usuario === 'admin') {
        document.querySelector('.admin-menu').style.display = 'block';
      }
    })
    .catch(error => console.error('Erro ao carregar usuário logado:', error));
}
loadLoggedInUser();

// Função para carregar siglas no select
function carregarsiglas() {
    fetch('/api/siglas') // Endpoint para obter a lista de siglas
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('sigla-select');
            select.innerHTML = '<option value="">Selecione um produto</option>'; // Limpa e adiciona a opção padrão

            data.forEach(sigla => {
                const option = document.createElement('option');
                option.value = sigla.id_produto; // Define o valor como o id_produto
                option.textContent = sigla.sigla; // Define o texto como a sigla
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar siglas:', error));
}

// Função para excluir o produto
function excluirproduto(idproduto) {
    fetch(`/api/excluir-produto/${idproduto}`, {
        method: 'DELETE',
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.message || 'Erro desconhecido ao excluir o produto');
            });
        }
        return response.json();
    })
    .then(data => {
        alert(data.message || 'produto excluído com sucesso');
        carregarsiglas(); // Atualiza os siglas após exclusão
    })
    .catch(error => {
        // Mostrar mensagem de erro
        alert(`Erro: ${error.message}`);
        console.error('Erro ao excluir o produto:', error);
    });
}

// Delete-produto-form
    document.getElementById('delete-produto-form').addEventListener('submit', function(event) {
        event.preventDefault();

        const idproduto = document.getElementById('sigla-select').value;
        if (!idproduto) {
            alert('Por favor, selecione um sigla válido.');
            return;
        }

        if (confirm('Tem certeza que deseja excluir este produto?')) {
            excluirproduto(idproduto);
            loadProdutos();
            carregarsiglas(); // Atualiza os siglas 
        }
    });

// Carrega os siglas ao inicializar a página
 document.addEventListener('DOMContentLoaded', carregarsiglas);


 // load produto
    function loadproduto(page = 1, limit = 20) {
    fetch(`/api/produtoPag?page=${page}&limit=${limit}`)
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('produto-tbody');
            tbody.innerHTML = ''; // Limpar a tabela
            data.data.forEach(produto => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${produto.sigla}</td>
                    <td>${produto.concentracao}</td>
                    <td>${produto.densidade}</td>
                    <td>${produto.nome_produto}</td>
                    <td>${produto.quantidade}</td>
                    <td>${produto.tipo_unidade_produto}</td>
                    <td>${produto.ncm}</td>
                `;
                tbody.appendChild(tr);
            });

            updatePagination(data.totalPages, data.currentPage);
        })
        .catch(error => console.error('Erro ao carregar produtos:', error));
}

// Pagination
function updatePagination(totalPages, currentPage) {
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = ''; // Limpar a paginação

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.classList.add('pagination-button');
        if (i === currentPage) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            loadproduto(i); // Carregar a tabela para a página clicada
        });
        paginationDiv.appendChild(button);
    }
}

// Generate-pdf-produto
function geradorPdfproduto() {
            fetch('/generate-pdf-produto', {
                method: 'GET',
            })
            .then(response => {
                if (response.ok) {
                    return response.blob();
                }
                throw new Error('Falha ao gerar o PDF.');
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Relatorio_produto.pdf';
                document.body.appendChild(a);
                a.click();
                a.remove();
            })
            .catch(error => {
                console.error('Erro:', error);
                alert('Erro ao gerar o PDF.');
            });
        }

