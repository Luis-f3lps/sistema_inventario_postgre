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

    if (!loggedInUser || loggedInUser.tipo_usuario.trim().toLowerCase() !== 'tecnico') {
        tbodyInd.innerHTML = `<tr><td colspan="11" style="text-align:center;">Acesso restrito a técnicos.</td></tr>`;
        containerRec.innerHTML = `<p style="text-align:center;">Acesso restrito a técnicos.</p>`;
        return;
    }

    try {
        const tecnicoEmail = loggedInUser.email;
        const res = await fetch(`/api/requests?tecnico_email=${encodeURIComponent(tecnicoEmail)}`);
        if (!res.ok) throw new Error('Erro na rede');

        allRequests = await res.json();

        aplicarFiltroEDesenhar();
    } catch (error) {
        console.error('Falha ao carregar solicitações:', error);
        tbodyInd.innerHTML = `<tr><td colspan="11" style="text-align:center; color:red;">Erro ao carregar dados.</td></tr>`;
        containerRec.innerHTML = `<p style="text-align:center; color:red;">Erro ao carregar dados.</p>`;
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
    const tbodyInd = document.getElementById("corpo-tabela-individuais");
    const containerRec = document.getElementById("container-recorrentes");

    tbodyInd.innerHTML = "";
    containerRec.innerHTML = "";

    if (requests.length === 0) {
        const msgFiltro = filtroAtual === 'analisando' ? "Nenhuma solicitação pendente no momento." : "Nenhuma solicitação encontrada no histórico.";
        tbodyInd.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 20px;">${msgFiltro}</td></tr>`;
        containerRec.innerHTML = `<p style="text-align:center; padding: 20px; color: #666;">${msgFiltro}</p>`;
        return;
    }

    const individuais = requests.filter(r => r.tipo_aula !== 'recorrente');
    const recorrentes = requests.filter(r => r.tipo_aula === 'recorrente' && r.id_pedido);

    // --- RENDERIZAR AULAS INDIVIDUAIS ---
    if (individuais.length === 0) {
        tbodyInd.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 20px;">Nenhuma solicitação individual.</td></tr>`;
    } else {
        individuais.forEach(r => {
            const tr = document.createElement("tr");
            const dataFormatada = new Date(r.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            const linkRoteiroHtml = r.link_roteiro ? `<a href="${r.link_roteiro}" target="_blank" class="link-roteiro">Ver Link</a>` : 'N/A';

            const isDesativado = r.status === 'cancelado';
            const estiloBotaoDesativado = isDesativado ? 'background-color: #cccccc; color: #666666; cursor: not-allowed; border: none;' : '';

            tr.innerHTML = `
                <td>${r.professor}</td>
                <td>${r.nome_laboratorio}</td>
                <td>${r.nome_disciplina}</td>
                <td>${dataFormatada}</td>
                <td style="white-space: nowrap;">${r.hora_inicio.slice(0, 5)} - ${r.hora_fim.slice(0, 5)}</td>
                <td>${r.numero_discentes}</td> 
                <td>${r.precisa_tecnico ? "Sim" : "Não"}</td>
                <td><span class="etiqueta-status status-${r.status}">${formatarTextoStatus(r.status)}</span></td>
                <td>${linkRoteiroHtml}</td>
                <td>${r.observacoes || '-'}</td>
                <td class="celula-de-acoes">
                    <button class="botao-de-acao botao-aceitar" data-ids='["${r.id_aula}"]' ${isDesativado ? 'disabled' : ''} style="${estiloBotaoDesativado}">Autorizar</button>
                    <button class="botao-de-acao botao-recusar" data-ids='["${r.id_aula}"]' ${isDesativado ? 'disabled' : ''} style="${estiloBotaoDesativado}">Recusar</button>
                </td>
            `;
            tbodyInd.appendChild(tr);
        });
    }

    // --- RENDERIZAR AULAS RECORRENTES ---
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

            const horariosUnicos = [...new Set(aulas.map(a =>
                `${a.hora_inicio.slice(0, 5)} - ${a.hora_fim.slice(0, 5)}`
            ))].join(' | ');

            const datasFormatadas = aulas.map(a =>
                `<span class="tag-data">
                    ${new Date(a.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} 
                    (${a.hora_inicio.slice(0, 5)})
                </span>`
            ).join('');

            const idsArrayJSON = JSON.stringify(aulas.map(a => a.id_aula));

            const div = document.createElement('div');
            div.className = 'cartao-recorrente';
            div.innerHTML = `
                <div class="header-recorrente">
                    <h3>Lote #${id_pedido} - ${info.nome_disciplina}</h3>
                    <span class="etiqueta-status status-${info.status}">${formatarTextoStatus(info.status)}</span>
                </div>
                <div class="grid-info-recorrente">
                    <p><strong>Professor:</strong> ${info.professor}</p>
                    <p><strong>Laboratório:</strong> ${info.nome_laboratorio}</p>
                    <p><strong>Horários:</strong> ${horariosUnicos}</p>
                    <p><strong>Discentes:</strong> ${info.numero_discentes}</p>
                    <p><strong>Apoio Técnico:</strong> ${info.precisa_tecnico ? 'Sim' : 'Não'}</p>
                    <p><strong>Quantidade de Aulas:</strong> ${aulas.length} aula(s)</p>
                    ${info.link_roteiro ? `<p><strong>Roteiro:</strong> <a href="${info.link_roteiro}" target="_blank">Acessar Link</a></p>` : ''}
                </div>
                <div style="margin-top: 15px;">
                    <strong>Datas e Horários Agendados:</strong>
                    <div class="tags-datas">
                        ${datasFormatadas}
                    </div>
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

        const promises = arrayIds.map(id =>
            fetch(`/api/requests/${id}`, {
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
