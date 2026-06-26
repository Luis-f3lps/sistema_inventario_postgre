// Variáveis globais para armazenar os dados brutos e os objetos dos gráficos
        let dadosGlobais = [];
        let instanciasGraficos = {}; 

        function contarOcorrencias(array, chave) {
            return array.reduce((acc, obj) => {
                let valor = obj[chave] || 'Não Informado';
                acc[valor] = (acc[valor] || 0) + 1;
                return acc;
            }, {});
        }

        // Função modificada para DESTRUIR o gráfico antigo antes de criar um novo
        function criarGraficoPie(idCanvas, dadosContados, chaveGrafico) {
            const ctx = document.getElementById(idCanvas).getContext('2d');
            
            // Se já existe um gráfico naquele espaço, a gente apaga ele primeiro
            if (instanciasGraficos[chaveGrafico]) {
                instanciasGraficos[chaveGrafico].destroy();
            }

            const cores = [
                '#4285F4', '#EA4335', '#FBBC05', '#34A853', 
                '#8AB4F8', '#F28B82', '#FDE293', '#81C995',
                '#C5221F', '#185ABC', '#F29900', '#137333'
            ];

            instanciasGraficos[chaveGrafico] = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: Object.keys(dadosContados),
                    datasets: [{
                        data: Object.values(dadosContados),
                        backgroundColor: cores.slice(0, Object.keys(dadosContados).length),
                        borderWidth: 1,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { boxWidth: 12 } }
                    }
                }
            });
        }

        function preencherSelects() {
            const selectProfessor = document.getElementById('filtroProfessor');
            const selectLaboratorio = document.getElementById('filtroLaboratorio');

            // Pega nomes únicos usando Set
            const professoresUnicos = [...new Set(dadosGlobais.map(item => item.nome_professor))].sort();
            const laboratoriosUnicos = [...new Set(dadosGlobais.map(item => item.nome_laboratorio))].sort();

            professoresUnicos.forEach(prof => {
                if(prof) selectProfessor.innerHTML += `<option value="${prof}">${prof}</option>`;
            });

            laboratoriosUnicos.forEach(lab => {
                if(lab) selectLaboratorio.innerHTML += `<option value="${lab}">${lab}</option>`;
            });
        }

        // Função mágica que roda toda vez que alguém muda o valor dos <select>
        function aplicarFiltros() {
            const profSelecionado = document.getElementById('filtroProfessor').value;
            const labSelecionado = document.getElementById('filtroLaboratorio').value;

            // Filtra os dados baseados na escolha do usuário
            const dadosFiltrados = dadosGlobais.filter(item => {
                const bateProfessor = (profSelecionado === 'todos') || (item.nome_professor === profSelecionado);
                const bateLaboratorio = (labSelecionado === 'todos') || (item.nome_laboratorio === labSelecionado);
                return bateProfessor && bateLaboratorio;
            });

            // Reconta os dados da lista filtrada
            const contagemProfessores = contarOcorrencias(dadosFiltrados, 'nome_professor');
            const contagemStatus = contarOcorrencias(dadosFiltrados, 'statusFormatado');
            const contagemLaboratorios = contarOcorrencias(dadosFiltrados, 'nome_laboratorio');
            const contagemDisciplinas = contarOcorrencias(dadosFiltrados, 'nome_disciplina');
            const contagemHorarios = contarOcorrencias(dadosFiltrados, 'horarioFormatado');
            const contagemTecnico = contarOcorrencias(dadosFiltrados, 'tecnicoFormatado');

            // Redesenha os gráficos
            criarGraficoPie('graficoProfessor', contagemProfessores, 'prof');
            criarGraficoPie('graficoStatus', contagemStatus, 'status');
            criarGraficoPie('graficoLaboratorio', contagemLaboratorios, 'lab');
            criarGraficoPie('graficoDisciplina', contagemDisciplinas, 'disc');
            criarGraficoPie('graficoHorario', contagemHorarios, 'hora');
            criarGraficoPie('graficoTecnico', contagemTecnico, 'tec');
        }

        async function iniciarDashboard() {
            try {
                const response = await fetch('/api/dashboard-dados');
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                
                const dataBruta = await response.json();

                // Formatação inicial
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

        window.onload = iniciarDashboard;