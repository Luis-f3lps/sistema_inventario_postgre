document.addEventListener('menuReady', (event) => {
    const { userData } = event.detail;
    inicializarPagina(userData);
});

// Função principal de inicialização
async function inicializarPagina(userData) {
    // Carrega os selects de laboratórios e disciplinas (reutilize as funções que já temos)
    await loadLaboratorios(); 
    await loadDisciplinas();

    // Carrega os checkboxes de horários
    await loadHorariosCheckboxes();

    // Adiciona o listener ao botão de submit
    const submitBtn = document.getElementById('submitBtnRecorrente');
    submitBtn.addEventListener('click', submeterAgendamentoRecorrente);
}

// Carrega os horários da API e cria CHECKBOXES
async function loadHorariosCheckboxes() {
    const container = document.getElementById('horarios-checkboxes');
    try {
        const response = await fetch('/api/horarios');
        const horarios = await response.json();
        
        container.innerHTML = horarios.map(h => `
            <div class="checkbox-item">
                <input type="checkbox" id="horario-${h.inicio}" name="horarios" value="${h.inicio}">
                <label for="horario-${h.inicio}">${h.inicio} — ${h.fim}</label>
            </div>
        `).join('');
    } catch (error) {
        console.error("Erro ao carregar checkboxes de horários:", error);
    }
}

// Função para enviar a solicitação
async function submeterAgendamentoRecorrente() {
    // 1. Coletar todos os dados do formulário
    const labId = document.getElementById('laboratorios-select2').value;
    const disciplinaId = document.getElementById('disciplina-select2').value;
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;
    const diaDaSemana = document.getElementById('dia-semana').value;
    
    // Coleta os horários selecionados (checkboxes)
    const horariosSelecionados = [];
    document.querySelectorAll('input[name="horarios"]:checked').forEach(checkbox => {
        horariosSelecionados.push(checkbox.value);
    });

    // Validação (verificar se campos estão preenchidos, se dataFim > dataInicio, etc.)
    if (horariosSelecionados.length === 0) {
        alert("Selecione pelo menos um horário.");
        return;
    }

    // 2. Montar o payload
    const payload = {
        labId,
        disciplinaId,
        dataInicio,
        dataFim,
        diaDaSemana,
        horarios: horariosSelecionados,
        // ... pegar os outros dados (precisa_tecnico, numero_discentes, link_roteiro)
    };

    // 3. Fazer a chamada fetch para a NOVA rota
    try {
        const response = await fetch('/api/schedule-recurring', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const msgEl = document.getElementById('msg');

        if (!response.ok) throw new Error(result.error || 'Ocorreu um erro');

        msgEl.className = 'mensagem-status sucesso';
        msgEl.textContent = result.message; // Ex: "10 aulas agendadas com sucesso!"
        msgEl.style.display = 'block';

    } catch (err) {
        const msgEl = document.getElementById('msg');
        msgEl.className = 'mensagem-status erro';
        msgEl.textContent = 'Erro: ' + err.message;
        msgEl.style.display = 'block';
    }
}

// Lembre-se de incluir as funções loadLaboratorios() e loadDisciplinas() neste arquivo.