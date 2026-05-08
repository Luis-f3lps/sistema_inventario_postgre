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

// A lista que guarda todos os horários que você clicou
let selectedSlots = []; 
let availableSlotsFromDB = [];

async function inicializarPaginaDeAgendamento(userData) {
    loggedInUser = userData;

    const dataFutura = new Date();
    dataFutura.setDate(dataFutura.getDate() + 3);
    const dataFuturaString = dataFutura.toISOString().slice(0, 10);

    dateEl.value = dataFuturaString;
    dateEl.min = dataFuturaString;

    dateEl.addEventListener('change', loadAvailability);
    labEl.addEventListener('change', loadAvailability);
    submitBtn.addEventListener('click', submeterAgendamento);

    await loadLaboratoriosParaFormulario();
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

async function loadLaboratoriosParaFormulario() {
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
    
    // Zera a lista de selecionados se trocar o dia
    selectedSlots = []; 

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

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataSelecionadaObj = new Date(dateEl.value + "T00:00:00");
    const diaPassou = dataSelecionadaObj < hoje;

    availableSlotsFromDB.forEach(horario => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bloco-horario';

        btn.textContent = `${horario.inicio} — ${horario.fim}`;
        btn.dataset.hour = horario.inicio;

        const slotOcupado = occupiedSlots.find(s => s.hora === horario.inicio);

        if (diaPassou) {
            // ⬛ Bloqueia e pinta de Cinza se o dia já passou
            btn.disabled = true;
            btn.style.backgroundColor = "#e9ecef"; 
            btn.style.border = "1px solid #ced4da"; 
            btn.style.color = "#6c757d";
            btn.innerHTML += "<br><small style='font-size: 10px; font-weight: bold;'><i class='fas fa-history'></i> Dia Passou</small>";
            
        } else if (slotOcupado) {
            btn.disabled = true; 
            if (slotOcupado.status === 'analisando') {
                btn.style.backgroundColor = "#fffde7"; 
                btn.style.border = "1px solid #f1c40f"; 
                btn.style.color = "#f39c12";
                btn.innerHTML += "<br><small style='font-size: 10px; font-weight: bold;'><i class='fas fa-hourglass-half'></i> Em Análise</small>";
            } else {
                btn.style.backgroundColor = "#ffebee";
                btn.style.border = "1px solid #e74c3c";
                btn.style.color = "#c0392b";
                btn.innerHTML += "<br><small style='font-size: 10px; font-weight: bold;'><i class='fas fa-ban'></i> Reservado</small>";
            }
        } else {
            btn.addEventListener('click', () => {
                if (selectedSlots.includes(horario.inicio)) {
                    selectedSlots = selectedSlots.filter(h => h !== horario.inicio);
                } else {
                    selectedSlots.push(horario.inicio);
                }
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
        
        // Pinta de verde todos os botões que estão na lista de selecionados
        if (!el.disabled && selectedSlots.includes(el.dataset.hour)) {
            el.classList.add('selected');
        }
    });
    
    submitBtn.disabled = selectedSlots.length === 0;
}

async function submeterAgendamento() {
    if (selectedSlots.length === 0 || !loggedInUser) return;

    const tipoUsuario = loggedInUser.tipo_usuario ? loggedInUser.tipo_usuario.toLowerCase().trim() : '';
    const isTecnico = tipoUsuario === 'tecnico';

    if (!isTecnico && !disciplinaEl.value) {
        alert('❌ Por favor, selecione uma disciplina.');
        return;
    }

    const numeroDiscentesEl = document.getElementById('numero_discentes');
    const numeroDiscentes = numeroDiscentesEl.value;
    if (!numeroDiscentes || parseInt(numeroDiscentes) <= 0) {
        alert('❌ Por favor, insira um número válido de discentes.');
        return;
    }

    const precisaTecnico = document.querySelector('input[name="precisaTecnico"]:checked').value === 'true';
    const linkRoteiro = document.getElementById('link_roteiro').value.trim();

    if (linkRoteiro === '') {
        alert('❌ Por favor, insira o link do roteiro. Ele é obrigatório para todos os agendamentos.');
        return;
    }

    const idDisciplinaFinal = (isTecnico && !disciplinaEl.value) ? null : disciplinaEl.value;

    submitBtn.disabled = true;
    msgEl.textContent = '⏳ Enviando solicitações... Aguarde.';
    msgEl.className = 'mensagem-status';
    msgEl.style.display = 'block';

    let sucessoCount = 0;
    let erroMensagens = [];

    for (const slot of selectedSlots) {
        const payload = {
            labId: labEl.value,
            date: dateEl.value,
            hour: slot,
            precisa_tecnico: precisaTecnico,
            link_roteiro: linkRoteiro,
            id_disciplina: idDisciplinaFinal,
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
            sucessoCount++;
        } catch (err) {
            erroMensagens.push(`Horário ${slot}: ${err.message}`);
        }
    }

    document.getElementById('link_roteiro').value = '';
    numeroDiscentesEl.value = '';
    disciplinaEl.selectedIndex = 0;
    selectedSlots = []; 
    msgEl.style.display = 'none'; 

    if (erroMensagens.length === 0) {
        alert(`✅ Sucesso!\n${sucessoCount} agendamento(s) solicitado(s) para o laboratório.`);
    } else if (sucessoCount > 0 && erroMensagens.length > 0) {
        alert(`⚠️ Atenção:\n${sucessoCount} agendamento(s) deu certo, mas tivemos os seguintes erros:\n\n${erroMensagens.join('\n')}`);
    } else {
        alert(`❌ Erro ao agendar:\n\n${erroMensagens.join('\n')}`);
    }
    
    await loadAvailability();
    if(typeof atualizarPainelCompleto === 'function') {
        atualizarPainelCompleto();
    }
}

function formatHour(h) { return (h < 10 ? '0' : '') + h + ':00'; }
function formatEnd(start) {
    const endH = parseInt(start.split(':')[0]) + 1;
    return formatHour(endH);
}