document.addEventListener('DOMContentLoaded', () => {
    loadproduto();
    loadProdutosSelect();
    loadLoggedInUser();
});

// Efeito sanfona nos menus laterais
document.querySelectorAll('.submenu > a').forEach(menu => {
    menu.addEventListener('click', function (e) {
        e.preventDefault();
        const submenuItems = this.nextElementSibling;
        if (submenuItems) submenuItems.classList.toggle('open');
        this.querySelector('.fas.fa-chevron-down')?.classList.toggle('rotate');
    });
});

function opentab(tabname) {
    const tablinks = document.getElementsByClassName("tab-links");
    const tabcontents = document.getElementsByClassName("tab-contents");

    Array.from(tablinks).forEach(link => link.classList.remove("active-link"));
    Array.from(tabcontents).forEach(content => content.classList.remove("active-tab"));

    const targetTab = document.getElementById(tabname);
    if (targetTab) targetTab.classList.add("active-tab");

    const clickedLink = document.querySelector(`.tab-links[onclick*="${tabname}"]`);
    if (clickedLink) clickedLink.classList.add("active-link");
}

// Busca o usuário logado com sistema de espera para o menu
async function loadLoggedInUser() {
    try {
        const response = await fetch('/api/usuario-logado');
        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }
        const data = await response.json();

        // Função recursiva para esperar o menu carregar
        const preencherNome = () => {
            const userNameElement = document.getElementById("user-name-text");
            if (userNameElement) {
                userNameElement.innerHTML = data.nome || "Usuário";
            } else {
                setTimeout(preencherNome, 100);
            }
        };
        preencherNome();

        // Libera os botões do menu baseado no cargo
        const atualizarMenu = () => {
            const adminMenu = document.querySelector(".admin-menu");
            if (adminMenu || document.querySelector(".tecnico")) {
                const userType = data.tipo_usuario ? data.tipo_usuario.trim().toLowerCase() : "";

                if (userType === "admin" || userType === "administrador") {
                    document.querySelectorAll(".admin-menu, .produto").forEach(el => el.style.display = "block");
                } else if (userType === "tecnico") {
                    document.querySelectorAll(".tecnico, .Home, .produto").forEach(el => el.style.display = "block");
                } else if (userType === "professor") {
                    document.querySelectorAll(".professor, .Home, .Horarios").forEach(el => el.style.display = "block");
                }
            } else {
                setTimeout(atualizarMenu, 100);
            }
        };
        atualizarMenu();

    } catch (error) {
        console.error("Erro ao carregar usuário logado:", error);
    }
}

// Carrega os produtos da tabela
function loadproduto(page = 1, limit = 20) {
    fetch(`/api/produtoPag?page=${page}&limit=${limit}`)
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/login.html';
                throw new Error('Sessão expirada');
            }
            if (!response.ok) throw new Error('Erro na rede');
            return response.json();
        })
        .then(data => {
            const tbody = document.getElementById('produto-tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            
            if (!data.data || data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum produto encontrado.</td></tr>';
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

// Carrega os produtos para opções de select
function loadProdutosSelect() {
    fetch('/api/produto')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('id_produto');
            if (!select) return;
            select.innerHTML = '';

            data.forEach(produto => {
                const option = document.createElement('option');
                option.value = produto.id_produto;
                option.textContent = produto.nome_produto;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar produtos:', error));
}

// Gerencia a navegação das páginas da tabela
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
        button.addEventListener('click', () => loadproduto(i));
        paginationDiv.appendChild(button);
    }
}

// Exportação em PDF
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