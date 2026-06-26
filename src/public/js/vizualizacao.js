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
                // Pegando os dados REAIS direto da sua API
                const response = await fetch('/api/dashboard-dados');
                
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
                
                const data = await response.json();

                // Processando os dados que vieram do banco
                const contagemProfessores = contarOcorrencias(data, 'nome_professor');
                const contagemStatus = contarOcorrencias(data, 'status');
                const contagemLaboratorios = contarOcorrencias(data, 'nome_laboratorio');
                const contagemDisciplinas = contarOcorrencias(data, 'nome_disciplina');

                // Desenhando os gráficos
                criarGraficoPie('graficoProfessor', contagemProfessores);
                criarGraficoPie('graficoStatus', contagemStatus);
                criarGraficoPie('graficoLaboratorio', contagemLaboratorios);
                criarGraficoPie('graficoDisciplina', contagemDisciplinas);

            } catch (error) {
                console.error("Erro ao carregar os dados do banco:", error);
                alert("Falha ao carregar os dados do dashboard.");
            }
        }

        window.onload = carregarDashboard;