let mesExibido;
let anoExibido;
let dataReferenciaSemanaResponsavel = new Date();

document.addEventListener("menuReady", (event) => {
  const { userData } = event.detail;
  inicializarDashboard(userData);
});

async function inicializarDashboard(userData) {
  const hoje = new Date();
  mesExibido = hoje.getMonth();
  anoExibido = hoje.getFullYear();

  const userType = userData.tipo_usuario ? userData.tipo_usuario.trim().toLowerCase() : "";

  const showElement = (selector) => {
    const el = document.querySelector(selector);
    if (el) el.style.display = "block";
  };

  document.querySelectorAll(".cartao-painel").forEach((el) => (el.style.display = "none"));

  // Para salas, Administradores e Técnicos têm visão de Gestor de Salas. Professores têm visão de solicitante.
  if (userType === "tecnico" || userType === "admin") {
      const grelha = document.querySelector(".painel-grelha");
      if (grelha) {
        grelha.style.display = "block";
        grelha.style.gap = "20px";
        grelha.style.marginBottom = "20px";
      }

      showElement(".cartao-aulas-responsavel");
      showElement(".cartao-minhas-salas");
      showElement(".painel-aulas-responsavel-lista");

      document.getElementById("btn-mes-anterior-responsavel")?.addEventListener("click", mostrarSemanaAnteriorResponsavel);
      document.getElementById("btn-proximo-mes-responsavel")?.addEventListener("click", mostrarProximaSemanaResponsavel);
  } else if (userType === "professor") {
      showElement(".cartao-aulas-autorizadas");
      showElement(".painel-minhas-aulas");
      showElement(".cartao-horarios-hoje");

      carregarAulasDeHoje();

      document.getElementById("btn-mes-anterior")?.addEventListener("click", mostrarMesAnteriorProfessor);
      document.getElementById("btn-proximo-mes")?.addEventListener("click", mostrarProximoMesProfessor);
  }

  await carregarDadosDosPaineis(userType);

  if (userType === "professor") {
    loadMyRequests();
  }
}

async function carregarDadosDosPaineis(userType) {
  try {
    if (userType === "professor") {
      const aulasDoMesAtual = await fetchAulasDoCalendarioProfessor(anoExibido, mesExibido + 1);
      renderizarCalendarioProfessor(aulasDoMesAtual, anoExibido, mesExibido);
    } else if (userType === "tecnico" || userType === "admin") {
      const [minhasSalas, aulasDoMesAtualResponsavel, aulasListaResponsavel] = await Promise.all([
          fetch("/api/dashboard/minhas-salas").then((res) => res.json()),
          fetchAulasDoCalendarioResponsavel(anoExibido, mesExibido + 1),
          fetch("/api/aulas-minhas-salas").then((res) => res.json()),
      ]);
      renderizarMinhasSalas(minhasSalas);
      renderizarCalendarioResponsavel(aulasDoMesAtualResponsavel, anoExibido, mesExibido);
      renderizarAulasNasMinhasSalas(aulasListaResponsavel);
    }
  } catch (error) {
    console.error(error);
  }
}

function agruparSolicitacoes(requisicoes) {
    const agrupado = [];
    const mapaPedidos = new Map();

    requisicoes.forEach((req) => {
        if (req.tipo_aula === "recorrente" && req.id_pedido) {
            if (mapaPedidos.has(req.id_pedido)) {
                mapaPedidos.get(req.id_pedido).aulas.push(req);
            } else {
                const novoGrupo = { ...req, is_grupo: true, aulas: [req] };
                mapaPedidos.set(req.id_pedido, novoGrupo);
                agrupado.push(novoGrupo);
            }
        } else {
            agrupado.push(req);
        }
    });

    return agrupado;
}

