document.addEventListener('menuReady', (event) => {
    const { userData } = event.detail;
    inicializarPaginaDeAgendamento(userData);
});

// ===================================================================
// VARIÁVEIS GLOBAIS
// ===================================================================
let loggedInUser = null;
const slotsEl = document.getElementById('slots');
const dateEl = document.getElementById('date');
const labEl = document.getElementById('laboratorios-select2');
const disciplinaEl = document.getElementById('disciplina-select2');
const submitBtn = document.getElementById('submitBtn');
const msgEl = document.getElementById('msg');
let occupiedSlots = [];
let availableSlotsFromDB = []; // << NOVO: Armazena os horários vindos do BD

/**
 * Orquestra o carregamento da página.
 */
async function inicializarPaginaDeAgendamento(userData) {
    loggedInUser = userData;

    const todayString = new Date().toISOString().slice(0, 10);
    dateEl.value = todayString;
    dateEl.min = todayString;

    dateEl.addEventListener('change', loadAvailability);
    labEl.addEventListener('change', loadAvailability);
    submitBtn.addEventListener('click', submeterAgendamento);

    // Carrega os dados dos selects e a lista de horários possíveis
    await loadLaboratorios();
    await loadDisciplinas();
    await fetchHorariosFromAPI(); // << NOVO: Busca os horários da API
    
    // Carrega a disponibilidade para a seleção inicial
    await loadAvailability();
}

/**
 * NOVO: Busca a lista de todos os horários possíveis da API.
 */
async function fetchHorariosFromAPI() {
    try {
        const response = await fetch('/api/horarios');
        if (!response.ok) throw new Error('Falha ao buscar lista de horários.');
        availableSlotsFromDB = await response.json(); // Salva na variável global
    } catch (error) {
        console.error("Erro ao buscar horários da API:", error);
        slotsEl.innerHTML = '<p style="color: red;">Não foi possível carregar os horários.</p>';
    }
}

/**
 * Renderiza os botões de horário.
 * ATUALIZADO: Não usa mais a função 'generateAllSlots'.
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
function generateAllSlots() {
    const arr = [];
    for (let h = 7; h < 11; h++) arr.push(formatHour(h));
    for (let h = 13; h < 22; h++) arr.push(formatHour(h));
    return arr;
}
function formatHour(h) { return (h < 10 ? '0' : '') + h + ':00'; }
function formatEnd(start) {
    const endH = parseInt(start.split(':')[0]) + 1;
    return formatHour(endH);
}