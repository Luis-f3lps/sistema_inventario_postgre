document.addEventListener('menuReady', (event) => {
    const { userData } = event.detail;
    inicializarPaginaDeAgendamento(userData);
});


let loggedInUser = null;
const slotsEl = document.getElementById('slots');
const dateEl = document.getElementById('date');
const labEl = document.getElementById('laboratorios-select2');
const disciplinaEl = document.getElementById('disciplina-select2');
const submitBtn = document.getElementById('submitBtn');
const msgEl = document.getElementById('msg');
let occupiedSlots = [];
let selectedSlot = null;
let availableSlotsFromDB = [];
async function inicializarPaginaDeAgendamento(userData) {
    loggedInUser = userData;

    const todayString = new Date().toISOString().slice(0, 10);
    dateEl.value = todayString;
    dateEl.min = todayString;

    dateEl.addEventListener('change', loadAvailability);
    labEl.addEventListener('change', loadAvailability);
    submitBtn.addEventListener('click', submeterAgendamento);

    const radioTecnico = document.querySelectorAll('input[name="precisaTecnico"]');
    radioTecnico.forEach(radio => {
        radio.addEventListener('change', toggleRoteiroVisibility);
    });

    toggleRoteiroVisibility();

    await loadLaboratorios();
    await loadDisciplinas();
    await fetchHorariosFromAPI();
    await loadAvailability();
}


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

        if (data.length > 0) {
            labEl.value = data[0].id_laboratorio;
        }

    } catch (error) {
        console.error('Erro ao carregar laboratórios:', error);
    }
}

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


function renderSlots() {
    slotsEl.innerHTML = '';

    availableSlotsFromDB.forEach(horario => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bloco-horario';

        btn.textContent = `${horario.inicio} — ${horario.fim}`;
        btn.dataset.hour = horario.inicio;

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

function updateSelectionUI() {
    document.querySelectorAll('.bloco-horario').forEach(el => {
        el.classList.remove('selected');
        if (!el.disabled && el.dataset.hour === selectedSlot) {
            el.classList.add('selected');
        }
    });
    submitBtn.disabled = !selectedSlot;
}

async function submeterAgendamento() {
    if (!selectedSlot || !loggedInUser) return;

    if (!disciplinaEl.value) {
        msgEl.textContent = 'Por favor, selecione uma disciplina.';
        msgEl.className = 'mensagem-status erro';
        msgEl.style.display = 'block';
        return;
    }

    const numeroDiscentesEl = document.getElementById('numero_discentes');
    const numeroDiscentes = numeroDiscentesEl.value;
    if (!numeroDiscentes || parseInt(numeroDiscentes) <= 0) {
        msgEl.textContent = 'Por favor, insira um número válido de discentes.';
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
        id_disciplina: disciplinaEl.value,
        numero_discentes: numeroDiscentes
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
        numeroDiscentesEl.value = '';
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

function formatHour(h) { return (h < 10 ? '0' : '') + h + ':00'; }
function formatEnd(start) {
    const endH = parseInt(start.split(':')[0]) + 1;
    return formatHour(endH);
}

function toggleRoteiroVisibility() {
    const roteiroContainer = document.getElementById('roteiro-container');
    const precisaTecnicoSim = document.getElementById('tecnicoSim');

    if (roteiroContainer && precisaTecnicoSim) {
        if (precisaTecnicoSim.checked) {
            roteiroContainer.style.display = 'flex';
        } else {
            roteiroContainer.style.display = 'none';
        }
    }
}