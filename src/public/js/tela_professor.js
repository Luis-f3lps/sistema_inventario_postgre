let loggedInUser = null;
let allRequests = [];
let filtroAtual = "analisando"; // Valor padrão inicial

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

async function inicializarPagina() {
  try {
    const response = await fetch("/api/usuario-logado");
    if (!response.ok) {
      window.location.href = "/login.html";
      return;
    }
    loggedInUser = await response.json();

    const userNameElement = document.getElementById("user-name-text");
    if (userNameElement) {
      userNameElement.innerHTML =
        loggedInUser.nome_usuario || loggedInUser.nome;
    }

    // Listener para os botões de filtro
    const radiosFiltro = document.querySelectorAll(
      'input[name="filtroStatus"]',
    );
    radiosFiltro.forEach((radio) => {
      radio.addEventListener("change", (event) => {
        filtroAtual = event.target.value;
        aplicarFiltroEDesenhar();
      });
    });

    await loadMyRequests();
  } catch (error) {
    console.error("Erro ao inicializar a página:", error);
    window.location.href = "/login.html";
  }
}

async function loadMyRequests() {
  if (!loggedInUser) return;

  try {
    const res = await fetch(`/api/minhas-solicitacoes`);
    if (!res.ok) throw new Error("Erro na rede ao buscar solicitações");

    // Guarda todos os dados vindos do banco na variável global
    allRequests = await res.json();

    // Aplica o filtro padrão e renderiza
    aplicarFiltroEDesenhar();
  } catch (error) {
    console.error("Falha ao carregar solicitações:", error);
    const tbody = document.getElementById("minhas-aulas-individuais-tbody");
    const recContainer = document.getElementById("container-recorrentes");
    if (tbody)
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">Erro ao carregar dados. Tente novamente mais tarde.</td></tr>`;
    if (recContainer)
      recContainer.innerHTML = `<p style="text-align:center; color:red;">Erro ao carregar dados.</p>`;
  }
}

function aplicarFiltroEDesenhar() {
  let dadosParaTela = allRequests;

  // Se o filtro estiver em "analisando", mostra apenas os pendentes
  if (filtroAtual === "analisando") {
    dadosParaTela = allRequests.filter((req) => req.status === "analisando");
  }

  renderTable(dadosParaTela);
}