function renderTable(requests) {
    const container = document.getElementById("minhas-aulas-container");
    if (!container) return;

    container.innerHTML = "";

    if (requests.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #666; padding: 20px;">Você não tem nenhuma solicitação de sala futura.</p>`;
        return;
    }

    const requisicoesAgrupadas = agruparSolicitacoes(requests);

    requisicoesAgrupadas.forEach((r) => {
        let textoData = "";
        let textoHorario = "";
        let listaIdsParaCancelar = [];
        let labelRecorrente = "";

        if (r.is_grupo) {
            const datas = r.aulas.map(a => new Date(a.data));
            const dataMin = new Date(Math.min(...datas)).toLocaleDateString("pt-BR", { timeZone: "UTC" });
            const dataMax = new Date(Math.max(...datas)).toLocaleDateString("pt-BR", { timeZone: "UTC" });
            textoData = dataMin === dataMax ? dataMin : `De ${dataMin} até ${dataMax}`;
            labelRecorrente = `<span style="background: #e3f2fd; color: #0d6efd; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">🔄 ${r.aulas.length} Aulas</span>`;
            listaIdsParaCancelar = r.aulas.map(a => a.id_agendamento);

            const horariosUnicos = [...new Set(r.aulas.map(a => `${a.hora_inicio.slice(0, 5)} - ${a.hora_fim.slice(0, 5)}`))];
            textoHorario = horariosUnicos.join(', ');
        } else {
            textoData = new Date(r.data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
            listaIdsParaCancelar = [r.id_agendamento];
            textoHorario = `${r.hora_inicio.slice(0, 5)} - ${r.hora_fim.slice(0, 5)}`;
        }

        const linkRoteiroHtml = formatarLinkRoteiro(r.link_roteiro, "Ver Material");
        const textoStatus = formatarTextoStatus(r.status);
        const isDesativado = r.status === "nao_autorizado" || r.status === "cancelado";
        const estiloBotao = isDesativado ? "background-color: #f1f1f1; color: #a1a1a1; cursor: not-allowed; border: 1px solid #ddd;" : "background-color: #ff4d4d; color: white; cursor: pointer; border: none;";

        const card = document.createElement("div");
        card.className = "aula-card";
        card.innerHTML = `
            <div class="aula-card-header">
                <h3>${r.nome_disciplina} ${labelRecorrente}</h3>
                <span class="etiqueta-status status-${r.status}">${textoStatus}</span>
            </div>
            <div class="aula-card-body">
                <div class="aula-card-info-linha">
                    <p><strong><i class="far fa-calendar-alt"></i> Data:</strong> ${textoData}</p>
                    <p><strong><i class="far fa-clock"></i> Horário:</strong> ${textoHorario}</p>
                    <p><strong><i class="fas fa-desktop"></i> Apoio Técnico:</strong> ${r.precisa_tecnico ? "Sim" : "Não"}</p>
                    <p><strong><i class="fas fa-chalkboard"></i> Sala:</strong> ${r.nome_sala}</p>
                </div>
            </div>
            <div class="aula-card-footer">
                <div class="aula-card-roteiro">${linkRoteiroHtml}</div>
                <button class="btn-cancelar-card" onclick='cancelarAgendamentoSala(${JSON.stringify(listaIdsParaCancelar)})' ${isDesativado ? "disabled" : ""} style="${estiloBotao}">
                    <i class="fas fa-times"></i> Cancelar ${r.is_grupo ? "Pacote" : "Reserva"}
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderizarAulasNasMinhasSalas(aulas) {
    const container = document.getElementById("corpo-tabela-aulas-responsavel");
    if (!container) return;
    
    container.innerHTML = "";
    if (!aulas || aulas.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Nenhuma aula futura autorizada nas suas salas.</p>';
        return;
    }
    
    const aulasAgrupadas = agruparSolicitacoes(aulas);
    aulasAgrupadas.forEach((aulaGroup) => {
        let textoData = "";
        let textoHorario = "";
        let labelRecorrente = "";
        
        if (aulaGroup.is_grupo) {
            const datas = aulaGroup.aulas.map(a => new Date(a.data));
            const dataMin = new Date(Math.min(...datas)).toLocaleDateString("pt-BR", { timeZone: "UTC" });
            const dataMax = new Date(Math.max(...datas)).toLocaleDateString("pt-BR", { timeZone: "UTC" });
            textoData = dataMin === dataMax ? dataMin : `De ${dataMin} até ${dataMax}`;
            labelRecorrente = `<span style="background: #e3f2fd; color: #0d6efd; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">🔄 ${aulaGroup.aulas.length} Aulas</span>`;
            const horariosUnicos = [...new Set(aulaGroup.aulas.map(a => `${a.hora_inicio.slice(0, 5)} - ${a.hora_fim.slice(0, 5)}`))];
            textoHorario = horariosUnicos.join(', ');
        } else {
            textoData = new Date(aulaGroup.data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
            textoHorario = `${aulaGroup.hora_inicio.slice(0, 5)} - ${aulaGroup.hora_fim.slice(0, 5)}`;
        }

        const linkRoteiroHtml = aulaGroup.link_roteiro ? `<a href="${aulaGroup.link_roteiro}" target="_blank" class="link-roteiro">Acessar Link</a>` : 'Não exigido';

        const card = document.createElement("div");
        card.className = "aula-card"; 
        card.innerHTML = `
            <div class="aula-card-header">
                <h3>${aulaGroup.nome_disciplina || 'Disciplina não informada'} ${labelRecorrente}</h3>
                <span class="etiqueta-status status-autorizado">Autorizado</span>
            </div>
            <div class="aula-card-body">
                <div class="aula-card-info-linha">
                    <p><strong><i class="fas fa-user-graduate"></i> Professor:</strong> ${aulaGroup.nome_professor}</p>
                    <p><strong><i class="fas fa-chalkboard"></i> Sala:</strong> ${aulaGroup.nome_sala}</p>
                    <p><strong><i class="far fa-calendar-alt"></i> Data:</strong> ${textoData}</p>
                    <p><strong><i class="far fa-clock"></i> Horário:</strong> ${textoHorario}</p>
                    <p><strong><i class="fas fa-users"></i> Alunos:</strong> ${aulaGroup.numero_discentes || '-'}</p>
                    <p><strong><i class="fas fa-desktop"></i> Apoio Técnico:</strong> ${aulaGroup.precisa_tecnico ? "Sim" : "Não"}</p>
                </div>
                <p style="margin-top: 10px; font-size: 0.9em; color: #666;"><strong>Observações:</strong> ${aulaGroup.observacoes ? aulaGroup.observacoes : "Nenhuma observação."}</p>
            </div>
            <div class="aula-card-footer" style="display: flex; justify-content: flex-start; margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;">
                <div class="aula-card-roteiro"><strong>Material:</strong> ${linkRoteiroHtml}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function cancelarAgendamentoSala(listaIds) {
  if (!confirm("Confirmar o cancelamento desta(s) reserva(s)?")) return;
  try {
    const promessas = listaIds.map(id => 
        fetch(`/api/agendamentos-salas/${id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "cancelado" })
        })
    );
    await Promise.all(promessas);
    alert("Agendamento cancelado!");
    loadMyRequests();
  } catch (error) {
    console.error(error);
    alert("Erro ao processar a requisição.");
  }
}

async function mostrarMesAnteriorProfessor() {
  mesExibido--;
  if (mesExibido < 0) { mesExibido = 11; anoExibido--; }
  const novasAulas = await fetchAulasDoCalendarioProfessor(anoExibido, mesExibido + 1);
  renderizarCalendarioProfessor(novasAulas, anoExibido, mesExibido);
}
async function mostrarProximoMesProfessor() {
  mesExibido++;
  if (mesExibido > 11) { mesExibido = 0; anoExibido++; }
  const novasAulas = await fetchAulasDoCalendarioProfessor(anoExibido, mesExibido + 1);
  renderizarCalendarioProfessor(novasAulas, anoExibido, mesExibido);
}

async function mostrarSemanaAnteriorResponsavel() {
  dataReferenciaSemanaResponsavel.setDate(dataReferenciaSemanaResponsavel.getDate() - 7);
  const mes = dataReferenciaSemanaResponsavel.getMonth() + 1;
  const ano = dataReferenciaSemanaResponsavel.getFullYear();
  const novasAulas = await fetchAulasDoCalendarioResponsavel();
  renderizarCalendarioResponsavel(novasAulas, ano, mes - 1);
}

async function mostrarProximaSemanaResponsavel() {
  dataReferenciaSemanaResponsavel.setDate(dataReferenciaSemanaResponsavel.getDate() + 7);
  const mes = dataReferenciaSemanaResponsavel.getMonth() + 1;
  const ano = dataReferenciaSemanaResponsavel.getFullYear();
  const novasAulas = await fetchAulasDoCalendarioResponsavel();
  renderizarCalendarioResponsavel(novasAulas, ano, mes - 1);
}

async function fetchAulasDoCalendarioProfessor(ano, mes) {
  try {
    const response = await fetch(`/api/calendario/aulas-autorizadas-salas?ano=${ano}&mes=${mes}`);
    if (!response.ok) throw new Error("Falha ao buscar dados");
    return await response.json();
  } catch (error) { return []; }
}

async function fetchAulasDoCalendarioResponsavel() {
  try {
    const inicioSemana = new Date(dataReferenciaSemanaResponsavel);
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());

    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(fimSemana.getDate() + 6);

    const mesInicio = inicioSemana.getMonth() + 1;
    const anoInicio = inicioSemana.getFullYear();
    const mesFim = fimSemana.getMonth() + 1;
    const anoFim = fimSemana.getFullYear();

    const response1 = await fetch(`/api/calendario/aulas-responsavel-salas?ano=${anoInicio}&mes=${mesInicio}`);
    let aulas = await response1.json();

    if (mesInicio !== mesFim) {
        const response2 = await fetch(`/api/calendario/aulas-responsavel-salas?ano=${anoFim}&mes=${mesFim}`);
        if (response2.ok) {
            const aulasMes2 = await response2.json();
            aulas = [...aulas, ...aulasMes2]; 
        }
    }
    return aulas;
  } catch (error) { return []; }
}

async function loadMyRequests() {
  try {
    const res = await fetch(`/api/minhas-solicitacoes-salas`);
    if (!res.ok) throw new Error("Erro");
    const data = await res.json();
    renderTable(data);
  } catch (error) {
    console.error(error);
  }
}

function renderizarBaseCalendario(grid, titulo, aulas, ano, mes, formatarTooltip) {
  const dataBase = new Date(ano, mes, 1);
  const nomeDoMes = dataBase.toLocaleString("pt-BR", { month: "long" });
  titulo.textContent = `${nomeDoMes.toUpperCase()} • ${ano}`;

  const aulasPorDia = {};
  aulas.forEach((aula) => {
    const dataAula = new Date(aula.data);
    if (dataAula.getMonth() === mes && dataAula.getFullYear() === ano) {
      const dia = dataAula.getUTCDate();
      if (!aulasPorDia[dia]) aulasPorDia[dia] = [];
      aulasPorDia[dia].push(aula);
    }
  });

  const primeiroDiaDoMes = dataBase.getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const hoje = new Date();
  grid.innerHTML = "";

  for (let i = 0; i < primeiroDiaDoMes; i++) grid.innerHTML += `<div class="dia-calendario dia-vazio"></div>`;

  for (let dia = 1; dia <= diasNoMes; dia++) {
    let classesCss = "dia-calendario";
    let eventosDoDia = "";
    if (dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()) classesCss += " hoje";
    
    if (aulasPorDia[dia]) {
      const temRecorrente = aulasPorDia[dia].some((aula) => aula.tipo_aula && aula.tipo_aula.trim().toLowerCase() === "recorrente");
      const temRegular = aulasPorDia[dia].some((aula) => !aula.tipo_aula || aula.tipo_aula.trim().toLowerCase() !== "recorrente");

      if (temRecorrente && temRegular) classesCss += " tem-aula-mista";
      else if (temRecorrente) classesCss += " tem-aula-recorrente";
      else if (temRegular) classesCss += " tem-aula";

      eventosDoDia = `<div class="tooltip">${aulasPorDia[dia].map(formatarTooltip).join("")}</div>`;
    }
    grid.innerHTML += `<div class="${classesCss}"><span>${dia}</span>${eventosDoDia}</div>`;
  }
}

function renderizarCalendarioProfessor(aulas, ano, mes) {
  const grid = document.getElementById("calendario-grid");
  const titulo = document.getElementById("calendario-titulo");
  if (!grid || !titulo) return;
  renderizarBaseCalendario(grid, titulo, aulas, ano, mes, (aula) =>
      `<p><strong>${aula.hora_inicio.slice(0, 5)} - ${aula.hora_fim.slice(0, 5)}:</strong> ${aula.nome_disciplina}<br><em>(${aula.nome_sala})</em></p>`
  );
}

function renderizarCalendarioResponsavel(aulas, ano, mes) {
  const grid = document.getElementById("calendario-grid-responsavel");
  const titulo = document.getElementById("calendario-titulo-responsavel");
  if (!grid || !titulo) return;

  const inicioSemana = new Date(dataReferenciaSemanaResponsavel);
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(fimSemana.getDate() + 6);

  const formatador = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  titulo.textContent = `${formatador.format(inicioSemana)} - ${formatador.format(fimSemana)} • ${inicioSemana.getFullYear()}`;

  grid.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const diaAtual = new Date(inicioSemana);
    diaAtual.setDate(inicioSemana.getDate() + i);

    const diaNumero = diaAtual.getDate();
    const mesAtual = diaAtual.getMonth();
    const anoAtual = diaAtual.getFullYear();

    let classesCss = "dia-calendario";
    const hoje = new Date();

    if (diaNumero === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear()) classesCss += " hoje";

    const aulasDoDia = aulas.filter((aula) => {
      const d = new Date(aula.data);
      return d.getUTCDate() === diaNumero && d.getUTCMonth() === mesAtual && d.getUTCFullYear() === anoAtual;
    });

    let eventosDoDia = "";
    if (aulasDoDia.length > 0) {
      const temRecorrente = aulasDoDia.some((a) => a.tipo_aula === "recorrente");
      const temRegular = aulasDoDia.some((a) => a.tipo_aula !== "recorrente");

      if (temRecorrente && temRegular) classesCss += " tem-aula-mista";
      else if (temRecorrente) classesCss += " tem-aula-recorrente";
      else classesCss += " tem-aula";

      eventosDoDia = `<div class="tooltip">${aulasDoDia.map(
          (aula) => `<p><strong>${aula.hora_inicio.slice(0, 5)} - ${aula.hora_fim.slice(0, 5)}:</strong> ${aula.nome_disciplina}<br><em>Sala: ${aula.nome_sala}<br>(Prof: ${aula.nome_professor})</em></p>`
        ).join("")}</div>`;
    }
    grid.innerHTML += `<div class="${classesCss}"><span>${diaNumero}</span>${eventosDoDia}</div>`;
  }
}

function renderizarMinhasSalas(salas) {
  const lista = document.getElementById("lista-minhas-salas");
  if (!lista) return;
  lista.innerHTML = salas.length === 0
      ? "<li>Você não é responsável por nenhuma sala de aula.</li>"
      : salas.map((s) => `<li>${s.nome_sala}</li>`).join("");
}

function formatarLinkRoteiro(url, textoLink = "Ver") {
  if (!url) return "N/A";
  let linkCorrigido = url.trim();
  if (linkCorrigido && !/^(https?:\/\/|^\/\/)/i.test(linkCorrigido)) {
    linkCorrigido = `//${linkCorrigido}`;
  }
  return `<a href="${linkCorrigido}" target="_blank" class="link-roteiro">${textoLink}</a>`;
}

function formatarTextoStatus(status) {
  switch (status) {
    case "autorizado": return "Autorizado";
    case "nao_autorizado": return "Não Autorizado";
    case "analisando": return "Em Análise";
    case "cancelado": return "Cancelado";
    default: return status;
  }
}

async function carregarAulasDeHoje() {
  const container = document.getElementById("lista-horarios-hoje");
  if (!container) return;

  try {
    const res = await fetch('/api/aulas-hoje-salas');
    if (!res.ok) throw new Error();
    const aulas = await res.json();
    container.innerHTML = "";

    if (aulas.length === 0) {
      container.innerHTML = "<p style='text-align:center; color:#666; padding: 20px;'>Nenhuma sala agendada para hoje.</p>";
      return;
    }

    aulas.forEach(aula => {
      const div = document.createElement("div");
      div.className = "item-horario-hoje";
      div.innerHTML = `
        <div class="item-horario-hora">
            <i class="fas fa-clock"></i> ${aula.hora_inicio.slice(0, 5)} - ${aula.hora_fim.slice(0, 5)}
        </div>
        <div class="item-horario-info">
            <h4>${aula.nome_disciplina}</h4>
            <p><i class="fas fa-chalkboard"></i> ${aula.nome_sala}</p>
        </div>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    container.innerHTML = "<p style='color:red; text-align:center;'>Erro ao carregar horários.</p>";
  }
}