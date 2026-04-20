let loggedInUser = null;
let allRequests = [];
let filtroAtual = 'analisando';

async function loadLoggedInUser() {
    try {
        const response = await fetch('/api/usuario-logado');
        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }
        loggedInUser = await response.json();

        const userNameElement = document.getElementById('user-name-text');
        if (userNameElement) userNameElement.innerHTML = loggedInUser.nome;

        await loadPendingRequests();
    } catch (error) {
        console.error('Erro ao carregar utilizador:', error);
    }
}

async function loadPendingRequests() {
    const tbodyInd = document.getElementById("corpo-tabela-individuais");
    const containerRec = document.getElementById("container-recorrentes");

    if (!loggedInUser) return;

    try {
        const responsavelEmail = loggedInUser.email;
        // 👇 APONTANDO PARA A NOVA ROTA DE SALAS
        const res = await fetch(`/api/requests-salas?responsavel_email=${encodeURIComponent(responsavelEmail)}`);
        if (!res.ok) throw new Error('Erro na rede');

        allRequests = await res.json();
        aplicarFiltroEDesenhar();
    } catch (error) {
        console.error('Falha ao carregar solicitações:', error);
        tbodyInd.innerHTML = `<p style="text-align:center; color:red; padding: 20px;">Erro ao carregar dados.</p>`;
        containerRec.innerHTML = `<p style="text-align:center; color:red; padding: 20px;">Erro ao carregar dados.</p>`;
    }
}

function aplicarFiltroEDesenhar() {
    let dadosParaTela = allRequests;
    if (filtroAtual === 'analisando') {
        dadosParaTela = allRequests.filter(req => req.status === 'analisando');
    }
    renderUI(dadosParaTela);
}

