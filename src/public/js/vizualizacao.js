function contarOcorrencias(array, chave) {
            return array.reduce((acc, obj) => {
                let valor = obj[chave] || 'Não Informado';
                acc[valor] = (acc[valor] || 0) + 1;
                return acc;
            }, {});
        }

        function criarGraficoPie(idCanvas, dadosContados) {
            const ctx = document.getElementById(idCanvas).getContext('2d');
            const cores = [
                '#4285F4', '#EA4335', '#FBBC05', '#34A853', 
                '#8AB4F8', '#F28B82', '#FDE293', '#81C995',
                '#C5221F', '#185ABC', '#F29900', '#137333'
            ];

            new Chart(ctx, {
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

        async function carregarDashboard() {
            try {
                // Pegando os dados do banco
                const response = await fetch('/api/dashboard-dados');
                
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
                
                const dataBruta = await response.json();

                const dataFormatada = dataBruta.map(item => {
                    
                    // 1. Formatando o Status
                    let statusBonito = item.status;
                    if (item.status === 'autorizado') statusBonito = 'Autorizada';
                    if (item.status === 'nao_autorizado') statusBonito = 'Não Autorizada';
                    if (item.status === 'analisando') statusBonito = 'Em Análise';

                    // 2. Formatando o Técnico (true -> Sim / false -> Não)
                    let tecnicoBonito = item.precisa_tecnico ? 'Sim' : 'Não';

                    // 3. Formatando o Horário (ex: "07:20 - 08:10")
                    let inicio = item.hora_inicio ? item.hora_inicio.slice(0, 5) : '--:--';
                    let fim = item.hora_fim ? item.hora_fim.slice(0, 5) : '--:--';
                    let horarioLindo = `${inicio} - ${fim}`;

                    return {
                        ...item, 
                        statusFormatado: statusBonito,
                        tecnicoFormatado: tecnicoBonito,
                        horarioFormatado: horarioLindo
                    };
                });

                // Contando tudo usando a nova lista formatada
                const contagemProfessores = contarOcorrencias(dataFormatada, 'nome_professor');
                const contagemStatus = contarOcorrencias(dataFormatada, 'statusFormatado');
                const contagemLaboratorios = contarOcorrencias(dataFormatada, 'nome_laboratorio');
                const contagemDisciplinas = contarOcorrencias(dataFormatada, 'nome_disciplina');
                const contagemHorarios = contarOcorrencias(dataFormatada, 'horarioFormatado');
                const contagemTecnico = contarOcorrencias(dataFormatada, 'tecnicoFormatado');

                // Desenhando todos os 6 gráficos
                criarGraficoPie('graficoProfessor', contagemProfessores);
                criarGraficoPie('graficoStatus', contagemStatus);
                criarGraficoPie('graficoLaboratorio', contagemLaboratorios);
                criarGraficoPie('graficoDisciplina', contagemDisciplinas);
                criarGraficoPie('graficoHorario', contagemHorarios);
                criarGraficoPie('graficoTecnico', contagemTecnico);

            } catch (error) {
                console.error("Erro ao carregar os dados do banco:", error);
                alert("Falha ao carregar os dados do dashboard. Verifique o console.");
            }
        }

        window.onload = carregarDashboard;