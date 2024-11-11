
var sidemenu = document.getElementById("sidemenu");
function openmenu(){
    sidemenu.style.left = "0px";
}
function clossmenu(){
    sidemenu.style.left = "-800px";
}

var tablinks = document.getElementsByClassName("tab-links");
var tabcontents = document.getElementsByClassName("tab-contents");

function opentab(tabname) {
    for (var i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active-link");
    }
    for (var i = 0; i < tabcontents.length; i++) {
        tabcontents[i].classList.remove("active-tab");
        if (tabcontents[i].id === tabname) {
            tabcontents[i].classList.add("active-tab");
        }
    }
    event.currentTarget.classList.add("active-link");
}

document.querySelectorAll('.submenu > a').forEach(menu => {
    menu.addEventListener('click', function(e) {
        e.preventDefault();
        const submenuItems = this.nextElementSibling;
        submenuItems.classList.toggle('open');
        this.querySelector('.fas.fa-chevron-down').classList.toggle('rotate');
    });
});

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


function geradorPdfEntrada() {
    fetch('/generate-pdf-entrada', {
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
        a.download = 'Relatorio_Entrada.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
    })
    .catch(error => {
        console.error('Erro:', error);
        alert('Erro ao gerar o PDF.');
    });
}

function geradorPdfConsumo() {
    const table = document.querySelector('table');
    const originalStyle = table.style;

    table.style.transform = 'scale(1)';
    table.style.transformOrigin = 'top left';
    table.style.width = '100%'; 

    html2canvas(table, { scale: 1 }).then(canvas => {
        table.style = originalStyle; 

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const imgWidth = pdf.internal.pageSize.width; 
        const imgHeight = canvas.height * imgWidth / canvas.width; 
        const pageHeight = pdf.internal.pageSize.height;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        
        pdf.setFontSize(18);
        pdf.text('Relatório de Laboratórios', imgWidth / 2, 15, { align: 'center' });

        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            pdf.addPage();
            position = -heightLeft;
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save('relatorio_entrada.pdf');
    }).catch(error => {
        console.error('Erro ao gerar PDF:', error);
    });
}


