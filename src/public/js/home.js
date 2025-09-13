// Conteúdo do arquivo: js/home.js (VERSÃO FINAL ATUALIZADA)

/**
 * Ouve o evento do menu.js para iniciar a lógica do dashboard.
 */
document.addEventListener('menuReady', (event) => {
    const { userData } = event.detail;
    inicializarDashboard(userData);
});

/**
 * Orquestra a exibição e o carregamento dos painéis e da tabela.
 */
function inicializarDashboard(userData) {
    const userType = userData.tipo_usuario ? userData.tipo_usuario.trim().toLowerCase() : '';

    // Função auxiliar para mostrar/esconder elementos
    const showElement = (selector) => {
        const el = document.querySelector(selector);
        if (el) el.style.display = 'block';
    };

    // Primeiro, esconde tudo para garantir um estado limpo
    document.querySelectorAll('.cartao-painel, .painel-minhas-aulas').forEach(el => el.style.display = 'none');

    // Mostra os elementos corretos para cada perfil
    switch (userType) {
        case 'tecnico':
            showElement('.cartao-aulas-tecnico');
            showElement('.cartao-meus-laboratorios');
            break;
        case 'professor':
            showElement('.cartao-aulas-autorizadas');
            showElement('.painel-minhas-aulas'); // Mostra a div da tabela
            break;
    }

    // Carrega os dados para os painéis que estão visíveis
    carregarDadosDosPaineis(userType);

    // Se for professor, também carrega os dados da tabela principal
    if (userType === 'professor') {
        loadMyRequests();
    }
}

/**
 * Busca os dados para os cartões do painel com base no tipo de usuário.
 */
function carregarDadosDosPaineis(userType) {
    const promises = [];

    // ATUALIZADO: Professor agora só busca as aulas autorizadas
    if (userType === 'professor') {
        promises.push(fetch('/api/dashboard/aulas-autorizadas').then(res => res.json()));
    }
    // Técnico continua igual
    if (userType === 'tecnico') {
        promises.push(fetch('/api/dashboard/meus-laboratorios').then(res => res.json()));
        promises.push(fetch('/api/aulas-meus-laboratorios').then(res => res.json()));
    }

    if (promises.length === 0) return;

    Promise.all(promises).then(results => {
        // ATUALIZADO: renderizarSolicitacoes foi removido
        if (userType === 'professor') {
            renderizarAulasAutorizadas(results[0]);
        }
        if (userType === 'tecnico') {
            renderizarMeusLaboratorios(results[0]);
            renderizarAulasNosMeusLaboratorios(results[1]);
        }
    }).catch(error => console.error('Erro ao carregar dados dos painéis:', error));
}

// --- LÓGICA DA TABELA DO PROFESSOR (MOVIDA PARA CÁ) ---

async function loadMyRequests() {
    try {
        const res = await fetch(`/api/minhas-solicitacoes`);
        if (!res.ok) throw new Error('Erro na rede ao buscar solicitações');
        const data = await res.json();
        renderTable(data);
    } catch (error) {
        console.error('Falha ao carregar solicitações:', error);
        const tbody = document.getElementById("minhas-aulas-tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5">Erro ao carregar dados.</td></tr>`;
        }
    }
}

function renderTable(requests) {
    const tbody = document.getElementById("minhas-aulas-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (requests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Você não tem nenhuma solicitação futura.</td></tr>`;
        return;
    }
    requests.forEach(r => {
        const tr = document.createElement("tr");
        const dataFormatada = new Date(r.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        const horaInicio = r.hora_inicio ? r.hora_inicio.slice(0, 5) : 'N/A';
        const horaFim = r.hora_fim ? r.hora_fim.slice(0, 5) : 'N/A';

        tr.innerHTML = `
            <td>${r.nome_laboratorio}</td>
            <td>${dataFormatada}</td>
            <td>${horaInicio} - ${horaFim}</td>
            <td>${r.precisa_tecnico ? "Sim" : "Não"}</td>
            <td><span class="etiqueta-status status-${r.status}">${r.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarAulasAutorizadas(aulas) {
    const lista = document.getElementById('lista-aulas-autorizadas');
    if (!lista) return;
    if (aulas.length === 0) {
        lista.innerHTML = '<li>Nenhuma aula autorizada futura.</li>'; return;
    }
    lista.innerHTML = aulas.map(a => `
            <li>
                <span>${a.nome_laboratorio}</span>
                <span>${new Date(a.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} | ${a.hora_inicio.slice(0, 5)} - ${a.hora_fim.slice(0, 5)}</span>
            </li>
        `).join('');
}

function renderizarMeusLaboratorios(laboratorios) {
    const lista = document.getElementById('lista-meus-laboratorios');
    if (!lista) return;
    if (laboratorios.length === 0) {
        lista.innerHTML = '<li>Você não é responsável por nenhum laboratório.</li>'; return;
    }
    lista.innerHTML = laboratorios.map(l => `<li>${l.nome_laboratorio}</li>`).join('');
}

function renderizarAulasNosMeusLaboratorios(aulas) {
    const lista = document.getElementById('lista-aulas-nos-meus-laboratorios');
    if (!lista) return;

    lista.innerHTML = '';

    if (!aulas || aulas.length === 0) {
        lista.innerHTML = '<li>Nenhuma aula futura agendada nos seus laboratórios.</li>';
        return;
    }

    lista.innerHTML = aulas.map(aula => {
        const dataFormatada = new Date(aula.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        const horaInicio = aula.hora_inicio.slice(0, 5);
        const horaFim = aula.hora_fim.slice(0, 5);

        const precisaTecnicoTexto = aula.precisa_tecnico ? 'Sim' : 'Não';

        return `
            <li class="item-painel-detalhado">
                <strong >${aula.nome_laboratorio}</strong>
                <span class="detalhe-item-painel" >Professor(a): ${aula.nome_professor}</span>
                <span class="detalhe-item-painel">${dataFormatada} | ${horaInicio} - ${horaFim}</span>
                <span class="detalhe-item-painel">Apoio Técnico: <strong>${precisaTecnicoTexto}</strong></span>
            </li>
        `;
    }).join('');
}
