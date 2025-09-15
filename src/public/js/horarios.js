document.addEventListener('menuReady', (event) => {
    const { userData } = event.detail;
    inicializarPaginaDeAgendamento(userData);
});

// ===================================================================
// VARIÁVEIS GLOBAIS DA PÁGINA
// ===================================================================
let loggedInUser = null;
const slotsEl = document.getElementById('slots');
const dateEl = document.getElementById('date');
const labEl = document.getElementById('laboratorios-select2');
const disciplinaEl = document.getElementById('disciplina-select2');
const submitBtn = document.getElementById('submitBtn');
const msgEl = document.getElementById('msg');
let occupiedSlots = [];
let selectedSlot = null;

/**
 * Orquestra o carregamento da página de agendamento.
 * (VERSÃO CORRETA E COMPLETA)
 */
/**
 * Orquestra o carregamento da página de agendamento.
 * (VERSÃO CORRETA E COMPLETA)
 */
async function inicializarPaginaDeAgendamento(userData) {
    loggedInUser = userData; // Guarda os dados do usuário que o menu.js já buscou

    // 1. Define a data inicial como hoje e impede a seleção de datas passadas
    const todayString = new Date().toISOString().slice(0, 10);
    dateEl.value = todayString;
    dateEl.min = todayString;

    // 2. Adiciona os "ouvintes" de eventos que disparam a atualização dos horários
    //    Esta parte estava faltando no seu código.
    dateEl.addEventListener('change', loadAvailability);
    labEl.addEventListener('change', loadAvailability);
    submitBtn.addEventListener('click', submeterAgendamento);

    // 3. Carrega os dados dos selects (laboratórios e disciplinas)
    await loadLaboratorios();
    await loadDisciplinas();
        await fetchHorariosFromAPI(); // << NOVO: Busca os horários da API

    // 4. Carrega a disponibilidade de horários para a seleção inicial (data de hoje)
    await loadAvailability();
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
 * Busca na API os horários já ocupados.
 */
async function loadAvailability() {
    let labIdParaBuscar = labEl.value;
    if (!labIdParaBuscar && labEl.options.length > 1) {
        labIdParaBuscar = labEl.options[1].value;
    }

    if (!labIdParaBuscar) {
        slotsEl.innerHTML = '<p>Não há laboratórios disponíveis para agendamento.</p>';
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
 * Renderiza os botões de horário.
 */
function renderSlots() {
    slotsEl.innerHTML = ''; // Limpa a área

    // Usa a lista de horários que veio do banco de dados
    availableSlotsFromDB.forEach(hour => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bloco-horario';
        btn.textContent = `${hour} — ${formatEnd(hour)}`;
        btn.dataset.hour = hour;

        if (occupiedSlots.includes(hour)) {
            btn.classList.add('occupied');
            btn.disabled = true;
        } else {
            btn.addEventListener('click', () => {
                selectedSlot = (selectedSlot === btn.dataset.hour) ? null : btn.dataset.hour;
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
    if (!disciplinaEl.value) {
        msgEl.textContent = 'Por favor, selecione uma disciplina.';
        msgEl.className = 'mensagem-status erro';
        msgEl.style.display = 'block';
        return;
    }
    
    const payload = {
        labId: labEl.value,
        date: dateEl.value,
        hour: selectedSlot,
        precisa_tecnico: document.querySelector('input[name="precisaTecnico"]:checked').value === 'true',
        link_roteiro: document.getElementById('link_roteiro').value,
        id_disciplina: disciplinaEl.value
    };

    try {
        const res = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Ocorreu um erro');
        document.getElementById('link_roteiro').value = '';
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