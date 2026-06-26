// Variáveis globais para armazenar os dados brutos e os objetos dos gráficos
let dadosGlobais = [];
let instanciasGraficos = {}; 

// -------------------------------------------------------------
// FUNÇÕES MATEMÁTICAS E DE AGRUPAMENTO
// -------------------------------------------------------------

function contarOcorrencias(array, chave) {
    return array.reduce((acc, obj) => {
        let valor = obj[chave] || 'Não Informado';
        acc[valor] = (acc[valor] || 0) + 1;
        return acc;
    }, {});
}

function somarValorPorChave(array, chaveAgrupamento, chaveValor) {
    return array.reduce((acc, obj) => {
        let chave = obj[chaveAgrupamento] || 'Não Informado';
        let valor = parseInt(obj[chaveValor]) || 0; 
        acc[chave] = (acc[chave] || 0) + valor;
        return acc;
    }, {});
}

function mediaValorPorChave(array, chaveAgrupamento, chaveValor) {
    const somas = {};
    const contagens = {};
    
    array.forEach(obj => {
        let chave = obj[chaveAgrupamento] || 'Não Informado';
        let valor = parseInt(obj[chaveValor]) || 0;
        somas[chave] = (somas[chave] || 0) + valor;
        contagens[chave] = (contagens[chave] || 0) + 1;
    });
    
    const medias = {};
    for (let chave in somas) {
        medias[chave] = Math.round(somas[chave] / contagens[chave]); 
    }
    return medias;
}

// -------------------------------------------------------------
// FUNÇÕES DE DESENHAR GRÁFICOS (CHART.JS)
// -------------------------------------------------------------

function criarGraficoPie(idCanvas, dadosContados, chaveGrafico) {
    const ctx = document.getElementById(idCanvas).getContext('2d');
    if (instanciasGraficos[chaveGrafico]) instanciasGraficos[chaveGrafico].destroy();

    const cores = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#8AB4F8', '#F28B82', '#FDE293', '#81C995', '#C5221F', '#185ABC', '#F29900', '#137333'];

    instanciasGraficos[chaveGrafico] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(dadosContados),
            datasets: [{
                data: Object.values(dadosContados),
                backgroundColor: cores.slice(0, Object.keys(dadosContados).length),
                borderWidth: 1, borderColor: '#ffffff'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } }
    });
}

function criarGraficoLinhaArea(idCanvas, dadosContados, chaveGrafico) {
    const ctx = document.getElementById(idCanvas).getContext('2d');
    if (instanciasGraficos[chaveGrafico]) instanciasGraficos[chaveGrafico].destroy();

    const labelsOrdenadas = Object.keys(dadosContados).sort();
    const dadosOrdenados = labelsOrdenadas.map(label => dadosContados[label]);

    instanciasGraficos[chaveGrafico] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labelsOrdenadas,
            datasets: [{
                label: 'Volume de Alunos',
                data: dadosOrdenados,
                backgroundColor: 'rgba(59, 130, 246, 0.2)', 
                borderColor: '#3b82f6',
                borderWidth: 2,
                fill: true, // Preenche a área debaixo da linha
                tension: 0.4 // Deixa as curvas suaves 
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, 
            scales: { y: { beginAtZero: true } }
        }
    });
}

function criarGraficoBarraHorizontal(idCanvas, dadosContados, chaveGrafico) {
    const ctx = document.getElementById(idCanvas).getContext('2d');
    if (instanciasGraficos[chaveGrafico]) instanciasGraficos[chaveGrafico].destroy();

    instanciasGraficos[chaveGrafico] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(dadosContados),
            datasets: [{
                label: 'Média de Alunos por Aula',
                data: Object.values(dadosContados),
                backgroundColor: '#10b981', 
                borderRadius: 4 // Arredonda as pontas das barras
            }]
        },
        options: { 
            indexAxis: 'y', // Transforma a barra de vertical para horizontal
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true } }
        }
    });
}

// -------------------------------------------------------------
// LÓGICA PRINCIPAL (FILTROS E RENDERIZAÇÃO)
// -------------------------------------------------------------

