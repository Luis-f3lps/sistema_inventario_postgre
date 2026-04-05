// ==========================================
// 1. CARREGAMENTO INICIAL
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    // Carrega dados dos selects
    loadLaboratorios();
    loadProdutosSiglas();
    loadsiglasEntrada();

    // Carrega IDs para o form de edição (Aviso: A rota /api/entradas precisa ser criada no app.js!)
    loadIdsEntrada();

    // Inicia controle de sessão
    loadLoggedInUser();
});

// ==========================================
// 2. NAVEGAÇÃO E AUTENTICAÇÃO
// ==========================================
function opentab(tabname) {
    document.querySelectorAll('.tab-links').forEach(link => link.classList.remove('active-link'));
    document.querySelectorAll('.tab-contents').forEach(content => content.classList.remove('active-tab'));

    const tab = document.getElementById(tabname);
    if (tab) tab.classList.add('active-tab');

    event.currentTarget.classList.add('active-link');
}

async function loadLoggedInUser() {
    try {
        const response = await fetch('/api/usuario-logado');
        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }
        const data = await response.json();

        // Espera o menu carregar para preencher o nome
        const preencherNome = () => {
            const userNameElement = document.getElementById('user-name-text');
            if (userNameElement) {
                userNameElement.innerHTML = data.nome || "Usuário";
            } else {
                setTimeout(preencherNome, 100);
            }
        };
        preencherNome();

        // Configura visibilidade do menu e abas baseado no cargo
        const atualizarMenu = () => {
            const adminMenu = document.querySelector('.admin-menu');
            if (adminMenu || document.querySelector('.tecnico')) {
                const userType = data.tipo_usuario ? data.tipo_usuario.trim().toLowerCase() : '';

                switch (userType) {
                    case 'admin':
                    case 'administrador':
                        document.querySelectorAll('.admin-menu, #sidemenu > li.submenu.produto').forEach(el => el.style.display = 'block');
                        const abaEdicao = document.querySelector('.tab-links[onclick*="Aba02"]');
                        if (abaEdicao) abaEdicao.style.display = 'block'; // <--- SOLUÇÃO AQUI
                        break;
                    case 'tecnico':
                        document.querySelectorAll('.tecnico, .Home, #sidemenu > li.submenu.produto').forEach(el => el.style.display = 'block');
                        break;
                    case 'professor':
                        document.querySelectorAll('.Home, .professor, .Horarios').forEach(el => el.style.display = 'block');
                        break;
                }
            } else {
                setTimeout(atualizarMenu, 100);
            }
        };
        atualizarMenu();

    } catch (error) {
        console.error('Erro ao carregar usuário logado:', error);
    }
}

