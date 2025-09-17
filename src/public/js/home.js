// Ouve o evento do menu.js para saber quando começar a trabalhar
document.addEventListener('menuReady', (event) => {
    const { userData } = event.detail;
    inicializarDashboard(userData);
});

// ===================================================================
// VARIÁVEIS DE ESTADO DO CALENDÁRIO
// ===================================================================
let mesExibido;
let anoExibido;
let todasAsAulas = []; // Guarda os dados das aulas para o calendário

/**
 * Orquestra a exibição e o carregamento dos painéis e da tabela.
 */
function inicializarDashboard(userData) {
    // Define o estado inicial do calendário para o mês e ano atuais
    const hoje = new Date();
    mesExibido = hoje.getMonth();
    anoExibido = hoje.getFullYear();

    // Configura os cliques dos botões de navegação do calendário
    const btnAnterior = document.getElementById('btn-mes-anterior');
    const btnProximo = document.getElementById('btn-proximo-mes');
    if (btnAnterior) btnAnterior.addEventListener('click', mostrarMesAnterior);
    if (btnProximo) btnProximo.addEventListener('click', mostrarProximoMes);

    // Mostra/esconde painéis com base no perfil
    const userType = userData.tipo_usuario ? userData.tipo_usuario.trim().toLowerCase() : '';
    const showElement = (selector) => {
        const el = document.querySelector(selector);
        if (el) el.style.display = 'block';
    };

    document.querySelectorAll('.cartao-painel, .painel-minhas-aulas').forEach(el => el.style.display = 'none');

    switch (userType) {
        case 'tecnico':
            showElement('.cartao-aulas-tecnico');
            showElement('.cartao-meus-laboratorios');
            break;
        case 'professor':
            showElement('.cartao-aulas-autorizadas');
            showElement('.painel-minhas-aulas');
            break;
    }

    // Carrega os dados para os painéis visíveis
    carregarDadosDosPaineis(userType);

    // Carrega a tabela do professor
    if (userType === 'professor') {
        loadMyRequests();
    }
}

/**
 * Funções de navegação do calendário.
 */
function mostrarMesAnterior() {
    mesExibido--;
    if (mesExibido < 0) {
        mesExibido = 11;
        anoExibido--;
    }
    renderizarCalendario(todasAsAulas, anoExibido, mesExibido);
}

function mostrarProximoMes() {
    mesExibido++;
    if (mesExibido > 11) {
        mesExibido = 0;
        anoExibido++;
    }
    renderizarCalendario(todasAsAulas, anoExibido, mesExibido);
}

/**
 * Busca os dados para os painéis com base no tipo de usuário.
 */
function carregarDadosDosPaineis(userType) {
    const promises = [];

    if (userType === 'professor') {
        promises.push(fetch('/api/dashboard/aulas-autorizadas').then(res => res.json()));
    }
    if (userType === 'tecnico') {
        promises.push(fetch('/api/dashboard/meus-laboratorios').then(res => res.json()));
        promises.push(fetch('/api/aulas-meus-laboratorios').then(res => res.json()));
    }

    if (promises.length === 0) return;

    Promise.all(promises).then(results => {
        if (userType === 'professor') {
            todasAsAulas = results[0];
            renderizarCalendario(todasAsAulas, anoExibido, mesExibido);
        }
        if (userType === 'tecnico') {
            renderizarMeusLaboratorios(results[0]);
            renderizarAulasNosMeusLaboratorios(results[1]);
        }
    }).catch(error => console.error('Erro ao carregar dados dos painéis:', error));
}

// ===================================================================
// FUNÇÃO AUXILIAR (REUTILIZÁVEL)
// ===================================================================
/**
 * Formata um link de roteiro para garantir que seja externo e abre em nova aba.
 */
function formatarLinkRoteiro(url, textoLink = 'Ver') {
    if (!url) {
        return 'N/A';
    }
    let linkCorrigido = url;
    if (!/^(https?:\/\/|^\/\/)/i.test(linkCorrigido)) {
        linkCorrigido = `//${linkCorrigido}`;
    }
    return `<a href="${linkCorrigido}" target="_blank" class="link-roteiro">${textoLink}</a>`;
}

// ===================================================================
// FUNÇÕES DE RENDERIZAÇÃO
// ===================================================================

/**
 * Carrega a tabela de solicitações do professor.
 */
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
            tbody.innerHTML = `<tr><td colspan="7">Erro ao carregar dados.</td></tr>`;
        }
    }
}

/**
 * Renderiza a tabela de solicitações do professor.
 */