function preencherSelects() {
    const selectProfessor = document.getElementById('filtroProfessor');
    const selectLaboratorio = document.getElementById('filtroLaboratorio');

    const professoresUnicos = [...new Set(dadosGlobais.map(item => item.nome_professor))].sort();
    const laboratoriosUnicos = [...new Set(dadosGlobais.map(item => item.nome_laboratorio))].sort();

    professoresUnicos.forEach(prof => { if(prof) selectProfessor.innerHTML += `<option value="${prof}">${prof}</option>`; });
    laboratoriosUnicos.forEach(lab => { if(lab) selectLaboratorio.innerHTML += `<option value="${lab}">${lab}</option>`; });
}

function aplicarFiltros() {
    const profSelecionado = document.getElementById('filtroProfessor').value;
    const labSelecionado = document.getElementById('filtroLaboratorio').value;

    const dadosFiltrados = dadosGlobais.filter(item => {
        const bateProfessor = (profSelecionado === 'todos') || (item.nome_professor === profSelecionado);
        const bateLaboratorio = (labSelecionado === 'todos') || (item.nome_laboratorio === labSelecionado);
        return bateProfessor && bateLaboratorio;
    });

    const contagemProfessores = contarOcorrencias(dadosFiltrados, 'nome_professor');
    const contagemStatus = contarOcorrencias(dadosFiltrados, 'statusFormatado');
    const contagemLaboratorios = contarOcorrencias(dadosFiltrados, 'nome_laboratorio');
    const contagemDisciplinas = contarOcorrencias(dadosFiltrados, 'nome_disciplina');
    const contagemHorarios = contarOcorrencias(dadosFiltrados, 'horarioFormatado');
    const contagemTecnico = contarOcorrencias(dadosFiltrados, 'tecnicoFormatado');

    const somaAlunosPorHorario = somarValorPorChave(dadosFiltrados, 'horarioFormatado', 'numero_discentes');
    const mediaAlunosPorLab = mediaValorPorChave(dadosFiltrados, 'nome_laboratorio', 'numero_discentes');

    criarGraficoPie('graficoProfessor', contagemProfessores, 'prof');
    criarGraficoPie('graficoStatus', contagemStatus, 'status');
    criarGraficoPie('graficoLaboratorio', contagemLaboratorios, 'lab');
    criarGraficoPie('graficoDisciplina', contagemDisciplinas, 'disc');
    criarGraficoPie('graficoHorario', contagemHorarios, 'hora');
    criarGraficoPie('graficoTecnico', contagemTecnico, 'tec');
    criarGraficoLinhaArea('graficoFluxoAlunos', somaAlunosPorHorario, 'fluxo_alunos');
    criarGraficoBarraHorizontal('graficoMediaAlunosLab', mediaAlunosPorLab, 'media_alunos');
}

async function iniciarDashboard() {
    try {
        const response = await fetch('/api/dashboard-dados');
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        
        const dataBruta = await response.json();

        dadosGlobais = dataBruta.map(item => {
            let statusBonito = item.status === 'autorizado' ? 'Autorizada' : 
                               item.status === 'nao_autorizado' ? 'Não Autorizada' : 
                               item.status === 'analisando' ? 'Em Análise' : item.status;
            let tecnicoBonito = item.precisa_tecnico ? 'Sim' : 'Não';
            let inicio = item.hora_inicio ? item.hora_inicio.slice(0, 5) : '--:--';
            let fim = item.hora_fim ? item.hora_fim.slice(0, 5) : '--:--';

            return {
                ...item,
                statusFormatado: statusBonito,
                tecnicoFormatado: tecnicoBonito,
                horarioFormatado: `${inicio} - ${fim}`
            };
        });

        preencherSelects();
        aplicarFiltros();

    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        alert("Falha ao carregar os dados.");
    }
}

function baixarRelatorioAulas() {
    const profSelecionado = document.getElementById('filtroProfessor').value;
    const labSelecionado = document.getElementById('filtroLaboratorio').value;
    const url = `/api/relatorio-aulas-pdf?professor=${encodeURIComponent(profSelecionado)}&laboratorio=${encodeURIComponent(labSelecionado)}`;
    window.open(url, '_blank');
}

window.onload = iniciarDashboard;