let mesExibido;
let anoExibido;
let dataReferenciaSemanaTecnico = new Date();

document.addEventListener("menuReady", (event) => {
  const { userData } = event.detail;
  inicializarDashboard(userData);
});

async function inicializarDashboard(userData) {
  const hoje = new Date();
  mesExibido = hoje.getMonth();
  anoExibido = hoje.getFullYear();

  const userType = userData.tipo_usuario
    ? userData.tipo_usuario.trim().toLowerCase()
    : "";

  const showElement = (selector) => {
    const el = document.querySelector(selector);
    if (el) el.style.display = "block";
  };

  document
    .querySelectorAll(".cartao-painel")
    .forEach((el) => (el.style.display = "none"));

  switch (userType) {
    case "tecnico":
      const grelha = document.querySelector(".painel-grelha");
      if (grelha) {
        grelha.style.display = "block";
        grelha.style.gap = "20px";
        grelha.style.marginBottom = "20px";
      }

      showElement(".cartao-aulas-tecnico");
      showElement(".cartao-meus-laboratorios");
      showElement(".painel-aulas-tecnico-lista");

      document
        .getElementById("btn-mes-anterior-tecnico")
        ?.addEventListener("click", mostrarSemanaAnteriorTecnico);
      document
        .getElementById("btn-proximo-mes-tecnico")
        ?.addEventListener("click", mostrarProximaSemanaTecnico);
      break;

    case "professor":
      showElement(".cartao-aulas-autorizadas");
      showElement(".painel-minhas-aulas");
      showElement(".cartao-horarios-hoje");

      carregarAulasDeHoje();

      document
        .getElementById("btn-mes-anterior")
        ?.addEventListener("click", mostrarMesAnteriorProfessor);
      document
        .getElementById("btn-proximo-mes")
        ?.addEventListener("click", mostrarProximoMesProfessor);
      break;
  }

  await carregarDadosDosPaineis(userType);

  if (userType === "professor") {
    loadMyRequests();
  }
}

async function carregarDadosDosPaineis(userType) {
  try {
    if (userType === "professor") {
      const aulasDoMesAtual = await fetchAulasDoCalendarioProfessor(
        anoExibido,
        mesExibido + 1,
      );
      renderizarCalendarioProfessor(aulasDoMesAtual, anoExibido, mesExibido);
    } else if (userType === "tecnico") {
      const [meusLaboratorios, aulasDoMesAtualTecnico, aulasListaTecnico] =
        await Promise.all([
          fetch("/api/dashboard/meus-laboratorios").then((res) => res.json()),
          fetchAulasDoCalendarioTecnico(anoExibido, mesExibido + 1),
          fetch("/api/aulas-meus-laboratorios").then((res) => res.json()),
        ]);
      renderizarMeusLaboratorios(meusLaboratorios);
      renderizarCalendarioTecnico(
        aulasDoMesAtualTecnico,
        anoExibido,
        mesExibido,
      );
      renderizarAulasNosMeusLaboratorios(aulasListaTecnico);
    }
  } catch (error) {
    console.error(error);
  }
}

// 1. FUNÇÃO AJUDANTE: Junta as aulas recorrentes em pacotes
function agruparSolicitacoes(requisicoes) {
    const agrupado = [];
    const mapaPedidos = new Map();

    requisicoes.forEach((req) => {
        // Se for recorrente e tiver id_pedido, nós agrupamos
        if (req.tipo_aula === "recorrente" && req.id_pedido) {
            if (mapaPedidos.has(req.id_pedido)) {
                // Já existe o grupo, só adiciona a aula dentro dele
                mapaPedidos.get(req.id_pedido).aulas.push(req);
            } else {
                // Cria um novo grupo
                const novoGrupo = { ...req, is_grupo: true, aulas: [req] };
                mapaPedidos.set(req.id_pedido, novoGrupo);
                agrupado.push(novoGrupo);
            }
        } else {
            // Se for aula normal, joga direto na lista
            agrupado.push(req);
        }
    });

    return agrupado;
}


