document.addEventListener('menuReady', () => {
    loadSalasSelect();
    loadDisciplinasSelect();
    loadHorarios();
});

const selectSalaAgendamento = document.getElementById('salas-select2');
const selectDisciplinaAgendamento = document.getElementById('disciplina-select2');
const inputDateAgendamento = document.getElementById('date');
const slotsContainer = document.getElementById('slots');
const submitBtnAgendamento = document.getElementById('submitBtn');

let selectedTime = null;

// Bloqueia dias no passado (Mesma regra de antecedência de 4 dias)
const dataFutura = new Date();
dataFutura.setDate(dataFutura.getDate() + 4);
inputDateAgendamento.min = dataFutura.toISOString().slice(0, 10);

async function loadSalasSelect() {
    try {
        const res = await fetch('/api/salas');
        const data = await res.json();
        data.forEach(sala => {
            const option = document.createElement('option');
            option.value = sala.id_sala;
            option.textContent = sala.nome_sala;
            selectSalaAgendamento.appendChild(option);
        });
    } catch (e) { console.error(e); }
}

async function loadDisciplinasSelect() {
    try {
        const res = await fetch('/api/minhas-disciplinas');
        const data = await res.json();
        data.forEach(disc => {
            const option = document.createElement('option');
            option.value = disc.id_disciplina;
            option.textContent = disc.nome_disciplina;
            selectDisciplinaAgendamento.appendChild(option);
        });
    } catch (e) { console.error(e); }
}

async function loadHorarios() {
    try {
        const res = await fetch('/api/horarios');
        const horarios = await res.json();
        
        slotsContainer.innerHTML = '';
        horarios.forEach(h => {
            const btn = document.createElement('button');
            btn.className = 'time-slot';
            btn.dataset.time = h.inicio;
            btn.textContent = `${h.inicio} - ${h.fim}`;
            
            btn.addEventListener('click', () => {
                if (btn.classList.contains('occupied')) return;
                
                document.querySelectorAll('.time-slot').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedTime = h.inicio;
                submitBtnAgendamento.disabled = false;
            });
            slotsContainer.appendChild(btn);
        });
    } catch (e) { console.error(e); }
}

// Verifica ocupação ao mudar data ou sala
inputDateAgendamento.addEventListener('change', checkAvailability);
selectSalaAgendamento.addEventListener('change', checkAvailability);

async function checkAvailability() {
    const salaId = selectSalaAgendamento.value;
    const date = inputDateAgendamento.value;
    
    if (!salaId || !date) return;
    
    try {
        // 👇 Verifica disponibilidade de Salas
        const res = await fetch(`/api/availability-salas?date=${date}&salaId=${salaId}`);
        const { occupied } = await res.json();
        
        document.querySelectorAll('.time-slot').forEach(btn => {
            const time = btn.dataset.time;
            if (occupied.includes(time)) {
                btn.classList.add('occupied');
                btn.classList.remove('selected');
                if (selectedTime === time) {
                    selectedTime = null;
                    submitBtnAgendamento.disabled = true;
                }
            } else {
                btn.classList.remove('occupied');
            }
        });
    } catch (e) { console.error(e); }
}

submitBtnAgendamento.addEventListener('click', async () => {
    const salaId = selectSalaAgendamento.value;
    const date = inputDateAgendamento.value;
    const disciplinaId = selectDisciplinaAgendamento.value;
    const numeroDiscentes = document.getElementById('numero_discentes').value;
    const precisaTecnico = document.querySelector('input[name="precisaTecnico"]:checked').value === 'true';
    const linkRoteiro = document.getElementById('link_roteiro').value;

    if (!salaId || !date || !selectedTime || !disciplinaId || !numeroDiscentes) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    try {
        const payload = {
            salaId: parseInt(salaId),
            disciplinaId: parseInt(disciplinaId),
            date,
            hour: selectedTime,
            numero_discentes: parseInt(numeroDiscentes),
            precisa_tecnico: precisaTecnico,
            link_roteiro: linkRoteiro
        };

        // 👇 Rota para agendar dia único de sala
        const res = await fetch('/api/schedule-salas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        alert("Reserva de sala solicitada com sucesso!");
        checkAvailability(); // Atualiza a tela
        selectedTime = null;
        submitBtnAgendamento.disabled = true;
        document.getElementById('numero_discentes').value = '';
    } catch (e) {
        alert("Erro: " + e.message);
    }
});