function renderUI(requests) {
    const containerInd = document.getElementById("corpo-tabela-individuais");
    const containerRec = document.getElementById("container-recorrentes");

    containerInd.innerHTML = "";
    containerRec.innerHTML = "";

    if (requests.length === 0) {
        const msgFiltro = filtroAtual === 'analisando' ? "Nenhuma solicitação pendente no momento." : "Nenhuma solicitação encontrada no histórico.";
        containerInd.innerHTML = `<p style="text-align:center; padding: 20px; color: #666;">${msgFiltro}</p>`;
        containerRec.innerHTML = `<p style="text-align:center; padding: 20px; color: #666;">${msgFiltro}</p>`;
        return;
    }

    const individuais = requests.filter(r => r.tipo_aula !== 'recorrente');
    const recorrentes = requests.filter(r => r.tipo_aula === 'recorrente' && r.id_pedido);

    // --- RENDERIZAR RESERVAS INDIVIDUAIS ---
    if (individuais.length === 0) {
        containerInd.innerHTML = `<p style="text-align:center; padding: 20px; color: #666;">Nenhuma solicitação individual.</p>`;
    } else {
        individuais.forEach(r => {
            const card = document.createElement("div");
            card.className = "aula-card"; 

            const dataFormatada = new Date(r.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            const linkRoteiroHtml = r.link_roteiro ? `<a href="${r.link_roteiro}" target="_blank" class="link-roteiro">Acessar Link</a>` : 'Não exigido';
            
            const isDesativado = r.status === 'cancelado';
            const estiloBotaoDesativado = isDesativado ? 'background-color: #cccccc; color: #666666; cursor: not-allowed; border: none;' : '';

            card.innerHTML = `
                <div class="aula-card-header">
                    <h3>${r.nome_disciplina || 'Disciplina não informada'}</h3>
                    <span class="etiqueta-status status-${r.status}">${formatarTextoStatus(r.status)}</span>
                </div>
                <div class="aula-card-body">
                    <div class="aula-card-info-linha">
                        <p><strong><i class="fas fa-user-graduate"></i> Professor:</strong> ${r.professor}</p>
                        <p><strong><i class="fas fa-chalkboard"></i> Sala:</strong> ${r.nome_sala}</p>
                        <p><strong><i class="far fa-calendar-alt"></i> Data:</strong> ${dataFormatada}</p>
                        <p><strong><i class="far fa-clock"></i> Horário:</strong> ${r.hora_inicio.slice(0, 5)} - ${r.hora_fim.slice(0, 5)}</p>
                        <p><strong><i class="fas fa-users"></i> Alunos:</strong> ${r.numero_discentes || '-'}</p>
                        <p><strong><i class="fas fa-desktop"></i> Apoio Técnico:</strong> ${r.precisa_tecnico ? "Sim" : "Não"}</p>
                    </div>
                    <p style="margin-top: 10px; font-size: 0.9em; color: #666;"><strong>Observações:</strong> ${r.observacoes || 'Nenhuma observação.'}</p>
                </div>
                <div class="aula-card-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;">
                    <div class="aula-card-roteiro"><strong>Material:</strong> ${linkRoteiroHtml}</div>
                    <div class="acoes-recorrente" style="margin-top: 0; display: flex; gap: 10px;">
                        <button class="botao-de-acao botao-aceitar" data-ids='["${r.id_agendamento}"]' ${isDesativado ? 'disabled' : ''} style="padding: 8px 15px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; ${estiloBotaoDesativado}">
                            <i class="fas fa-check"></i> Autorizar
                        </button>
                        <button class="botao-de-acao botao-recusar" data-ids='["${r.id_agendamento}"]' ${isDesativado ? 'disabled' : ''} style="padding: 8px 15px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; ${estiloBotaoDesativado}">
                            <i class="fas fa-times"></i> Recusar
                        </button>
                    </div>
                </div>
            `;
            containerInd.appendChild(card);
        });
    }

    // --- RENDERIZAR RESERVAS RECORRENTES ---
    if (recorrentes.length === 0) {
        containerRec.innerHTML = `<p style="text-align:center; padding: 20px; color: #666;">Nenhuma solicitação recorrente.</p>`;
    } else {
        const agrupados = {};
        recorrentes.forEach(r => {
            if (!agrupados[r.id_pedido]) agrupados[r.id_pedido] = [];
            agrupados[r.id_pedido].push(r);
        });

        for (const [id_pedido, aulas] of Object.entries(agrupados)) {
            const info = aulas[0];
            const isDesativado = info.status === 'cancelado';
            const estiloBotaoDesativado = isDesativado ? 'background-color: #cccccc; color: #666666; cursor: not-allowed; border: none;' : '';

            const horariosUnicos = [...new Set(aulas.map(a => `${a.hora_inicio.slice(0, 5)} - ${a.hora_fim.slice(0, 5)}`))].join(' | ');

            const datasFormatadas = aulas.map(a =>
                `<span class="tag-data">
                    ${new Date(a.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} 
                    (${a.hora_inicio.slice(0, 5)})
                </span>`
            ).join('');

            const idsArrayJSON = JSON.stringify(aulas.map(a => a.id_agendamento));

            const div = document.createElement('div');
            div.className = 'cartao-recorrente';
            div.innerHTML = `
                <div class="header-recorrente">
                    <h3>Lote #${id_pedido} - ${info.nome_disciplina}</h3>
                    <span class="etiqueta-status status-${info.status}">${formatarTextoStatus(info.status)}</span>
                </div>
                <div class="grid-info-recorrente">
                    <p><strong>Professor:</strong> ${info.professor}</p>
                    <p><strong>Sala de Aula:</strong> ${info.nome_sala}</p>
                    <p><strong>Horários:</strong> ${horariosUnicos}</p>
                    <p><strong>Alunos:</strong> ${info.numero_discentes}</p>
                    <p><strong>Apoio Técnico:</strong> ${info.precisa_tecnico ? 'Sim' : 'Não'}</p>
                    <p><strong>Quantidade de Aulas:</strong> ${aulas.length} aula(s)</p>
                    ${info.link_roteiro ? `<p><strong>Material:</strong> <a href="${info.link_roteiro}" target="_blank">Acessar Link</a></p>` : ''}
                </div>
                <div style="margin-top: 15px;">
                    <strong>Datas e Horários Agendados:</strong>
                    <div class="tags-datas">${datasFormatadas}</div>
                </div>
                <div class="acoes-recorrente">
                    <button class="botao-de-acao botao-aceitar" data-ids='${idsArrayJSON}' ${isDesativado ? 'disabled' : ''} style="${estiloBotaoDesativado}">Autorizar Todas</button>
                    <button class="botao-de-acao botao-recusar" data-ids='${idsArrayJSON}' ${isDesativado ? 'disabled' : ''} style="${estiloBotaoDesativado}">Recusar Todas</button>
                </div>
            `;
            containerRec.appendChild(div);
        }
    }
}

async function updateRequestStatus(arrayIds, novoStatus, observacoes = null) {
    try {
        const payload = { novoStatus: novoStatus };
        if (observacoes) payload.observacoes = observacoes;

        // 👇 APONTANDO PARA A NOVA ROTA DE ATUALIZAÇÃO DE SALAS
        const promises = arrayIds.map(id =>
            fetch(`/api/requests-salas/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })
        );

        await Promise.all(promises);
        await loadPendingRequests();

    } catch (error) {
        console.error('Falha ao atualizar status:', error);
        alert('Não foi possível processar a sua decisão. Tente novamente.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadLoggedInUser();

    let idsParaRecusar = null;

    const radiosFiltro = document.querySelectorAll('input[name="filtroStatus"]');
    radiosFiltro.forEach(radio => {
        radio.addEventListener('change', (event) => {
            filtroAtual = event.target.value;
            aplicarFiltroEDesenhar();
        });
    });

    const painel = document.querySelector(".painel-gestao-solicitacoes");
    const modal = document.getElementById('modal-justificativa');
    const btnCancelar = document.getElementById('btn-cancelar-recusa');
    const btnConfirmar = document.getElementById('btn-confirmar-recusa');
    const textoJustificativa = document.getElementById('texto-justificativa');

    painel.addEventListener('click', (event) => {
        const target = event.target;

        if (target.classList.contains('botao-aceitar')) {
            const ids = JSON.parse(target.dataset.ids);
            updateRequestStatus(ids, 'autorizado');
        } else if (target.classList.contains('botao-recusar')) {
            idsParaRecusar = JSON.parse(target.dataset.ids);
            textoJustificativa.value = '';
            modal.style.display = 'flex';
        }
    });

    btnCancelar.addEventListener('click', () => {
        modal.style.display = 'none';
        idsParaRecusar = null;
    });

    btnConfirmar.addEventListener('click', () => {
        const justificativa = textoJustificativa.value.trim();
        if (!justificativa) {
            alert('Por favor, preencha a justificativa.');
            return;
        }
        updateRequestStatus(idsParaRecusar, 'nao_autorizado', justificativa);
        modal.style.display = 'none';
        idsParaRecusar = null;
    });
});

function formatarTextoStatus(status) {
    switch (status) {
        case 'autorizado': return 'Autorizado';
        case 'nao_autorizado': return 'Não Autorizado';
        case 'analisando': return 'Em Análise';
        case 'cancelado': return 'Cancelado';
        default: return status;
    }
}