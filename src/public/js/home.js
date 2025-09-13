// Conteúdo do arquivo: js/home.js

/**
 * "Ouve" o evento disparado pelo menu.js para saber quando começar a trabalhar.
 */
document.addEventListener('menuReady', (event) => {
    // Pega os dados do usuário que o menu.js enviou
    const { userData } = event.detail;

    // Inicia as funcionalidades específicas do dashboard
    inicializarDashboard(userData);
});

/**
 * Orquestra o carregamento e a exibição dos painéis do dashboard.
 */
function inicializarDashboard(userData) {
    const userType = userData.tipo_usuario ? userData.tipo_usuario.trim().toLowerCase() : '';

    // Mostra/esconde os cartões do painel com base no tipo de usuário
    document.querySelectorAll('.cartao-painel').forEach(card => card.style.display = 'none');
    const showDashboardCard = (selector) => {
        const el = document.querySelector(selector);
        if (el) el.style.display = 'block';
    };

    switch (userType) {
        case 'tecnico':
            showDashboardCard('.cartao-aulas-tecnico');
            showDashboardCard('.cartao-meus-laboratorios');
            break;
        case 'professor':
            showDashboardCard('.cartao-aulas-solicitadas'); // Corrigido para corresponder à sua lógica anterior
            showDashboardCard('.cartao-solicitacoes');
            break;
        // Admin não precisa de painéis aqui, pois é redirecionado
    }

    // Carrega os dados para os painéis visíveis
    carregarDadosDoPainel(userType);
}

/**
 * Busca os dados para os cartões do painel com base no tipo de usuário.
 */
function carregarDadosDoPainel(userType) {
    const promises = [];

    // Adiciona as chamadas de API necessárias para cada perfil
    if (userType === 'professor') {
        promises.push(fetch('/api/dashboard/aulas-autorizadas').then(res => res.json()));
    }
    if (userType === 'tecnico') {
        promises.push(fetch('/api/dashboard/meus-laboratorios').then(res => res.json()));
        promises.push(fetch('/api/aulas-meus-laboratorios').then(res => res.json()));
    }

    if (promises.length === 0) return;

    Promise.all(promises).then(results => {
        // Como a ordem e o número de resultados agora são variáveis,
        // precisamos de uma forma mais inteligente de processá-los.
        // A maneira mais simples é chamar as funções de renderização com os dados corretos.
        if (userType === 'professor') {
            renderizarSolicitacoes(results[0]);
            renderizarAulasAutorizadas(results[1]);
             loadMyRequests();

        }
        if (userType === 'tecnico') {
            renderizarMeusLaboratorios(results[0]);
            renderizarAulasNosMeusLaboratorios(results[1]);
        }
    }).catch(error => console.error('Erro ao carregar dados dos painéis:', error));
}


        function renderizarSolicitacoes(solicitacoes) {
            const lista = document.getElementById('lista-solicitacoes');
            if (!lista) return;
            if (solicitacoes.length === 0) {
                lista.innerHTML = '<li>Nenhuma solicitação recente.</li>'; return;
            }
            lista.innerHTML = solicitacoes.map(s => `
            <li>
                <span>${s.nome_laboratorio} (${new Date(s.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} | ${s.hora_inicio.slice(0, 5)} - ${s.hora_fim.slice(0, 5)})</span>
                <span class="etiqueta-status status-${s.status}">${s.status}</span>
            </li>
        `).join('');
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

        
            async function loadMyRequests() {
                if (!loggedInUser) return;

                try {
                    const res = await fetch(`/api/minhas-solicitacoes`);
                    if (!res.ok) throw new Error('Erro na rede ao buscar solicitações');

                    const data = await res.json();
                    renderTable(data);
                } catch (error) {
                    console.error('Falha ao carregar solicitações:', error);
                    const tbody = document.getElementById("minhas-aulas-tbody");
                    if (tbody) {
                        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Erro ao carregar dados. Tente novamente mais tarde.</td></tr>`;
                    }
                }
            }

            /**
             * Função para renderizar a tabela na tela.
             */
            function renderTable(requests) {
                const tbody = document.getElementById("minhas-aulas-tbody");
                if (!tbody) return;

                tbody.innerHTML = ""; // Limpa a tabela antes de adicionar novas linhas

                if (requests.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">Você não tem nenhuma solicitação futura.</td></tr>`;
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
