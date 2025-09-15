document.addEventListener('menuReady', (event) => {
    const { userData } = event.detail;
    inicializarPaginaDeAgendamento(userData);
});

// ===================================================================
// VARIÁVEIS GLOBAIS DA PÁGINA DE AGENDAMENTO
// ===================================================================
let loggedInUser = null;
const slotsEl = document.getElementById('slots');
const dateEl = document.getElementById('date');
const labEl = document.getElementById('laboratorios-select2'); // ID correto
const submitBtn = document.getElementById('submitBtn');
const msgEl = document.getElementById('msg');
let occupiedSlots = [];
let selectedSlot = null;

/**
 * Orquestra o carregamento da página de agendamento.
 */
async function inicializarPaginaDeAgendamento(userData) {
    loggedInUser = userData;

    const todayString = new Date().toISOString().slice(0, 10);
    dateEl.value = todayString;
    dateEl.min = todayString;

    dateEl.addEventListener('change', loadAvailability);
    labEl.addEventListener('change', loadAvailability);
    submitBtn.addEventListener('click', submeterAgendamento);

    // Carrega os laboratórios PRIMEIRO
    await loadLaboratorios();
    
    // DEPOIS, carrega a disponibilidade dos horários
    await loadAvailability();
}

/**
 * Carrega a lista de laboratórios na caixa de seleção.
 */
async function loadLaboratorios() {
    try {
        const response = await fetch('/api/lab'); // Usa a API correta
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
 * Busca na API os horários já ocupados.
 */
async function loadAvailability() {
    if (!dateEl.value || !labEl.value) { // Garante que um lab foi selecionado
        slotsEl.innerHTML = '<p>Por favor, selecione um laboratório.</p>';
        return;
    }
    
    msgEl.style.display = 'none';
    slotsEl.innerHTML = '<p>Carregando horários...</p>';
    submitBtn.disabled = true;
    selectedSlot = null;

    try {
        const res = await fetch(`/api/availability?date=${dateEl.value}&labId=${labEl.value}`);
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
            const allSlots = generateAllSlots();
            slotsEl.innerHTML = '';

            allSlots.forEach(hour => {
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
                        selectedSlot = (selectedSlot === btn.dataset.hour && selectedSlot !== null) ? null : btn.dataset.hour;
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

            const payload = {
                labId: labEl.value,
                date: dateEl.value,
                hour: selectedSlot,
                precisa_tecnico: document.querySelector('input[name="precisaTecnico"]:checked').value === 'true'
            };

            try {
                const res = await fetch('/api/schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || 'Ocorreu um erro');

                // Exibe mensagem de sucesso
                msgEl.textContent = result.message;
                msgEl.className = 'mensagem-status sucesso';
                msgEl.style.display = 'block';

                await loadAvailability(); // Recarrega os horários
            } catch (err) {
                msgEl.textContent = 'Erro ao enviar: ' + err.message;
                msgEl.className = 'mensagem-status erro';
                msgEl.style.display = 'block';
            }
        }


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
