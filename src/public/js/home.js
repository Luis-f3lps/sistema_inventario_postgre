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

function renderTable(requests) {
  const tbody = document.getElementById("minhas-aulas-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center;">Você não tem nenhuma solicitação futura.</td></tr>`;
    return;
  }
  requests.forEach((r) => {
    const tr = document.createElement("tr");
    const dataFormatada = new Date(r.data).toLocaleDateString("pt-BR", {
      timeZone: "UTC",
    });
    const horaInicio = r.hora_inicio ? r.hora_inicio.slice(0, 5) : "N/A";
    const horaFim = r.hora_fim ? r.hora_fim.slice(0, 5) : "N/A";
    const linkRoteiroHtml = formatarLinkRoteiro(r.link_roteiro, "Ver");
    const textoStatus = formatarTextoStatus(r.status);

    const isDesativado =
      r.status === "nao_autorizado" || r.status === "cancelado";
    const estiloBotao = isDesativado
      ? "background-color: #cccccc; color: #666666; cursor: not-allowed; border: none;"
      : "";

    tr.innerHTML = `
            <td>${r.nome_laboratorio}</td>
            <td>${r.nome_disciplina}</td>
            <td>${dataFormatada}</td>
            <td>${horaInicio} - ${horaFim}</td>
            <td>${r.precisa_tecnico ? "Sim" : "Não"}</td>
            <td><span class="etiqueta-status status-${r.status}">${textoStatus}</span></td>
            <td>${linkRoteiroHtml}</td>
            <td>
                <button class="btn-cancelar" onclick="cancelarAgendamento(${r.id_aula})" 
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
  const tbody = document.getElementById("corpo-tabela-aulas-tecnico");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!aulas || aulas.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="9">Nenhuma aula futura autorizada nos seus laboratórios.</td></tr>';
    return;
  }
  aulas.forEach((aula) => {
    const tr = document.createElement("tr");
    const linkRoteiroHtml = formatarLinkRoteiro(
      aula.link_roteiro,
      "Ver Roteiro",
    );
    tr.innerHTML = `
            <td>${aula.nome_laboratorio}</td>
            <td>${aula.nome_disciplina}</td>
            <td>${aula.nome_professor}</td>
            <td>${new Date(aula.data).toLocaleDateString("pt-BR", {
      timeZone: "UTC",
    })}</td>
            <td>${aula.hora_inicio.slice(0, 5)} - ${aula.hora_fim.slice(0, 5)}</td>
            <td>${aula.numero_discentes}</td>
            <td>${aula.precisa_tecnico ? "Sim" : "Não"}</td>
            <td>${linkRoteiroHtml}</td>
            <td>${aula.observacoes ? aula.observacoes : "-"}</td>
        `;
    tbody.appendChild(tr);
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

async function fetchAulasDoCalendarioTecnico(ano, mes) {
  try {
    const response = await fetch(
      `/api/calendario/aulas-tecnico?ano=${ano}&mes=${mes}`,
    );
    if (!response.ok)
      throw new Error("Falha ao buscar dados do calendário do técnico");
    return await response.json();
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

function openmenu() {
  const nav = document.querySelector("nav");
  const menu = document.querySelector(".menu");
  const conteudo = document.querySelector(".conteudo");
  const conteiner = document.querySelector(".container");

  if (nav) {
    nav.style.left = "0px";
  }
  if (menu) {
    menu.style.width = "20%";
  }
  if (conteudo) {
    conteudo.style.width = "80%";
  }
  if (conteiner) {
    conteiner.style.width = "80%";
  }
}

function closemenu() {
  const nav = document.querySelector("nav");
  const menu = document.querySelector(".menu");
  const conteudo = document.querySelector(".conteudo");
  const conteiner = document.querySelector(".container");

  if (window.innerWidth <= 768 && nav) {
    nav.style.left = "-100%";
  }

  if (menu) {
    menu.style.width = "5%";
  }
  if (conteudo) {
    conteudo.style.width = "95%";
  }
  if (conteiner) {
    conteiner.style.width = "95%";
  }
}
function renderizarTabelaAgendamentos(requisicoes) {
  const tbody = document.getElementById("corpo-tabela-agendamentos");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (requisicoes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center;">Nenhum agendamento futuro encontrado.</td></tr>`;
    return;
  }

  requisicoes.forEach((req) => {
    const tr = document.createElement("tr");
    const dataFormatada = new Date(req.data).toLocaleDateString("pt-BR", {
      timeZone: "UTC",
    });
    const horaInicio = req.hora_inicio ? req.hora_inicio.slice(0, 5) : "N/A";
    const horaFim = req.hora_fim ? req.hora_fim.slice(0, 5) : "N/A";
    const linkMaterialHtml = formatarLinkRoteiro(req.link_roteiro, "Acessar");
    const textoStatus = formatarTextoStatus(req.status);

    const isDesativado =
      req.status === "nao_autorizado" || req.status === "cancelado";
    const estiloBotao = isDesativado
      ? "background-color: #cccccc; color: #666666; cursor: not-allowed; border: none;"
      : "";

    tr.innerHTML = `
            <td>${req.nome_laboratorio}</td>
            <td>${req.nome_disciplina}</td>
            <td>${dataFormatada}</td>
            <td>${horaInicio} - ${horaFim}</td>
            <td>${req.precisa_tecnico ? "Sim" : "Não"}</td>
            <td><span class="badge-status status-${req.status}">${textoStatus}</span></td>
            <td>${linkMaterialHtml}</td>
            <td>
                <button class="btn-cancelar" onclick="cancelarAgendamento(${req.id_aula})" 
                        ${isDesativado ? "disabled" : ""} 
                        style="${estiloBotao}">
                    Cancelar
                </button>
            </td>
        `;
    tbody.appendChild(tr);
  });
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
            `<p><strong>${aula.hora_inicio.slice(0, 5)} - ${aula.hora_fim.slice(0, 5)}:</strong> ${aula.nome_disciplina}<br><em>(Prof: ${aula.nome_professor})</em></p>`,
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