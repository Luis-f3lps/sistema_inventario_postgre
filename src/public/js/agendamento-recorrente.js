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


/**
 * Busca a lista de todos os horários possíveis da API e a armazena.
 */
async function fetchHorariosFromAPI() {
    try {
        const response = await fetch('/api/horarios');
        if (!response.ok) throw new Error('Falha ao buscar lista de horários.');
        availableSlotsFromDB = await response.json();
    } catch (error) {
        console.error("Erro ao buscar horários da API:", error);
        slotsEl.innerHTML = '<p style="color: red;">Não foi possível carregar os horários.</p>';
    }
}

/**
 * Carrega a lista de laboratórios na caixa de seleção.
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

        // --- ALTERAÇÃO PRINCIPAL AQUI ---
        // Se houver laboratórios na lista (data.length > 0),
        // define o valor do select para o ID do primeiro laboratório.
        if (data.length > 0) {
            labEl.value = data[0].id_laboratorio;
        }

    } catch (error) {
        console.error('Erro ao carregar laboratórios:', error);
    }
}
/**
 * Carrega a lista de disciplinas do professor logado.
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
 * Busca na API os horários já ocupados para a data e lab selecionados.
 */
async function loadAvailability() {
    let labIdParaBuscar = labEl.value;
    if (!labIdParaBuscar && labEl.options.length > 1) {
        labIdParaBuscar = labEl.options[1].value;
    }

    if (!labIdParaBuscar) {
        slotsEl.innerHTML = '<p>Selecione um laboratório para ver os horários.</p>';
        return;
    }
    
    msgEl.style.display = 'none';
    slotsEl.innerHTML = '<p>Carregando horários...</p>';
    submitBtn.disabled = true;
    selectedSlot = null;

    try {
        const res = await fetch(`/api/availability?date=${dateEl.value}&labId=${labIdParaBuscar}`);
        if (!res.ok) throw new Error('Falha ao buscar horários.');
        const data = await res.json();
        occupiedSlots = data.occupied || [];
        renderSlots();
    } catch (error) {
        console.error('Erro ao carregar disponibilidade:', error);
        slotsEl.innerHTML = '<p style="color: red;">Erro ao carregar horários.</p>';
    }
}

/**
 * Renderiza os botões de horário usando os dados do banco.
 */
function renderSlots() {
    slotsEl.innerHTML = '';

    // availableSlotsFromDB agora é um array de objetos, ex: [{inicio: "07:20", fim: "08:10"}]
    availableSlotsFromDB.forEach(horario => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bloco-horario';
        
        // Usa os valores de início e fim diretamente para criar o texto do botão
        btn.textContent = `${horario.inicio} — ${horario.fim}`;
        btn.dataset.hour = horario.inicio; // O valor para salvar continua sendo a hora de início

        if (occupiedSlots.includes(horario.inicio)) {
            btn.classList.add('occupied');
            btn.disabled = true;
        } else {
            btn.addEventListener('click', () => {
                selectedSlot = (selectedSlot === horario.inicio) ? null : horario.inicio;
                updateSelectionUI();
            });
        }
        slotsEl.appendChild(btn);
    });
    updateSelectionUI();
}

/**
 * Atualiza a interface para destacar o horário selecionado.
 */
function updateSelectionUI() {
    document.querySelectorAll('.bloco-horario').forEach(el => {
        el.classList.remove('selected');
        if (!el.disabled && el.dataset.hour === selectedSlot) {
            el.classList.add('selected');
        }
    });
    submitBtn.disabled = !selectedSlot;
}

/**
 * Envia o novo agendamento para a API.
 */
async function submeterAgendamento() {
    if (!selectedSlot || !loggedInUser) return;
    
    // Validações de campos
    if (!disciplinaEl.value) {
        msgEl.textContent = 'Por favor, selecione uma disciplina.';
        msgEl.className = 'mensagem-status erro';
        msgEl.style.display = 'block';
        return;
    }
    
    // --- MUDANÇA 1: Pega e valida o número de discentes ---
    const numeroDiscentesEl = document.getElementById('numero_discentes');
    const numeroDiscentes = numeroDiscentesEl.value;
    if (!numeroDiscentes || parseInt(numeroDiscentes) <= 0) {
        msgEl.textContent = 'Por favor, insira um número válido de discentes.';
        msgEl.className = 'mensagem-status erro';
        msgEl.style.display = 'block';
        return;
    }
    
    // --- MUDANÇA 2: Adiciona o campo ao payload ---
    const payload = {
        labId: labEl.value,
        date: dateEl.value,
        hour: selectedSlot,
        precisa_tecnico: document.querySelector('input[name="precisaTecnico"]:checked').value === 'true',
        link_roteiro: document.getElementById('link_roteiro').value,
        id_disciplina: disciplinaEl.value,
        numero_discentes: numeroDiscentes // <<< ADICIONADO AQUI
    };

    try {
        const res = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Ocorreu um erro');

        // Limpa os campos do formulário após o sucesso
        document.getElementById('link_roteiro').value = '';
        numeroDiscentesEl.value = ''; // Limpa o campo de discentes
        disciplinaEl.selectedIndex = 0;
        
        msgEl.textContent = result.message;
        msgEl.className = 'mensagem-status sucesso';
        msgEl.style.display = 'block';
        
        await loadAvailability();
    } catch (err) {
        msgEl.textContent = 'Erro ao enviar: ' + err.message;
        msgEl.className = 'mensagem-status erro';
        msgEl.style.display = 'block';
    }
}

// Funções auxiliares
function formatHour(h) { return (h < 10 ? '0' : '') + h + ':00'; }
function formatEnd(start) {
    const endH = parseInt(start.split(':')[0]) + 1;
    return formatHour(endH);
}

/**
 * Mostra ou esconde o campo de link do roteiro com base na seleção do técnico.
 */
function toggleRoteiroVisibility() {
    const roteiroContainer = document.getElementById('roteiro-container');
    const precisaTecnicoSim = document.getElementById('tecnicoSim');

    if (roteiroContainer && precisaTecnicoSim) {
        // Se o "Sim" estiver marcado, mostra o campo. Caso contrário, esconde.
        if (precisaTecnicoSim.checked) {
            roteiroContainer.style.display = 'block'; // ou 'flex', dependendo do seu CSS
        } else {
            roteiroContainer.style.display = 'none';
        }
    }
}