// ==========================================
// 3. BUSCA DE DADOS (SELECTS)
// ==========================================
function loadLaboratorios() {
    fetch('/api/lab')
        .then(response => response.ok ? response.json() : Promise.reject('Erro na rede'))
        .then(data => {
            const select = document.getElementById('laboratorio-select');
            if (!select) return;
            select.innerHTML = '<option value="">Selecione um laboratório</option>';

            data.forEach(lab => {
                const option = document.createElement('option');
                option.value = lab.id_laboratorio;
                option.textContent = lab.nome_laboratorio;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar laboratórios:', error));
}

function loadProdutosSiglas() {
    fetch('/api/est')
        .then(response => response.ok ? response.json() : Promise.reject('Erro na rede'))
        .then(data => {
            const select = document.getElementById('sigla-select');
            if (!select) return;
            select.innerHTML = '<option value="">Selecione um produto</option>';

            data.forEach(produto => {
                const option = document.createElement('option');
                option.value = produto.id_produto;
                option.textContent = produto.sigla;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar produto:', error));
}

function loadsiglasEntrada() {
    fetch('/api/siglas')
        .then(response => response.ok ? response.json() : Promise.reject('Erro na rede'))
        .then(data => {
            const select = document.getElementById('produto-entrada-select');
            if (!select) return;
            select.innerHTML = '<option value="">Selecione um produto</option>';

            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id_produto;
                option.textContent = item.sigla;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar siglas:', error));
}

function loadIdsEntrada() {
    fetch('/api/entradas')
        .then(response => response.ok ? response.json() : Promise.reject('Rota /api/entradas não encontrada no backend.'))
        .then(data => {
            const idSelect = document.getElementById('id-select');
            if (!idSelect) return;
            idSelect.innerHTML = '<option value="">Selecione o ID</option>';

            data.forEach(entrada => {
                const option = document.createElement('option');
                option.value = entrada.id;
                option.textContent = entrada.id;
                idSelect.appendChild(option);
            });
        })
        .catch(error => console.warn('Aviso:', error)); // Alterado para alertar, mas não crashar
}

// ==========================================
// 4. FORMULÁRIOS E AÇÕES (CRUD)
// ==========================================

// Registrar NOVA Entrada
document.getElementById('entrada-form')?.addEventListener('submit', function (event) {
    event.preventDefault();

    const idproduto = document.getElementById('produto-entrada-select').value;
    const quantidade = parseInt(document.getElementById('quantidade-entrada').value, 10);
    const dataEntrada = document.getElementById('data-entrada').value;
    const descricao = document.getElementById('descricao-entrada').value;

    if (!idproduto || isNaN(quantidade) || quantidade <= 0 || !dataEntrada || !descricao) {
        alert('Todos os campos são obrigatórios e a quantidade deve ser maior que zero.');
        return;
    }

    const entradaData = { id_produto: idproduto, quantidade, data_entrada: dataEntrada, descricao };

    fetch('/api/registrar_entrada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entradaData),
    })
        .then(response => response.json())
        .then(result => {
            if (result.message) {
                alert(result.message);
                document.getElementById('entrada-form').reset();
            } else {
                alert(result.error || 'Erro ao registrar a entrada.');
            }
        })
        .catch(error => console.error('Erro ao registrar entrada:', error));
});

// Registrar Consumo (Saída)
document.getElementById('consumo-form')?.addEventListener('submit', function (event) {
    event.preventDefault();

    const idproduto = document.getElementById('sigla-select').value;
    const quantidade = parseInt(document.getElementById('quantidade').value, 10);
    const laboratorio = document.getElementById('laboratorio-select').value;
    const data_consumo = document.getElementById('data_consumo').value;
    const descricao = document.getElementById('descricao_comsumo').value;

    if (!idproduto || isNaN(quantidade) || quantidade <= 0 || !laboratorio || !data_consumo || !descricao) {
        alert('Por favor, preencha todos os campos e a quantidade deve ser maior que zero.');
        return;
    }

    const consumoData = { data_consumo, id_produto: idproduto, id_laboratorio: laboratorio, quantidade, descricao };

    fetch('/api/registrar_consumo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consumoData)
    })
        .then(response => response.json())
        .then(result => {
            if (result.message) {
                alert(result.message);
                document.getElementById('consumo-form').reset();
            } else {
                alert(result.error || 'Erro ao registrar consumo.');
            }
        })
        .catch(error => console.error('Erro ao registrar consumo:', error));
});

// Editar Entrada Existente (Aviso: Requer alterar o ID no HTML para "editar-entrada-form")
document.getElementById('editar-entrada-form')?.addEventListener('submit', function (event) {
    event.preventDefault();

    const idEntrada = document.getElementById('id-select').value;
    const idProduto = document.getElementById('produto-entrada-select-edit').value; // Cuidado com IDs duplicados no HTML!
    const quantidade = parseInt(document.getElementById('quantidade-entrada-edit').value);
    const dataEntrada = document.getElementById('data-entrada-edit').value;

    if (!idEntrada || !idProduto || !quantidade || !dataEntrada) {
        alert('Todos os campos são obrigatórios.');
        return;
    }

    const entradaData = { id_entrada: idEntrada, id_produto: idProduto, quantidade, data_entrada: dataEntrada };

    fetch('/api/edita_registrar_entrada', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entradaData),
    })
        .then(response => response.json())
        .then(result => {
            if (result.message) {
                alert(result.message);
                document.getElementById('editar-entrada-form').reset();
            } else {
                alert(result.error);
            }
        })
        .catch(error => console.error('Erro ao atualizar entrada:', error));
});