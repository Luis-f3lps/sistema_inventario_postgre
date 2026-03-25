let userInfo = null;
let horariosBd = [];
let aulasDoMes = [];
let dataAtual = new Date();
let mesExibido = dataAtual.getMonth();
let anoExibido = dataAtual.getFullYear();

const selectLab = document.getElementById('select-laboratorio');
const inputData = document.getElementById('input-data');
const grid = document.getElementById('calendario-grid');
const tituloCalendario = document.getElementById('calendario-titulo');
const listaHorarios = document.getElementById('lista-horarios');

document.addEventListener("DOMContentLoaded", async () => {
    const dateStr = dataAtual.getFullYear() + '-' +
        String(dataAtual.getMonth() + 1).padStart(2, '0') + '-' +
        String(dataAtual.getDate()).padStart(2, '0');
    inputData.value = dateStr;

    await carregarUsuarioLogado();
    await carregarHorariosBase();
    await carregarLaboratorios();

    if (userInfo && userInfo.tipo_usuario && userInfo.tipo_usuario.toLowerCase() === 'tecnico') {
        const painelAgendamento = document.querySelector('.agendamento-container');
        if (painelAgendamento) {
            painelAgendamento.style.display = 'none';
        }
    }

    selectLab.addEventListener('change', () => atualizarPainelCompleto());
    inputData.addEventListener('change', () => {
        sincronizarCalendarioComInputData();
        renderizarHorariosDoDia(inputData.value);
    });

    document.getElementById('btn-mes-anterior').addEventListener('click', () => mudarMes(-1));
    document.getElementById('btn-proximo-mes').addEventListener('click', () => mudarMes(1));

    renderizarCalendario();
});

async function carregarUsuarioLogado() {
    try {
        const res = await fetch('/api/usuario-logado');
        if (res.ok) userInfo = await res.json();
    } catch (e) { }
}

async function carregarHorariosBase() {
    try {
        const res = await fetch('/api/horarios');
        if (res.ok) horariosBd = await res.json();
    } catch (e) { }
}

async function carregarLaboratorios() {
    try {
        const response = await fetch('/api/lab32');
        const data = await response.json();
        data.forEach(lab => {
            const option = document.createElement('option');
            option.value = lab.id_laboratorio;
            option.textContent = lab.nome_laboratorio;
            selectLab.appendChild(option);
        });
        if (data.length > 0) {
            selectLab.value = data[0].id_laboratorio; 
            atualizarPainelCompleto(); 
        }
    } catch (error) { }
}

async function buscarAulasDoMesAPI() {
    if (!userInfo) return [];
    try {
        const isTecnico = userInfo.tipo_usuario.toLowerCase() === 'tecnico';
        const endpoint = isTecnico
            ? `/api/calendario/aulas-tecnico?ano=${anoExibido}&mes=${mesExibido + 1}`
            : `/api/calendario/aulas-autorizadas?ano=${anoExibido}&mes=${mesExibido + 1}`;

        const response = await fetch(endpoint);
        if (response.ok) return await response.json();
        return [];
    } catch (error) {
        return [];
    }
}

async function atualizarPainelCompleto() {
    if (!selectLab.value) {
        aulasDoMes = [];
        renderizarCalendario();
        listaHorarios.innerHTML = '<p style="text-align: center; color: #888;">Selecione um laboratório.</p>';
        return;
    }

    const todasAulas = await buscarAulasDoMesAPI();
    const nomeLabSelecionado = selectLab.options[selectLab.selectedIndex].text;

    aulasDoMes = todasAulas.filter(a => a.nome_laboratorio === nomeLabSelecionado);

    renderizarCalendario();
    renderizarHorariosDoDia(inputData.value);
}

function mudarMes(direcao) {
    mesExibido += direcao;
    if (mesExibido > 11) { mesExibido = 0; anoExibido++; }
    if (mesExibido < 0) { mesExibido = 11; anoExibido--; }
    atualizarPainelCompleto();
}

function sincronizarCalendarioComInputData() {
    const partes = inputData.value.split('-');
    anoExibido = parseInt(partes[0]);
    mesExibido = parseInt(partes[1]) - 1;
    atualizarPainelCompleto();
}

function renderizarCalendario() {
    const dataBase = new Date(anoExibido, mesExibido, 1);
    tituloCalendario.textContent = `${dataBase.toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} • ${anoExibido}`;

    const diasNoMes = new Date(anoExibido, mesExibido + 1, 0).getDate();
    const primeiroDia = dataBase.getDay();

    const diasComAula = {};
    aulasDoMes.forEach(aula => {
        const d = new Date(aula.data);
        const diaUTC = d.getUTCDate();
        diasComAula[diaUTC] = true;
    });

    grid.innerHTML = "";

    for (let i = 0; i < primeiroDia; i++) {
        grid.innerHTML += `<div class="dia-calendario dia-vazio"></div>`;
    }

    const dataInputSelecionada = inputData.value;

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const diaStr = String(dia).padStart(2, '0');
        const mesStr = String(mesExibido + 1).padStart(2, '0');
        const diaFormatado = `${anoExibido}-${mesStr}-${diaStr}`;

        let classes = "dia-calendario";
        if (diasComAula[dia]) classes += " tem-aula";
        if (diaFormatado === dataInputSelecionada) classes += " dia-selecionado";

        const div = document.createElement('div');
        div.className = classes;
        div.innerHTML = `<span>${dia}</span>`;

        div.addEventListener('click', () => {
            inputData.value = diaFormatado;
            renderizarCalendario();
            renderizarHorariosDoDia(diaFormatado);
        });

        grid.appendChild(div);
    }
}

function renderizarHorariosDoDia(dataEscolhida) {
    listaHorarios.innerHTML = "";
    if (!selectLab.value) {
        listaHorarios.innerHTML = '<p style="text-align: center; color: #888;">Selecione um laboratório para ver os horários.</p>';
        return;
    }

    const aulasDoDia = aulasDoMes.filter(aula => {
        const d = new Date(aula.data);
        const diaDaAula = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        return diaDaAula === dataEscolhida;
    });

    horariosBd.forEach(slot => {
        const aulaEncontrada = aulasDoDia.find(a => a.hora_inicio.startsWith(slot.inicio));
        const div = document.createElement('div');

        if (aulaEncontrada) {
            div.className = "slot-horario slot-ocupado";
            div.innerHTML = `
                        <h4><i class="fas fa-clock"></i> ${slot.inicio} - ${slot.fim}</h4>
                        <p><strong>Disciplina:</strong> ${aulaEncontrada.nome_disciplina}</p>
                        ${aulaEncontrada.nome_professor ? `<p><strong>Professor:</strong> ${aulaEncontrada.nome_professor}</p>` : ''}
                        <p style="color: #e74c3c; margin-top: 5px;"><strong><i class="fas fa-ban"></i> Reservado</strong></p>
                    `;
        } else {
            div.className = "slot-horario slot-livre";
            div.innerHTML = `
                        <h4><i class="fas fa-clock"></i> ${slot.inicio} - ${slot.fim}</h4>
                        <p style="color: #2ecc71;"><strong><i class="fas fa-check-circle"></i> Livre</strong></p>
                    `;
        }
        listaHorarios.appendChild(div);
    });
}