function formatDate(dateString) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', options); // Formato dd/mm/yyyy
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('filter-form').addEventListener('submit', function(event) {
        event.preventDefault();
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const laboratorio = document.getElementById('laboratorios-select2').value || 'todos'; // "todos" para não filtrar
        loadConsumos(startDate, endDate, laboratorio);
    });

    function loadConsumos(startDate = '', endDate = '', laboratorio = 'todos') {
        const queryParams = new URLSearchParams({ startDate, endDate, laboratorio });
        fetch(`/api/consumos?${queryParams}`)
            .then(response => response.json())
            .then(data => {
                const tbody = document.getElementById('consumo-tbody');
                tbody.innerHTML = '';
                data.forEach(entry => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${entry.id_consumo || 'N/A'}</td>
                        <td>${formatDate(entry.data_consumo) || 'N/A'}</td>
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

    function formatDate(dateString) {
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    loadConsumos();
    loadtabelaregistraconsumos();
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


document.addEventListener('DOMContentLoaded', function() {
    fetch('/api/tabelaregistraentradaInico')
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('registro-entrada');
            tbody.innerHTML = ''; 
            
            data.forEach(entry => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${entry.id_entrada}</td>
                    <td>${new Date(entry.data_entrada).toLocaleDateString()}</td>
                    <td>${entry.quantidade}</td>
                    <td>${entry.nome_produto}</td>
                    <td>${entry.descricao || 'N/A'}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => console.error('Erro ao carregar registros de entrada:', error));
});



document.getElementById('filter-form2').addEventListener('submit', function(event) {
    event.preventDefault(); // Previne o comportamento padrão do formulário

    const startDate = document.getElementById('entrada-start-date').value;
    const endDate = document.getElementById('entrada-end-date').value;

    if (!startDate || !endDate) {
        alert('Por favor, selecione um período válido.');
        return;
    }

    // Carregar a primeira página com o filtro aplicado
    loadEntradas(1, startDate, endDate);
});

function loadEntradas(page = 1, startDate = '', endDate = '') {
    const url = `/api/tabelaregistraentrada?page=${page}&limit=20&startDate=${startDate}&endDate=${endDate}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Dados recebidos da API:', data); // Debugging: Verificar a resposta da API

            if (Array.isArray(data.data)) {
                updateTable(data.data);
                updatePagination(data.totalPages, data.currentPage, startDate, endDate);
            } else {
                console.error('Formato de resposta inesperado:', data);
                alert('Erro ao carregar registros: Dados recebidos não são no formato esperado.');
            }
        })
        .catch(error => console.error('Erro ao carregar registros de entrada:', error));
}

function updateTable(entries) {
    const tbody = document.getElementById('registro-entrada');
    tbody.innerHTML = ''; 

    if (Array.isArray(entries)) {
        entries.forEach(entry => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${entry.id_entrada || 'N/A'}</td>
                <td>${formatDate(entry.data_entrada) || 'N/A'}</td>
                <td>${entry.quantidade || 'N/A'}</td>
                <td>${entry.nome_produto || 'N/A'}</td>
                <td>${entry.descricao || 'N/A'}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        console.error('Esperava um array de entradas, mas recebeu:', entries);
        alert('Erro ao atualizar tabela: Dados não são no formato esperado.');
    }
}

function geradorPdfEntradatipo2() {
    const startDate = document.getElementById('entrada-start-date').value;
    const endDate = document.getElementById('entrada-end-date').value;

    const url = `/generate-pdf-entradatipo2?start_date=${startDate || ''}&end_date=${endDate || ''}`;

    fetch(url, {
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
        a.download = 'Relatorio_Entrada.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
    })
    .catch(error => {
        console.error('Erro:', error);
        alert('Erro ao gerar o PDF.');
    });
}

function generatePDFConsumo() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const laboratorio = document.getElementById('laboratorios-select2').value || 'todos'; // Pega o valor do select

    const url = `/generate-pdf-consumo?start_date=${encodeURIComponent(startDate || '')}&end_date=${encodeURIComponent(endDate || '')}&laboratorio=${encodeURIComponent(laboratorio)}`;

    console.log('URL da requisição:', url); // Adicione este log para verificar a URL

    fetch(url, {
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
        a.download = 'Relatorio_Consumo.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
    })
    .catch(error => {
        console.error('Erro:', error);
        alert('Erro ao gerar o PDF.');
    });
}

function updatePagination(totalPages, currentPage, startDate = '', endDate = '') {
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = ''; 

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.classList.add('pagination-button');
        if (i === currentPage) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            loadEntradas(i, startDate, endDate); // Carregar a página clicada
        });
        paginationDiv.appendChild(button);
    }
}

// Carregar a primeira página ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    loadEntradas(1); // Carregar a primeira página sem filtro
	loadLaboratorios2();
});

function updatePaginationConsumos(totalPages, currentPage, startDate = '', endDate = '', laboratorio = 'todos') {
    const paginationDiv = document.getElementById('pagination2');
    paginationDiv.innerHTML = ''; 

    // Loop para criar botões de paginação
    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.classList.add('pagination-button');
        
        // Destacar a página atual
        if (i === currentPage) {
            button.classList.add('active');
        }

        // Adicionar evento de clique para carregar a página correspondente
        button.addEventListener('click', () => {
            loadConsumos(i, startDate, endDate, laboratorio); // Carrega a página clicada com filtros
        });

        // Adiciona o botão ao contêiner de paginação
        paginationDiv.appendChild(button);
    }
}

function loadLaboratorios2() {
    fetch('/api/laboratorios')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('laboratorios-select2');
            select.innerHTML = '<option value="">Todos os Laboratórios</option>'; // Adiciona a opção "Todos os Laboratórios"
            data.forEach(laboratorio => {
                const option = document.createElement('option');
                option.value = laboratorio.id_laboratorio;
                option.textContent = laboratorio.nome_laboratorio;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar laboratórios:', error));
}