document.addEventListener('menuReady', (event) => {
    const { userData } = event.detail;
    inicializarPagina(userData);
});

const labEl = document.getElementById('laboratorios-select2');
const disciplinaEl = document.getElementById('disciplina-select2');
const dataInicioEl = document.getElementById('data-inicio');
const dataFimEl = document.getElementById('data-fim');
const diaDaSemanaEl = document.getElementById('dia-semana');
const submitBtn = document.getElementById('submitBtnRecorrente');
const msgEl = document.getElementById('msg');

async function inicializarPagina(userData) {

    const dataFutura = new Date();
    dataFutura.setDate(dataFutura.getDate() + 4);
    const dataFuturaString = dataFutura.toISOString().slice(0, 10);

    if (dataInicioEl) {
        dataInicioEl.min = dataFuturaString;
        dataInicioEl.value = dataFuturaString; 
    }
    
    if (dataFimEl) {
        dataFimEl.min = dataFuturaString;
    }

    if (dataInicioEl && dataFimEl) {
        dataInicioEl.addEventListener('change', () => {
            dataFimEl.min = dataInicioEl.value;
            if (dataFimEl.value < dataInicioEl.value) {
                dataFimEl.value = dataInicioEl.value;
            }
        });
    }

    await loadLaboratorios(); 
    await loadDisciplinas();
    await loadHorariosCheckboxes();

    const radioTecnico = document.querySelectorAll('input[name="precisaTecnico"]');
    radioTecnico.forEach(radio => {
        radio.addEventListener('change', toggleRoteiroVisibility);
    });
    
    toggleRoteiroVisibility();

    if (submitBtn) {
        submitBtn.addEventListener('click', submeterAgendamentoRecorrente);
    }
}

async function loadLaboratorios() {
    try {
        const response = await fetch('/api/lab32');
        const data = await response.json();
        
        labEl.innerHTML = '<option value="">Selecione um Laboratório</option>'; 
        data.forEach(laboratorio => {
            const option = document.createElement('option');
            option.value = laboratorio.id_laboratorio;
            option.textContent = laboratorio.nome_laboratorio;
            labEl.appendChild(option);
        });
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function loadDisciplinas() {
    try {
        const response = await fetch('/api/minhas-disciplinas');
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
        console.error('Erro:', error);
    }
}

async function loadHorariosCheckboxes() {
    const container = document.getElementById('horarios-checkboxes');
    if (!container) return;
    
    try {
        const response = await fetch('/api/horarios');
        const horarios = await response.json();
        
        container.innerHTML = horarios.map(h => {
            const idHTML = h.inicio.replace(':', '');
            
            return `
            <div class="checkbox-item">
                <input type="checkbox" id="horario-${idHTML}" name="horarios" value="${h.inicio}">
                <label for="horario-${idHTML}">${h.inicio} — ${h.fim}</label>
            </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Erro ao carregar os horários:", error);
    }
}

async function submeterAgendamentoRecorrente() {
    const horariosSelecionados = [];
    document.querySelectorAll('input[name="horarios"]:checked').forEach(checkbox => {
        horariosSelecionados.push(checkbox.value);
    });

    if (!labEl.value) return alert("Selecione um laboratório.");
    if (!disciplinaEl.value) return alert("Selecione uma disciplina.");
    if (!dataInicioEl.value || !dataFimEl.value) return alert("Selecione um período.");
    if (dataFimEl.value < dataInicioEl.value) return alert("Data final inválida.");
    if (horariosSelecionados.length === 0) return alert("Selecione um horário.");

    const precisaTecnico = document.querySelector('input[name="precisaTecnico"]:checked').value === 'true';
    const numeroDiscentes = document.getElementById('numero_discentes').value;
    
    const linkRoteiro = document.getElementById('link_roteiro').value.trim();

    if (precisaTecnico && linkRoteiro === '') {
        return alert("Por favor, insira o link do roteiro. Ele é obrigatório quando o acompanhamento do técnico é solicitado.");
    }

    const payload = {
        labId: parseInt(labEl.value),
        disciplinaId: parseInt(disciplinaEl.value),
        dataInicio: dataInicioEl.value,
        dataFim: dataFimEl.value,
        diaDaSemana: parseInt(diaDaSemanaEl.value),
        horarios: horariosSelecionados,        
        precisa_tecnico: precisaTecnico,
        numero_discentes: parseInt(numeroDiscentes),
        link_roteiro: linkRoteiro
    };
    
    try {
        const response = await fetch('/api/schedule-recurring', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error);

        msgEl.className = 'mensagem-status sucesso';
        msgEl.textContent = "Aulas recorrentes cadastradas com sucesso!";
        msgEl.style.display = 'block';

    } catch (err) {
        msgEl.className = 'mensagem-status erro';
        msgEl.textContent = 'Erro: ' + err.message;
        msgEl.style.display = 'block';
    }
}

function toggleRoteiroVisibility() {
    const roteiroContainer = document.getElementById('roteiro-container');
    const precisaTecnicoSim = document.getElementById('tecnicoSim');

    if (roteiroContainer && precisaTecnicoSim) {
        roteiroContainer.style.display = precisaTecnicoSim.checked ? 'flex' : 'none';
    }
}