let mesExibido;
let anoExibido;
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
        .querySelectorAll(".cartao-painel, .painel-minhas-aulas")
        .forEach((el) => (el.style.display = "none"));

    switch (userType) {
        case "tecnico":
            showElement(".cartao-aulas-tecnico");
            showElement(".cartao-meus-laboratorios");
            document
                .getElementById("btn-mes-anterior-tecnico")
                ?.addEventListener("click", mostrarMesAnteriorTecnico);
            document
                .getElementById("btn-proximo-mes-tecnico")
                ?.addEventListener("click", mostrarProximoMesTecnico);
            break;
        case "professor":
            showElement(".cartao-aulas-autorizadas");
            showElement(".painel-minhas-aulas");
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

async function mostrarMesAnteriorProfessor() {
    mesExibido--;
    if (mesExibido < 0) {
        mesExibido = 11;
        anoExibido--;
    }
    const novasAulas = await fetchAulasDoCalendarioProfessor(
        anoExibido,
        mesExibido + 1
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
        mesExibido + 1
    );
    renderizarCalendarioProfessor(novasAulas, anoExibido, mesExibido);
}

async function mostrarMesAnteriorTecnico() {
    mesExibido--;
    if (mesExibido < 0) {
        mesExibido = 11;
        anoExibido--;
    }
    const novasAulas = await fetchAulasDoCalendarioTecnico(
        anoExibido,
        mesExibido + 1
    );
    renderizarCalendarioTecnico(novasAulas, anoExibido, mesExibido);
}
async function mostrarProximoMesTecnico() {
    mesExibido++;
    if (mesExibido > 11) {
        mesExibido = 0;
        anoExibido++;
    }
    const novasAulas = await fetchAulasDoCalendarioTecnico(
        anoExibido,
        mesExibido + 1
    );
    renderizarCalendarioTecnico(novasAulas, anoExibido, mesExibido);
}

async function fetchAulasDoCalendarioProfessor(ano, mes) {
    try {
        const response = await fetch(
            `/api/calendario/aulas-autorizadas?ano=${ano}&mes=${mes}`
        );
        if (!response.ok)
            throw new Error("Falha ao buscar dados do calendário do professor");
        return await response.json();
    } catch (error) {
        console.error(
            "Erro ao buscar aulas para o calendário do professor:",
            error
        );
        return [];
    }
}

async function fetchAulasDoCalendarioTecnico(ano, mes) {
    try {
        const response = await fetch(
            `/api/calendario/aulas-tecnico?ano=${ano}&mes=${mes}`
        );
        if (!response.ok)
            throw new Error("Falha ao buscar dados do calendário do técnico");
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar aulas para o calendário do técnico:", error);
        return [];
    }
}

async function carregarDadosDosPaineis(userType) {
    try {
        if (userType === "professor") {
            const aulasDoMesAtual = await fetchAulasDoCalendarioProfessor(
                anoExibido,
                mesExibido + 1
            );
            renderizarCalendarioProfessor(aulasDoMesAtual, anoExibido, mesExibido);
        } else if (userType === "tecnico") {
            const [meusLaboratorios, aulasDoMesAtualTecnico] = await Promise.all([
                fetch("/api/dashboard/meus-laboratorios").then((res) => res.json()),
                fetchAulasDoCalendarioTecnico(anoExibido, mesExibido + 1),
            ]);
            renderizarMeusLaboratorios(meusLaboratorios);
            renderizarCalendarioTecnico(
                aulasDoMesAtualTecnico,
                anoExibido,
                mesExibido
            );
        }
    } catch (error) {
        console.error("Erro ao carregar dados dos painéis:", error);
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

function renderTable(requests) {
    const tbody = document.getElementById("minhas-aulas-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (requests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center;">Você não tem nenhuma solicitação futura.</td></tr>`;
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

        tr.innerHTML = `
            <td>${r.nome_laboratorio}</td>
            <td>${r.nome_disciplina}</td>
            <td>${dataFormatada}</td>
            <td>${horaInicio} - ${horaFim}</td>
            <td>${r.precisa_tecnico ? "Sim" : "Não"}</td>
            <td><span class="etiqueta-status status-${r.status}">${r.status
            }</span></td>
            <td>${linkRoteiroHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarBaseCalendario(
    grid,
    titulo,
    aulas,
    ano,
    mes,
    formatarTooltip
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
            classesCss += " tem-aula";
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
                5
            )}:</strong> ${aula.nome_disciplina}<br><em>(${aula.nome_laboratorio
            })</em></p>`
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
                5
            )}:</strong> ${aula.nome_disciplina}<br><em>(Prof: ${aula.nome_professor
            })</em></p>`
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

function renderizarAulasNosMeusLaboratorios(aulas) {
    const tbody = document.getElementById("corpo-tabela-aulas-tecnico");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!aulas || aulas.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="8">Nenhuma aula futura autorizada nos seus laboratórios.</td></tr>';
        return;
    }
    aulas.forEach((aula) => {
        const tr = document.createElement("tr");
        const linkRoteiroHtml = formatarLinkRoteiro(
            aula.link_roteiro,
            "Ver Roteiro"
        );
        tr.innerHTML = `
            <td>${aula.nome_laboratorio}</td>
            <td>${aula.nome_disciplina}</td>
            <td>${aula.nome_professor}</td>
            <td>${new Date(aula.data).toLocaleDateString("pt-BR", {
            timeZone: "UTC",
        })}</td>
            <td>${aula.hora_inicio.slice(0, 5)} - ${aula.hora_fim.slice(
            0,
            5
        )}</td>
            <td>${aula.numero_discentes}</td>
            <td>${aula.precisa_tecnico ? "Sim" : "Não"}</td>
            <td>${linkRoteiroHtml}</td>
        `;
        tbody.appendChild(tr);
    });
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
  if (nav) {
    nav.style.left = "0px";
  }
}

function closemenu() {
  const nav = document.querySelector("nav");
  if (nav) {
    nav.style.left = "-100%";
  }
}