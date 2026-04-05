// ==========================================
// 1. CARREGAMENTO INICIAL
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    // Carrega a sessão do usuário (com trava de espera)
    loadLoggedInUser();

    // Carrega as opções do select de laboratórios
    loadLaboratorios2();

    // Carrega as tabelas iniciais
    loadConsumos();
    loadEntradas(1); 
});

// Utilitário global para formatar data (DD/MM/AAAA)
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
}

// ==========================================
// 2. NAVEGAÇÃO E AUTENTICAÇÃO
// ==========================================
function opentab(tabname) {
    const tablinks = document.getElementsByClassName("tab-links");
    const tabcontents = document.getElementsByClassName("tab-contents");

    Array.from(tablinks).forEach(link => link.classList.remove("active-link"));
    Array.from(tabcontents).forEach(content => content.classList.remove("active-tab"));

    const targetTab = document.getElementById(tabname);
    if (targetTab) targetTab.classList.add("active-tab");

    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active-link");
    }
}

async function loadLoggedInUser() {
    try {
        const response = await fetch('/api/usuario-logado');
        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }
        const data = await response.json();

        // Espera o menu carregar antes de inserir o nome
        const preencherNome = () => {
            const userNameElement = document.getElementById('user-name-text');
            if (userNameElement) {
                userNameElement.innerHTML = data.nome || "Usuário";
            } else {
                setTimeout(preencherNome, 100);
            }
        };
        preencherNome();

        // Controla a visibilidade do menu
        const atualizarMenu = () => {
            const adminMenu = document.querySelector('.admin-menu');
            if (adminMenu || document.querySelector('.tecnico')) {
                const userType = data.tipo_usuario ? data.tipo_usuario.trim().toLowerCase() : '';

                if (userType === 'admin' || userType === 'administrador') {
                    document.querySelectorAll('.admin-menu, .produto').forEach(el => el.style.display = 'block');
                } else if (userType === 'tecnico') {
                    document.querySelectorAll('.tecnico, .Home, .produto').forEach(el => el.style.display = 'block');
                } else if (userType === 'professor') {
                    document.querySelectorAll('.Home, .professor, .Horarios').forEach(el => el.style.display = 'block');
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
// 3. BUSCA DE DADOS E FILTROS (CONSUMO)
// ==========================================
function loadLaboratorios2() {
    fetch('/api/laboratorios')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('laboratorios-select2');
            if (!select) return;
            select.innerHTML = '<option value="">Todos os Laboratórios</option>';
            data.forEach(laboratorio => {
                const option = document.createElement('option');
                option.value = laboratorio.id_laboratorio;
                option.textContent = laboratorio.nome_laboratorio;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar laboratórios:', error));
}

function loadConsumos(startDate = '', endDate = '', laboratorio = 'todos') {
    const queryParams = new URLSearchParams({ startDate, endDate, laboratorio });
    fetch(`/api/consumos?${queryParams}`)
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('consumo-tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            
            if (!Array.isArray(data) || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Nenhum registro encontrado.</td></tr>';
                return;
            }

            data.forEach(entry => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${entry.id_consumo || 'N/A'}</td>
                    <td>${formatDate(entry.data_consumo)}</td>
                    <td>${entry.sigla || 'N/A'}</td>
                    <td>${entry.nome_produto || 'N/A'}</td>
                    <td>${entry.nome_laboratorio || 'N/A'}</td>
                    <td>${entry.quantidade || 'N/A'}</td>
                    <td>${entry.tipo_unidade_produto || 'N/A'}</td>
                    <td>${entry.descricao || 'N/A'}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => console.error('Erro ao carregar consumos:', error));
}

document.getElementById('filter-form')?.addEventListener('submit', function (event) {
    event.preventDefault();
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const laboratorio = document.getElementById('laboratorios-select2').value || 'todos';
    
    if (startDate && endDate && startDate > endDate) {
        alert("A data inicial não pode ser maior que a final.");
        return;
    }
    
    loadConsumos(startDate, endDate, laboratorio);
});

// ==========================================
// 4. BUSCA DE DADOS E FILTROS (ENTRADAS)
// ==========================================
function loadEntradas(page = 1, startDate = '', endDate = '') {
    const url = `/api/tabelaregistraentrada?page=${page}&limit=20&startDate=${startDate}&endDate=${endDate}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && Array.isArray(data.data)) {
                updateTableEntradas(data.data);
                updatePaginationEntradas(data.totalPages, data.currentPage, startDate, endDate);
            } else {
                updateTableEntradas([]);
            }
        })
        .catch(error => console.error('Erro ao carregar registros de entrada:', error));
}

function updateTableEntradas(entries) {
    const tbody = document.getElementById('registro-entrada');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum registro encontrado.</td></tr>';
        return;
    }

    entries.forEach(entry => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${entry.id_entrada || 'N/A'}</td>
            <td>${formatDate(entry.data_entrada)}</td>
            <td>${entry.quantidade || 'N/A'}</td>
            <td>${entry.nome_produto || 'N/A'}</td>
            <td>${entry.descricao || 'N/A'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updatePaginationEntradas(totalPages, currentPage, startDate = '', endDate = '') {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;
    paginationDiv.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.classList.add('pagination-button');
        if (i === currentPage) button.classList.add('active');
        
        button.addEventListener('click', () => loadEntradas(i, startDate, endDate));
        paginationDiv.appendChild(button);
    }
}

document.getElementById('filter-form2')?.addEventListener('submit', function (event) {
    event.preventDefault();
    const startDate = document.getElementById('entrada-start-date').value;
    const endDate = document.getElementById('entrada-end-date').value;

    if (!startDate || !endDate) {
        alert('Por favor, selecione as datas de início e fim.');
        return;
    }
    if (startDate > endDate) {
        alert("A data inicial não pode ser maior que a final.");
        return;
    }

    loadEntradas(1, startDate, endDate);
});

// ==========================================
// 5. GERAÇÃO DE PDFs (BACKEND)
// ==========================================
function geradorPdfEntradatipo2() {
    const startDate = document.getElementById('entrada-start-date')?.value || '';
    const endDate = document.getElementById('entrada-end-date')?.value || '';

    const url = `/generate-pdf-entradatipo2?start_date=${startDate}&end_date=${endDate}`;

    fetch(url, { method: 'GET' })
        .then(response => {
            if (!response.ok) throw new Error('Falha ao gerar o PDF.');
            return response.blob();
        })
        .then(blob => {
            const urlBlob = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = urlBlob;
            a.download = 'Relatorio_Entrada.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao gerar o PDF. Verifique sua conexão ou tente novamente.');
        });
}

function generatePDFConsumo() {
    const startDate = document.getElementById('start-date')?.value || '';
    const endDate = document.getElementById('end-date')?.value || '';
    const laboratorio = document.getElementById('laboratorios-select2')?.value || 'todos';

    const url = `/generate-pdf-consumo?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&laboratorio=${encodeURIComponent(laboratorio)}`;

    fetch(url, { method: 'GET' })
        .then(response => {
            if (!response.ok) throw new Error('Falha ao gerar o PDF.');
            return response.blob();
        })
        .then(blob => {
            const urlBlob = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = urlBlob;
            a.download = 'Relatorio_Consumo.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao gerar o PDF. Verifique sua conexão ou tente novamente.');
        });
}
