// Ouve o evento do menu.js para saber quando começar a trabalhar
document.addEventListener('menuReady', (event) => {
    const { userData } = event.detail;
    inicializarPagina(userData);
});

// ===================================================================
// VARIÁVEIS GLOBAIS DESTA PÁGINA
// ===================================================================
// DECLARAÇÕES QUE ESTAVAM FALTANDO:
const labEl = document.getElementById('laboratorios-select2');
const disciplinaEl = document.getElementById('disciplina-select2');
const dataInicioEl = document.getElementById('data-inicio');
const dataFimEl = document.getElementById('data-fim');
const diaDaSemanaEl = document.getElementById('dia-semana');
const submitBtn = document.getElementById('submitBtnRecorrente');
const msgEl = document.getElementById('msg');


// Função principal de inicialização
async function inicializarPagina(userData) {
    // Carrega os selects de laboratórios e disciplinas
    await loadLaboratorios(); 
    await loadDisciplinas();
    toggleRoteiroVisibility();

    // Carrega os checkboxes de horários
    await loadHorariosCheckboxes();

    // Adiciona o listener ao botão de submit
    if (submitBtn) {
        submitBtn.addEventListener('click', submeterAgendamentoRecorrente);
    }
}

/**
 * Carrega a lista de laboratórios na caixa de seleção.
 * (Função necessária que foi adicionada)
 */
async function loadLaboratorios() {
    try {
        const response = await fetch('/api/lab32');
        if (!response.ok) throw new Error('Falha ao carregar laboratórios');
        const data = await response.json();
        
        labEl.innerHTML = '<option value="">Selecione um Laboratório</option>'; 
        data.forEach(laboratorio => {
            const option = document.createElement('option');
            option.value = laboratorio.id_laboratorio;
            option.textContent = laboratorio.nome_laboratorio;
            labEl.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar laboratórios:', error);
    }
}

/**
 * Carrega a lista de disciplinas do professor logado.
 * (Função necessária que foi adicionada)
 */
async function loadDisciplinas() {
    try {
        const response = await fetch('/api/minhas-disciplinas');
        if (!response.ok) throw new Error('Falha ao carregar disciplinas');
        const data = await response.json();
        
        if (!disciplinaEl) return;
        disciplinaEl.innerHTML = '<option value="">Selecione uma disciplina</option>'; 
        data.forEach(disciplina => {
            const option = document.createElement('option');
            option.value = disciplina.id_disciplina;
            option.textContent = disciplina.nome_disciplina;
            disciplinaEl.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar disciplinas:', error);
    }
}

/**
 * Carrega os horários da API e cria CHECKBOXES para seleção múltipla.
 */
async function loadHorariosCheckboxes() {
    const container = document.getElementById('horarios-checkboxes');
    if (!container) return;
    try {
        const response = await fetch('/api/horarios');
        if (!response.ok) throw new Error('Falha ao buscar horários');
        const horarios = await response.json();
        
        container.innerHTML = horarios.map(h => `
            <div class="checkbox-item">
                <input type="checkbox" id="horario-${h.inicio.replace(':','')}" name="horarios" value="${h.inicio}">
                <label for="horario-${h.inicio.replace(':','')}">${h.inicio} — ${h.fim}</label>
            </div>
        `).join('');
    } catch (error) {
        console.error("Erro ao carregar checkboxes de horários:", error);
    }
}

/**
 * Função para enviar a solicitação de agendamento recorrente.
 */
async function submeterAgendamentoRecorrente() {
    // 1. Coletar todos os dados do formulário
    const horariosSelecionados = [];
    document.querySelectorAll('input[name="horarios"]:checked').forEach(checkbox => {
        horariosSelecionados.push(checkbox.value);
    });

    // Validações
    if (!labEl.value) { return alert("Por favor, selecione um laboratório."); }
    if (!disciplinaEl.value) { return alert("Por favor, selecione uma disciplina."); }
    if (!dataInicioEl.value || !dataFimEl.value) { return alert("Por favor, selecione um período de datas."); }
    if (dataFimEl.value < dataInicioEl.value) { return alert("A data final não pode ser anterior à data inicial."); }
    if (horariosSelecionados.length === 0) { return alert("Selecione pelo menos um horário."); }

    // Pega os outros campos (exemplo)
    const precisaTecnico = document.querySelector('input[name="precisaTecnico"]:checked').value === 'true';
    const numeroDiscentes = document.getElementById('numero_discentes').value;
    const linkRoteiro = document.getElementById('link_roteiro').value;

    // 2. Montar o payload
    const payload = {
        labId: labEl.value,
        disciplinaId: disciplinaEl.value,
        dataInicio: dataInicioEl.value,
        dataFim: dataFimEl.value,
        diaDaSemana: diaDaSemanaEl.value,
        horarios: horariosSelecionados,
        precisa_tecnico: precisaTecnico,
        numero_discentes: numeroDiscentes,
        link_roteiro: linkRoteiro
    };

    // 3. Fazer a chamada fetch para a NOVA rota
    try {
        const response = await fetch('/api/schedule-recurring', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || 'Ocorreu um erro no servidor.');

        msgEl.className = 'mensagem-status sucesso';
        msgEl.textContent = result.message;
        msgEl.style.display = 'block';

    } catch (err) {
        msgEl.className = 'mensagem-status erro';
        msgEl.textContent = 'Erro: ' + err.message;
        msgEl.style.display = 'block';
    }
}