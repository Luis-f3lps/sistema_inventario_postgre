// ==========================================
// 1. CARREGAMENTO INICIAL (VIA MENU READY)
// ==========================================
document.addEventListener('menuReady', (event) => {
    const { userData } = event.detail;
    inicializarPaginaProduto(userData);
});

let loggedInUser = null;

function inicializarPaginaProduto(userData) {
    loggedInUser = userData;

    loadproduto(1);
    loadProdutosSelect();
    carregarsiglas();
}


// ==========================================
// 2. NAVEGAÇÃO DE ABAS
// ==========================================
function opentab(tabname) {
    const tablinks = document.getElementsByClassName("tab-links");
    const tabcontents = document.getElementsByClassName("tab-contents");

    Array.from(tablinks).forEach(link => link.classList.remove("active-link"));
    Array.from(tabcontents).forEach(content => content.classList.remove("active-tab"));

    const targetTab = document.getElementById(tabname);
    if (targetTab) targetTab.classList.add("active-tab");

    // Adiciona a classe ativa no botão clicado usando o evento global
    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active-link");
    }
}

// ==========================================
// 3. BUSCA E RENDERIZAÇÃO DE DADOS
// ==========================================
function loadproduto(page = 1, limit = 20) {
    fetch(`/api/produtoPag?page=${page}&limit=${limit}`)
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/login.html';
                throw new Error('Sessão expirada');
            }
            if (!response.ok) throw new Error('Erro ao buscar a página de produtos');
            return response.json();
        })
        .then(data => {
            const tbody = document.getElementById('produto-tbody');
            if (!tbody) return;

            tbody.innerHTML = '';
            
            if (!data.data || data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum produto cadastrado.</td></tr>';
                return;
            }

            data.data.forEach(produto => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${produto.sigla || 'N/A'}</td>
                    <td>${produto.nome_produto || 'N/A'}</td>
                    <td>${produto.concentracao || 'N/A'}</td>
                    <td>${produto.densidade || 'N/A'}</td>
                    <td class="numeric">${produto.quantidade || '0'}</td>
                    <td>${produto.tipo_unidade_produto || 'N/A'}</td>
                    <td>${produto.ncm || 'N/A'}</td>
                `;
                tbody.appendChild(tr);
            });

            updatePagination(data.totalPages, data.currentPage);
        })
        .catch(error => console.error('Erro ao carregar produtos:', error));
}

function updatePagination(totalPages, currentPage) {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;

    paginationDiv.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.classList.add('pagination-button');
        if (i === currentPage) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            loadproduto(i);
        });
        paginationDiv.appendChild(button);
    }
}

function loadProdutosSelect() {
    fetch('/api/produto')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('id_produto');
            if (!select) return; 

            select.innerHTML = ''; 

            if (Array.isArray(data)) {
                data.forEach(produto => {
                    const option = document.createElement('option');
                    option.value = produto.id_produto;
                    option.textContent = produto.nome_produto || 'N/A';
                    select.appendChild(option);
                });
            }
        })
        .catch(error => console.error('Erro ao carregar produtos para select:', error));
}

function carregarsiglas() {
    fetch('/api/siglas')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('sigla-select');
            if (!select) return;

            select.innerHTML = '<option value="">Selecione um produto</option>';

            if (Array.isArray(data)) {
                data.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.id_produto;
                    option.textContent = item.sigla;
                    select.appendChild(option);
                });
            }
        })
        .catch(error => console.error('Erro ao carregar siglas:', error));
}

// ==========================================
// 4. FORMULÁRIOS E AÇÕES (CRUD)
// ==========================================
document.getElementById('add-produto-form')?.addEventListener('submit', function (event) {
    event.preventDefault();

    const data = {
        sigla: document.getElementById('sigla').value,
        concentracao: document.getElementById('concentracao').value,
        densidade: document.getElementById('densidade').value,
        nome_produto: document.getElementById('nome_produto').value,
        tipo_unidade_produto: document.getElementById('tipo_unidade_produto').value,
        ncm: document.getElementById('ncm').value,
        quantidade: document.getElementById('quantidade').value
    };

    fetch('/api/addproduto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
        .then(result => {
            if (result.message) {
                alert(result.message);
                document.getElementById('add-produto-form').reset();
                loadproduto(1); // Atualiza a tabela na página 1
                carregarsiglas(); // Atualiza a lista de siglas
            } else {
                alert(result.error);
            }
        })
        .catch(error => console.error('Erro ao adicionar produto:', error));
});

document.getElementById('delete-produto-form')?.addEventListener('submit', function (event) {
    event.preventDefault();

    const idproduto = document.getElementById('sigla-select').value;
    if (!idproduto) {
        alert('Por favor, selecione uma sigla válida.');
        return;
    }

    if (confirm('Tem certeza que deseja excluir este produto?')) {
        excluirproduto(idproduto);
    }
});

function excluirproduto(idproduto) {
    fetch(`/api/excluir-produto/${idproduto}`, {
        method: 'DELETE',
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Erro ao excluir o produto');
                });
            }
            return response.json();
        })
        .then(data => {
            alert(data.message || 'Produto excluído com sucesso');
            loadproduto(1);
            carregarsiglas();
        })
        .catch(error => {
            alert(`Erro: ${error.message}`);
            console.error('Erro:', error);
        });
}

// ==========================================
// 5. EXPORTAÇÃO
// ==========================================
function geradorPdfproduto() {
    fetch('/generate-pdf-produto', {
        method: 'GET',
    })
        .then(response => {
            if (response.ok) return response.blob();
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