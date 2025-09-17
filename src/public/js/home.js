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

    // O colspan agora precisa ser 7 (lab, disciplina, data, horário, apoio, status, roteiro)
    if (requests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7">Você não tem nenhuma solicitação futura.</td></tr>`;
        return;
    }
    requests.forEach(r => {
        const tr = document.createElement("tr");
        const dataFormatada = new Date(r.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        const horaInicio = r.hora_inicio ? r.hora_inicio.slice(0, 5) : 'N/A';
        const horaFim = r.hora_fim ? r.hora_fim.slice(0, 5) : 'N/A';
        let linkCorrigido = aula.link_roteiro;
        
        if (linkCorrigido && !/^(https?:\/\/|^\/\/)/i.test(linkCorrigido)) {
            linkCorrigido = `//${linkCorrigido}`;
        }
        
        const linkRoteiroHtml = linkCorrigido
            ? `<a href="${linkCorrigido}" target="_blank" class="link-roteiro">Ver Roteiro</a>`
            : 'N/A';
        tr.innerHTML = `
            <td>${r.nome_laboratorio}</td>
            <td>${r.nome_disciplina}</td>
            <td>${dataFormatada}</td>      <td>${horaInicio} - ${horaFim}</td>
            <td>${r.precisa_tecnico ? "Sim" : "Não"}</td>
            <td><span class="etiqueta-status status-${r.status}">${r.status}</span></td>
            <td>${linkRoteiroHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarAulasAutorizadas(aulas) {
    const lista = document.getElementById('lista-aulas-autorizadas');
    if (!lista) return;
    if (aulas.length === 0) {
        lista.innerHTML = '<li>Nenhuma aula autorizada futura.</li>'; 
        return;
    }
    lista.innerHTML = aulas.map(a => {
        const dataFormatada = new Date(a.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        const horaInicio = a.hora_inicio.slice(0, 5);
        const horaFim = a.hora_fim.slice(0, 5);
        const linkRoteiroHtml = a.link_roteiro 
            ? `<a href="${a.link_roteiro}" target="_blank" class="link-roteiro">Ver Roteiro</a>` 
            : 'N/A';

        return `
            <li class="item-painel-detalhado">
                <strong>${a.nome_laboratorio}</strong>
                <span class="detalhe-item-painel">Disciplina: ${a.nome_disciplina}</span>
                <span class="detalhe-item-painel">${dataFormatada} | ${horaInicio} - ${horaFim}</span>
                <span class="detalhe-item-painel">Roteiro: ${linkRoteiroHtml}</span>
            </li>
        `;
    }).join('');
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
    // 1. Alvo agora é o corpo da nova tabela
    const tbody = document.getElementById('corpo-tabela-aulas-tecnico');
    if (!tbody) return;

    tbody.innerHTML = '';

    // 2. Mensagem de "vazio" ajustada para tabela (colspan com 8 colunas)
    if (!aulas || aulas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Nenhuma aula futura autorizada nos seus laboratórios.</td></tr>';
        return;
    }

    // 3. Lógica de renderização agora cria <tr> e <td>
    aulas.forEach(aula => {
        const tr = document.createElement('tr');

        const dataFormatada = new Date(aula.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        const horaInicio = aula.hora_inicio.slice(0, 5);
        const horaFim = aula.hora_fim.slice(0, 5);
        const precisaTecnicoTexto = aula.precisa_tecnico ? 'Sim' : 'Não';
        let linkCorrigido = aula.link_roteiro;
        
        if (linkCorrigido && !/^(https?:\/\/|^\/\/)/i.test(linkCorrigido)) {
            linkCorrigido = `//${linkCorrigido}`;
        }
        
        const linkRoteiroHtml = linkCorrigido
            ? `<a href="${linkCorrigido}" target="_blank" class="link-roteiro">Ver Roteiro</a>`
            : 'N/A';
        tr.innerHTML = `
            <td>${aula.nome_laboratorio}</td>
            <td>${aula.nome_disciplina}</td>
            <td>${aula.nome_professor}</td>
            <td>${dataFormatada}</td>
            <td>${horaInicio} - ${horaFim}</td>
            <td>${aula.numero_discentes}</td> <td>${precisaTecnicoTexto}</td>
            <td>${linkRoteiroHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}