function renderTable(requests) {
    const tbody = document.getElementById("minhas-aulas-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (requests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center;">Você não tem nenhuma solicitação futura.</td></tr>`;
        return;
    }
    requests.forEach(r => {
        const tr = document.createElement("tr");
        const dataFormatada = new Date(r.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        const horaInicio = r.hora_inicio ? r.hora_inicio.slice(0, 5) : 'N/A';
        const horaFim = r.hora_fim ? r.hora_fim.slice(0, 5) : 'N/A';
        const linkRoteiroHtml = formatarLinkRoteiro(r.link_roteiro, 'Ver');

        tr.innerHTML = `
            <td>${r.nome_laboratorio}</td>
            <td>${r.nome_disciplina}</td>
            <td>${dataFormatada}</td>
            <td>${horaInicio} - ${horaFim}</td>
            <td>${r.precisa_tecnico ? "Sim" : "Não"}</td>
            <td><span class="etiqueta-status status-${r.status}">${r.status}</span></td>
            <td>${linkRoteiroHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Renderiza o CALENDÁRIO para um mês e ano específicos.
 */
function renderizarCalendario(aulas, ano, mes) {
    const grid = document.getElementById('calendario-grid');
    const titulo = document.getElementById('calendario-titulo');
    if (!grid || !titulo) return;

    const dataBase = new Date(ano, mes, 1);
    const nomeDoMes = dataBase.toLocaleString('pt-BR', { month: 'long' });
    titulo.textContent = `${nomeDoMes.toUpperCase()} • ${ano}`;

    const aulasPorDia = {};
    aulas.forEach(aula => {
        const dataAula = new Date(aula.data);
        if (dataAula.getMonth() === mes && dataAula.getFullYear() === ano) {
            const dia = dataAula.getUTCDate();
            if (!aulasPorDia[dia]) aulasPorDia[dia] = [];
            aulasPorDia[dia].push(aula);
        }
    });

    const primeiroDiaDoMes = dataBase.getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const hoje = new Date();
    grid.innerHTML = '';

    for (let i = 0; i < primeiroDiaDoMes; i++) {
        grid.innerHTML += `<div class="dia-calendario dia-vazio"></div>`;
    }

    for (let dia = 1; dia <= diasNoMes; dia++) {
        let classesCss = "dia-calendario";
        let eventosDoDia = '';

        if (dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()) {
            classesCss += " hoje";
        }
        if (aulasPorDia[dia]) {
            classesCss += " tem-aula";
            eventosDoDia = `<div class="tooltip">${aulasPorDia[dia].map(a => 
                `<p><strong>${a.hora_inicio.slice(0,5)}:</strong> ${a.nome_disciplina}</p>`
            ).join('')}</div>`;
        }

        grid.innerHTML += `<div class="${classesCss}"><span>${dia}</span>${eventosDoDia}</div>`;
    }
}

/**
 * Renderiza a lista de laboratórios do técnico.
 */
function renderizarMeusLaboratorios(laboratorios) {
    const lista = document.getElementById('lista-meus-laboratorios');
    if (!lista) return;
    if (laboratorios.length === 0) {
        lista.innerHTML = '<li>Você não é responsável por nenhum laboratório.</li>'; 
        return;
    }
    lista.innerHTML = laboratorios.map(l => `<li>${l.nome_laboratorio}</li>`).join('');
}

/**
 * Renderiza a tabela de aulas nos laboratórios do técnico.
 */
function renderizarAulasNosMeusLaboratorios(aulas) {
    const tbody = document.getElementById('corpo-tabela-aulas-tecnico');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!aulas || aulas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">Nenhuma aula futura autorizada nos seus laboratórios.</td></tr>';
        return;
    }
    aulas.forEach(aula => {
        const tr = document.createElement('tr');
        const dataFormatada = new Date(aula.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        const horaInicio = aula.hora_inicio.slice(0, 5);
        const horaFim = aula.hora_fim.slice(0, 5);
        const precisaTecnicoTexto = aula.precisa_tecnico ? 'Sim' : 'Não';
        const linkRoteiroHtml = formatarLinkRoteiro(aula.link_roteiro, 'Ver Roteiro');

        tr.innerHTML = `
            <td>${aula.nome_laboratorio}</td>
            <td>${aula.nome_disciplina}</td>
            <td>${aula.nome_professor}</td>
            <td>${dataFormatada}</td>
            <td>${horaInicio} - ${horaFim}</td>
            <td>${aula.numero_discentes}</td>
            <td>${precisaTecnicoTexto}</td>
            <td>${linkRoteiroHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}