// 2. RENDERIZAR OS CARDS (Painel)
function renderTable(requests) {
    const container = document.getElementById("minhas-aulas-container");
    if (!container) return;

    container.innerHTML = "";

    if (requests.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #666; padding: 20px;">Você não tem nenhuma solicitação futura.</p>`;
        return;
    }

    // Passa a lista original pelo "filtro" de agrupamento
    const requisicoesAgrupadas = agruparSolicitacoes(requests);

    requisicoesAgrupadas.forEach((r) => {
        let textoData = "";
        let listaIdsParaCancelar = [];
        let labelRecorrente = "";

        // Se for um grupo de aulas recorrentes, mostra o período (Início até Fim)
        if (r.is_grupo) {
            const datas = r.aulas.map(a => new Date(a.data));
            const dataMin = new Date(Math.min(...datas)).toLocaleDateString("pt-BR", { timeZone: "UTC" });
            const dataMax = new Date(Math.max(...datas)).toLocaleDateString("pt-BR", { timeZone: "UTC" });
            
            textoData = dataMin === dataMax ? dataMin : `De ${dataMin} até ${dataMax}`;
            labelRecorrente = `<span style="background: #e3f2fd; color: #0d6efd; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">🔄 ${r.aulas.length} Aulas</span>`;
            listaIdsParaCancelar = r.aulas.map(a => a.id_aula); // Pega todos os IDs do pacote
        } else {
            // Aula normal
            textoData = new Date(r.data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
            listaIdsParaCancelar = [r.id_aula];
        }

        const horaInicio = r.hora_inicio ? r.hora_inicio.slice(0, 5) : "N/A";
        const horaFim = r.hora_fim ? r.hora_fim.slice(0, 5) : "N/A";
        const linkRoteiroHtml = formatarLinkRoteiro(r.link_roteiro, "Ver Roteiro");
        const textoStatus = formatarTextoStatus(r.status);

        const isDesativado = r.status === "nao_autorizado" || r.status === "cancelado";
        const estiloBotao = isDesativado
            ? "background-color: #f1f1f1; color: #a1a1a1; cursor: not-allowed; border: 1px solid #ddd;"
            : "background-color: #ff4d4d; color: white; cursor: pointer; border: none;";

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
                    <p><strong><i class="far fa-clock"></i> Horário:</strong> ${horaInicio} - ${horaFim}</p>
                    <p><strong><i class="fas fa-user-cog"></i> Técnico:</strong> ${r.precisa_tecnico ? "Sim" : "Não"}</p>
                    <p><strong><i class="fas fa-flask"></i> Laboratório:</strong> ${r.nome_laboratorio}</p>
                </div>
            </div>
            <div class="aula-card-footer">
                <div class="aula-card-roteiro">
                    ${linkRoteiroHtml}
                </div>
                <button class="btn-cancelar-card" onclick='cancelarLote(${JSON.stringify(listaIdsParaCancelar)})' ${isDesativado ? "disabled" : ""} style="${estiloBotao}">
                    <i class="fas fa-times"></i> Cancelar ${r.is_grupo ? "Pacote" : "Aula"}
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}


// 3. RENDERIZAR A TABELA
function renderizarTabelaAgendamentos(requisicoes) {
    const tbody = document.getElementById("corpo-tabela-agendamentos");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (requisicoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center;">Nenhum agendamento futuro encontrado.</td></tr>`;
        return;
    }

    // Passa a lista original pelo "filtro" de agrupamento
    const requisicoesAgrupadas = agruparSolicitacoes(requisicoes);

    requisicoesAgrupadas.forEach((req) => {
        let textoData = "";
        let listaIdsParaCancelar = [];
        let iconeRecorrente = "";

        if (req.is_grupo) {
            const datas = req.aulas.map(a => new Date(a.data));
            const dataMin = new Date(Math.min(...datas)).toLocaleDateString("pt-BR", { timeZone: "UTC" });
            const dataMax = new Date(Math.max(...datas)).toLocaleDateString("pt-BR", { timeZone: "UTC" });
            
            textoData = dataMin === dataMax ? dataMin : `${dataMin} a ${dataMax}`;
            iconeRecorrente = ` <span title="Pacote Recorrente de ${req.aulas.length} aulas">🔄</span>`;
            listaIdsParaCancelar = req.aulas.map(a => a.id_aula);
        } else {
            textoData = new Date(req.data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
            listaIdsParaCancelar = [req.id_aula];
        }

        const tr = document.createElement("tr");
        const horaInicio = req.hora_inicio ? req.hora_inicio.slice(0, 5) : "N/A";
        const horaFim = req.hora_fim ? req.hora_fim.slice(0, 5) : "N/A";
        const linkMaterialHtml = formatarLinkRoteiro(req.link_roteiro, "Acessar");
        const textoStatus = formatarTextoStatus(req.status);

        const isDesativado = req.status === "nao_autorizado" || req.status === "cancelado";
        const estiloBotao = isDesativado
            ? "background-color: #cccccc; color: #666666; cursor: not-allowed; border: none;"
            : "";

        tr.innerHTML = `
            <td>${req.nome_laboratorio}</td>
            <td>${req.nome_disciplina} ${iconeRecorrente}</td>
            <td>${textoData}</td>
            <td>${horaInicio} - ${horaFim}</td>
            <td>${req.precisa_tecnico ? "Sim" : "Não"}</td>
            <td><span class="badge-status status-${req.status}">${textoStatus}</span></td>
            <td>${linkMaterialHtml}</td>
            <td>
                <button class="btn-cancelar" onclick='cancelarLote(${JSON.stringify(listaIdsParaCancelar)})' 
                        ${isDesativado ? "disabled" : ""} 
                        style="${estiloBotao}">
                    Cancelar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarAulasNosMeusLaboratorios(aulas) {
    const container = document.getElementById("corpo-tabela-aulas-tecnico");
    if (!container) return;
    
    container.innerHTML = "";
    
    if (!aulas || aulas.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Nenhuma aula futura autorizada nos seus laboratórios.</p>';
        return;
    }
    
    aulas.forEach((aula) => {
        const card = document.createElement("div");
        card.className = "aula-card"; 

        const dataFormatada = new Date(aula.data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
        const linkRoteiroHtml = aula.link_roteiro ? `<a href="${aula.link_roteiro}" target="_blank" class="link-roteiro">Acessar Link</a>` : 'Não exigido';

        card.innerHTML = `
            <div class="aula-card-header">
                <h3>${aula.nome_disciplina || 'Disciplina não informada'}</h3>
                <span class="etiqueta-status status-autorizado">Autorizado</span>
            </div>
            <div class="aula-card-body">
                <div class="aula-card-info-linha">
                    <p><strong><i class="fas fa-user-graduate"></i> Professor:</strong> ${aula.nome_professor}</p>
                    <p><strong><i class="fas fa-flask"></i> Laboratório:</strong> ${aula.nome_laboratorio}</p>
                    <p><strong><i class="far fa-calendar-alt"></i> Data:</strong> ${dataFormatada}</p>
                    <p><strong><i class="far fa-clock"></i> Horário:</strong> ${aula.hora_inicio.slice(0, 5)} - ${aula.hora_fim.slice(0, 5)}</p>
                    <p><strong><i class="fas fa-users"></i> Alunos:</strong> ${aula.numero_discentes || '-'}</p>
                    <p><strong><i class="fas fa-user-cog"></i> Técnico:</strong> ${aula.precisa_tecnico ? "Sim" : "Não"}</p>
                </div>
                <p style="margin-top: 10px; font-size: 0.9em; color: #666;"><strong>Observações:</strong> ${aula.observacoes ? aula.observacoes : "Nenhuma observação."}</p>
            </div>
            <div class="aula-card-footer" style="display: flex; justify-content: flex-start; margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;">
                <div class="aula-card-roteiro">
                    <strong>Roteiro:</strong> ${linkRoteiroHtml}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function cancelarAgendamento(idAula) {
  if (!confirm("Confirmar o cancelamento deste agendamento?")) return;

  try {
    const response = await fetch(`/api/agendamentos/${idAula}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "cancelado" }),
    });

    if (!response.ok) throw new Error("Falha na atualização");

    alert("Agendamento cancelado!");
    loadMyRequests();
  } catch (error) {
    console.error(error);
    alert("Erro ao processar a requisição.");
  }
}

async function mostrarMesAnteriorProfessor() {
  mesExibido--;
  if (mesExibido < 0) {
    mesExibido = 11;
    anoExibido--;
  }
  const novasAulas = await fetchAulasDoCalendarioProfessor(
    anoExibido,
    mesExibido + 1,
  );
  renderizarCalendarioProfessor(novasAulas, anoExibido, mesExibido);
}
async function mostrarProximoMesProfessor() {
  mesExibido++;
  if (mesExibido > 11) {
    mesExibido = 0;
    anoExibido++;
  }
  const novasAulas = await fetchAulasDoCalendarioProfessor(
    anoExibido,
    mesExibido + 1,
  );
  renderizarCalendarioProfessor(novasAulas, anoExibido, mesExibido);
}

async function mostrarSemanaAnteriorTecnico() {
  dataReferenciaSemanaTecnico.setDate(
    dataReferenciaSemanaTecnico.getDate() - 7,
  );
  const mes = dataReferenciaSemanaTecnico.getMonth() + 1;
  const ano = dataReferenciaSemanaTecnico.getFullYear();

  const novasAulas = await fetchAulasDoCalendarioTecnico(ano, mes);
  renderizarCalendarioTecnico(novasAulas, ano, mes - 1);
}

async function mostrarProximaSemanaTecnico() {
  dataReferenciaSemanaTecnico.setDate(
    dataReferenciaSemanaTecnico.getDate() + 7,
  );
  const mes = dataReferenciaSemanaTecnico.getMonth() + 1;
  const ano = dataReferenciaSemanaTecnico.getFullYear();

  const novasAulas = await fetchAulasDoCalendarioTecnico(ano, mes);
  renderizarCalendarioTecnico(novasAulas, ano, mes - 1);
}

async function fetchAulasDoCalendarioProfessor(ano, mes) {
  try {
    const response = await fetch(
      `/api/calendario/aulas-autorizadas?ano=${ano}&mes=${mes}`,
    );
    if (!response.ok)
      throw new Error("Falha ao buscar dados do calendário do professor");
    return await response.json();
  } catch (error) {
    console.error(
      "Erro ao buscar aulas para o calendário do professor:",
      error,
    );
    return [];
  }
}

async function fetchAulasDoCalendarioTecnico() {
  try {
    const inicioSemana = new Date(dataReferenciaSemanaTecnico);
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());

    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(fimSemana.getDate() + 6);

    const mesInicio = inicioSemana.getMonth() + 1;
    const anoInicio = inicioSemana.getFullYear();
    
    const mesFim = fimSemana.getMonth() + 1;
    const anoFim = fimSemana.getFullYear();

    const response1 = await fetch(`/api/calendario/aulas-tecnico?ano=${anoInicio}&mes=${mesInicio}`);
    if (!response1.ok) throw new Error("Falha ao buscar dados do calendário do técnico");
    let aulas = await response1.json();

    if (mesInicio !== mesFim) {
        const response2 = await fetch(`/api/calendario/aulas-tecnico?ano=${anoFim}&mes=${mesFim}`);
        if (response2.ok) {
            const aulasMes2 = await response2.json();
            aulas = [...aulas, ...aulasMes2]; 
        }
    }

    return aulas;
  } catch (error) {
    console.error("Erro ao buscar aulas para o calendário do técnico:", error);
    return [];
  }
}

async function loadMyRequests() {
  try {
    const res = await fetch(`/api/minhas-solicitacoes`);
    if (!res.ok) throw new Error("Erro ao buscar solicitações");
    const data = await res.json();
    renderTable(data);
  } catch (error) {
    console.error("Falha ao carregar solicitações:", error);
    const tbody = document.getElementById("minhas-aulas-tbody");
    if (tbody)
      tbody.innerHTML = `<tr><td colspan="7">Erro ao carregar dados.</td></tr>`;
  }
}

function renderizarBaseCalendario(
  grid,
  titulo,
  aulas,
  ano,
  mes,
  formatarTooltip,
) {
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

  for (let i = 0; i < primeiroDiaDoMes; i++) {
    grid.innerHTML += `<div class="dia-calendario dia-vazio"></div>`;
  }

  for (let dia = 1; dia <= diasNoMes; dia++) {
    let classesCss = "dia-calendario";
    let eventosDoDia = "";
    if (
      dia === hoje.getDate() &&
      mes === hoje.getMonth() &&
      ano === hoje.getFullYear()
    ) {
      classesCss += " hoje";
    }
    if (aulasPorDia[dia]) {
      console.log(`Dia ${dia}:`, aulasPorDia[dia]);

      const temRecorrente = aulasPorDia[dia].some(
        (aula) =>
          aula.tipo_aula &&
          aula.tipo_aula.trim().toLowerCase() === "recorrente",
      );
      const temRegular = aulasPorDia[dia].some(
        (aula) =>
          !aula.tipo_aula ||
          aula.tipo_aula.trim().toLowerCase() !== "recorrente",
      );

      if (temRecorrente && temRegular) {
        classesCss += " tem-aula-mista";
      } else if (temRecorrente) {
        classesCss += " tem-aula-recorrente";
      } else if (temRegular) {
        classesCss += " tem-aula";
      }

      eventosDoDia = `<div class="tooltip">${aulasPorDia[dia]
        .map(formatarTooltip)
        .join("")}</div>`;
    }
    grid.innerHTML += `<div class="${classesCss}"><span>${dia}</span>${eventosDoDia}</div>`;
  }
}
function renderizarCalendarioProfessor(aulas, ano, mes) {
  const grid = document.getElementById("calendario-grid");
  const titulo = document.getElementById("calendario-titulo");
  if (!grid || !titulo) return;
  renderizarBaseCalendario(
    grid,
    titulo,
    aulas,
    ano,
    mes,
    (aula) =>
      `<p><strong>${aula.hora_inicio.slice(0, 5)} - ${aula.hora_fim.slice(
        0,
        5,
      )}:</strong> ${aula.nome_disciplina}<br><em>(${aula.nome_laboratorio
      })</em></p>`,
  );
}

function renderizarCalendarioTecnico(aulas, ano, mes) {
  const grid = document.getElementById("calendario-grid-tecnico");
  const titulo = document.getElementById("calendario-titulo-tecnico");
  if (!grid || !titulo) return;
  renderizarBaseCalendario(
    grid,
    titulo,
    aulas,
    ano,
    mes,
    (aula) =>
      `<p><strong>${aula.hora_inicio.slice(0, 5)} - ${aula.hora_fim.slice(
        0,
        5,
      )}:</strong> ${aula.nome_disciplina}<br><em>(Prof: ${aula.nome_professor
      })</em></p>`,
  );
}

function renderizarMeusLaboratorios(laboratorios) {
  const lista = document.getElementById("lista-meus-laboratorios");
  if (!lista) return;
  lista.innerHTML =
    laboratorios.length === 0
      ? "<li>Você não é responsável por nenhum laboratório.</li>"
      : laboratorios.map((l) => `<li>${l.nome_laboratorio}</li>`).join("");
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
    case "autorizado":
      return "Autorizado";
    case "nao_autorizado":
      return "Não Autorizado";
    case "analisando":
      return "Em Análise";
    case "cancelado":
      return "Cancelado";
    default:
      return status;
  }
}
function renderizarCalendarioTecnico(aulas, ano, mes) {
  const grid = document.getElementById("calendario-grid-tecnico");
  const titulo = document.getElementById("calendario-titulo-tecnico");
  if (!grid || !titulo) return;

  const inicioSemana = new Date(dataReferenciaSemanaTecnico);
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());

  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(fimSemana.getDate() + 6);

  const formatador = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  });
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

    if (
      diaNumero === hoje.getDate() &&
      mesAtual === hoje.getMonth() &&
      anoAtual === hoje.getFullYear()
    ) {
      classesCss += " hoje";
    }

    const aulasDoDia = aulas.filter((aula) => {
      const d = new Date(aula.data);
      return (
        d.getUTCDate() === diaNumero &&
        d.getUTCMonth() === mesAtual &&
        d.getUTCFullYear() === anoAtual
      );
    });

    let eventosDoDia = "";
    if (aulasDoDia.length > 0) {
      const temRecorrente = aulasDoDia.some(
        (a) => a.tipo_aula === "recorrente",
      );
      const temRegular = aulasDoDia.some((a) => a.tipo_aula !== "recorrente");

      if (temRecorrente && temRegular) classesCss += " tem-aula-mista";
      else if (temRecorrente) classesCss += " tem-aula-recorrente";
      else classesCss += " tem-aula";

      eventosDoDia = `<div class="tooltip">${aulasDoDia
        .map(
          (aula) =>
            `<p><strong>${aula.hora_inicio.slice(0, 5)} - ${aula.hora_fim.slice(0, 5)}:</strong> ${aula.nome_disciplina}<br><em>Lab: ${aula.nome_laboratorio}<br>(Prof: ${aula.nome_professor})</em></p>`
        )
        .join("")}</div>`;
    }

    grid.innerHTML += `<div class="${classesCss}"><span>${diaNumero}</span>${eventosDoDia}</div>`;
  }
}
async function carregarAulasDeHoje() {
  const container = document.getElementById("lista-horarios-hoje");
  if (!container) return;

  try {
    const res = await fetch('/api/aulas-hoje');
    if (!res.ok) throw new Error();
    const aulas = await res.json();

    container.innerHTML = "";

    if (aulas.length === 0) {
      container.innerHTML = "<p style='text-align:center; color:#666; padding: 20px;'>Nenhuma aula agendada para hoje.</p>";
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
            <p><i class="fas fa-flask"></i> ${aula.nome_laboratorio}</p>
        </div>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    container.innerHTML = "<p style='color:red; text-align:center;'>Erro ao carregar horários.</p>";
  }
}