function renderTable(requests) {
  // Apontamos para o novo container das individuais
  const containerInd = document.getElementById(
    "minhas-aulas-individuais-container",
  );
  const containerRec = document.getElementById("container-recorrentes");

  if (!containerInd || !containerRec) return;

  containerInd.innerHTML = "";
  containerRec.innerHTML = "";

  if (requests.length === 0) {
    const msgFiltro =
      filtroAtual === "analisando"
        ? "Você não tem nenhuma solicitação pendente no momento."
        : "Nenhuma solicitação encontrada no seu histórico.";
    containerInd.innerHTML = `<p style="text-align:center; padding: 20px; color: #666;">${msgFiltro}</p>`;
    containerRec.innerHTML = `<p style="text-align:center; padding: 20px; color: #666;">${msgFiltro}</p>`;
    return;
  }

  const individuais = requests.filter((r) => r.tipo_aula !== "recorrente");
  const recorrentes = requests.filter(
    (r) => r.tipo_aula === "recorrente" && r.id_pedido,
  );

  const nomeProfessor =
    loggedInUser.nome_usuario || loggedInUser.nome || "Professor";

  if (individuais.length === 0) {
    containerInd.innerHTML = `<p style="text-align:center; padding: 20px; color: #666;">Nenhuma solicitação individual.</p>`;
  } else {
    individuais.forEach((r) => {
      const card = document.createElement("div");
      card.className = "aula-card";

      const dataFormatada = new Date(r.data).toLocaleDateString("pt-BR", {
        timeZone: "UTC",
      });
      const horaInicio = r.hora_inicio ? r.hora_inicio.slice(0, 5) : "N/A";
      const horaFim = r.hora_fim ? r.hora_fim.slice(0, 5) : "N/A";

      const linkRoteiroHtml = r.link_roteiro
        ? `<a href="${r.link_roteiro}" target="_blank">Acessar Link</a>`
        : "Não exigido";
      const observacoesTexto = r.observacoes
        ? r.observacoes
        : "Nenhuma observação.";
      const discentes = r.numero_discentes || "-";
      const disciplina = r.nome_disciplina || "Disciplina não informada";

      card.innerHTML = `
                <div class="aula-card-header">
                    <h3>${disciplina}</h3>
                    <span class="etiqueta-status status-${r.status}">${formatarTextoStatus(r.status)}</span>
                </div>
                <div class="aula-card-body">
                    <div class="aula-card-info-linha">
                        <p><strong><i class="far fa-calendar-alt"></i> Data:</strong> ${dataFormatada}</p>
                        <p><strong><i class="far fa-clock"></i> Horário:</strong> ${horaInicio} - ${horaFim}</p>
                        <p><strong><i class="fas fa-users"></i> Discentes:</strong> ${discentes}</p>
                        <p><strong><i class="fas fa-user-cog"></i> Técnico:</strong> ${r.precisa_tecnico ? "Sim" : "Não"}</p>
                        <p><strong><i class="fas fa-flask"></i> Laboratório:</strong> ${r.nome_laboratorio}</p>

                    </div>
                    <p style="margin-top: 10px; font-size: 0.9em; color: #666;"><strong>Observações:</strong> ${observacoesTexto}</p>
                </div>
                <div class="aula-card-footer">
                    <div class="aula-card-roteiro">
                        <strong>Roteiro:</strong> ${linkRoteiroHtml}
                    </div>
                </div>
            `;
      containerInd.appendChild(card);
    });
  }

  // --- CARTÕES RECORRENTES (MANTIDO) ---
  if (recorrentes.length === 0) {
    containerRec.innerHTML = `<p style="text-align:center; padding: 20px; color: #666;">Nenhuma solicitação recorrente.</p>`;
  } else {
    const agrupados = {};
    recorrentes.forEach((r) => {
      if (!agrupados[r.id_pedido]) agrupados[r.id_pedido] = [];
      agrupados[r.id_pedido].push(r);
    });

    for (const [id_pedido, aulas] of Object.entries(agrupados)) {
      const info = aulas[0];

      const horariosUnicos = [
        ...new Set(
          aulas.map(
            (a) => `${a.hora_inicio.slice(0, 5)} - ${a.hora_fim.slice(0, 5)}`,
          ),
        ),
      ].join(" | ");

      const datasFormatadas = aulas
        .map(
          (a) =>
            `<span class="tag-data">
                          ${new Date(a.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })} 
                          (${a.hora_inicio.slice(0, 5)})
                      </span>`,
        )
        .join("");

      const div = document.createElement("div");
      div.className = "cartao-recorrente";
      div.innerHTML = `
                      <div class="header-recorrente">
                          <h3>${info.nome_disciplina || "-"}</h3>
                          <span class="etiqueta-status status-${info.status}">${formatarTextoStatus(info.status)}</span>
                      </div>
                      <div class="grid-info-recorrente">
                          <p><strong>Professor:</strong> ${nomeProfessor}</p>
                          <p><strong>Laboratório:</strong> ${info.nome_laboratorio}</p>
                          <p><strong>Horários:</strong> ${horariosUnicos}</p>
                          <p><strong>Discentes:</strong> ${info.numero_discentes || "-"}</p>
                          <p><strong>Apoio Técnico:</strong> ${info.precisa_tecnico ? "Sim" : "Não"}</p>
                          <p><strong>Quantidade de Aulas:</strong> ${aulas.length} aula(s)</p>
                          ${info.link_roteiro ? `<p><strong>Roteiro:</strong> <a href="${info.link_roteiro}" target="_blank">Acessar Link</a></p>` : ""}
                      </div>
                      <div style="margin-top: 15px;">
                          <strong>Datas e Horários Agendados:</strong>
                          <div class="tags-datas">
                              ${datasFormatadas}
                          </div>
                      </div>
                  `;
      containerRec.appendChild(div);
    }
  }
}

function closemenu() {
  const nav = document.querySelector("nav");
  const menu = document.querySelector(".menu");
  const conteudo = document.querySelector(".conteudo");
  const painel = document.querySelector(".painel-minhas-aulas");

  if (window.innerWidth <= 768 && nav) {
    nav.style.left = "-100%";
  }

  if (menu) menu.style.width = "1%";
  if (conteudo) conteudo.style.width = "95%";
  if (painel) painel.style.width = "95%";
}

document.addEventListener("DOMContentLoaded", inicializarPagina);
