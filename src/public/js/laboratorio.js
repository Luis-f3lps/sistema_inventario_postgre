// ==========================================
// 1. CARREGAMENTO INICIAL
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Carrega a tabela principal (página 1)
    loadLaboratorios(1);

    // Carrega as opções dos campos <select>
    loadUsuariosParaSelect();
    loadLaboratorios2();
    loadLaboratorios3();
    loadUsuarios2();

    // Carrega as informações do usuário (com trava de espera pro menu)
    loadLoggedInUser();
});

// ==========================================
// 2. NAVEGAÇÃO E AUTENTICAÇÃO
// ==========================================
function opentab(tabname) {
    const tablinks = document.getElementsByClassName("tab-links");
    const tabcontents = document.getElementsByClassName("tab-contents");

    Array.from(tablinks).forEach(link => link.classList.remove("active-link"));
    Array.from(tabcontents).forEach(content => content.classList.remove("active-tab"));

    const targetTab = document.getElementById(tabname);
    if (targetTab) targetTab.classList.add("active-tab");

    const clickedLink = document.querySelector(`.tab-links[onclick*="${tabname}"]`);
    if (clickedLink) clickedLink.classList.add("active-link");
}

async function loadLoggedInUser() {
    try {
        const response = await fetch("/api/usuario-logado");
        if (!response.ok) {
            window.location.href = "/login.html";
            return;
        }
        const data = await response.json();

        // Função recursiva para esperar o menu carregar
        const preencherNome = () => {
            const userNameElement = document.getElementById("user-name-text");
            if (userNameElement) {
                userNameElement.innerHTML = data.nome || "Usuário";
            } else {
                setTimeout(preencherNome, 100);
            }
        };
        preencherNome();

        // Libera os botões do menu baseado no cargo
        const atualizarMenu = () => {
            const adminMenu = document.querySelector(".admin-menu");
            if (adminMenu || document.querySelector(".tecnico")) {
                const userType = data.tipo_usuario ? data.tipo_usuario.trim().toLowerCase() : "";

                if (userType === "admin" || userType === "administrador") {
                    document.querySelectorAll(".admin-menu, .produto").forEach(el => el.style.display = "block");
                } else if (userType === "tecnico") {
                    document.querySelectorAll(".tecnico, .Home, .produto").forEach(el => el.style.display = "block");
                } else if (userType === "professor") {
                    document.querySelectorAll(".professor, .Home, .Horarios").forEach(el => el.style.display = "block");
                }
            } else {
                setTimeout(atualizarMenu, 100);
            }
        };
        atualizarMenu();

    } catch (error) {
        console.error("Erro ao carregar usuário logado:", error);
    }
}

// ==========================================
// 3. BUSCA E RENDERIZAÇÃO DE DADOS (TABELA E SELECTS)
// ==========================================
function loadLaboratorios(page = 1, limit = 10) {
    fetch(`/api/laboratoriosPag?page=${page}&limit=${limit}`)
        .then((response) => response.json())
        .then((data) => {
            const tbody = document.getElementById("laboratorio-tbody");
            if(!tbody) return;
            tbody.innerHTML = "";

            data.data.forEach((laboratorio) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${laboratorio.nome_laboratorio}</td>
                    <td>${laboratorio.nome_usuario || 'N/A'}</td>
                    <td>${laboratorio.usuario_email || 'N/A'}</td>
                `;
                tbody.appendChild(tr);
            });

            updatePagination(data.totalPages, page);
        })
        .catch((error) => console.error("Erro ao carregar laboratórios:", error));
}

function updatePagination(totalPages, currentPage) {
    const paginationDiv = document.getElementById("pagination");
    if(!paginationDiv) return;
    paginationDiv.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement("button");
        button.textContent = i;
        button.classList.add("pagination-button");
        if (i === currentPage) {
            button.classList.add("active");
        }
        button.addEventListener("click", () => {
            loadLaboratorios(i);
        });
        paginationDiv.appendChild(button);
    }
}

function loadUsuariosParaSelect() {
    fetch("/api/usuarios")
        .then((response) => response.json())
        .then((data) => {
            const select = document.getElementById("usuarios-select");
            if(!select) return;
            select.innerHTML = '<option value="">Selecione um usuário</option>';
            data.forEach((usuario) => {
                const option = document.createElement("option");
                option.value = usuario.email;
                option.textContent = usuario.email;
                select.appendChild(option);
            });
        })
        .catch((error) => console.error("Erro ao carregar usuários:", error));
}

function loadLaboratorios2() {
    fetch("/api/laboratorios")
        .then((response) => response.json())
        .then((data) => {
            const select = document.getElementById("laboratorios-select2");
            if(!select) return;
            select.innerHTML = '<option value="">Selecione um laboratório</option>';
            data.forEach((laboratorio) => {
                const option = document.createElement("option");
                option.value = laboratorio.id_laboratorio;
                option.textContent = laboratorio.nome_laboratorio;
                select.appendChild(option);
            });
        })
        .catch((error) => console.error("Erro ao carregar laboratórios:", error));
}

function loadLaboratorios3() {
    fetch("/api/laboratorios")
        .then((response) => response.json())
        .then((data) => {
            const select = document.getElementById("remove-laboratorio");
            if(!select) return;
            select.innerHTML = '<option value="">Selecione um laboratório</option>';
            data.forEach((laboratorio) => {
                const option = document.createElement("option");
                option.value = laboratorio.id_laboratorio;
                option.textContent = laboratorio.nome_laboratorio;
                select.appendChild(option);
            });
        })
        .catch((error) => console.error("Erro ao carregar laboratórios:", error));
}

function loadUsuarios2() {
    fetch("/api/usuarios")
        .then((response) => response.json())
        .then((data) => {
            const select = document.getElementById("usuarios-select2");
            if(!select) return;
            select.innerHTML = '<option value="">Selecione um usuário</option>';
            data.forEach((usuario) => {
                const option = document.createElement("option");
                option.value = usuario.email;
                option.textContent = usuario.email;
                select.appendChild(option);
            });
        })
        .catch((error) => console.error("Erro ao carregar usuários:", error));
}

// ==========================================
// 4. FORMULÁRIOS E AÇÕES (CRUD)
// ==========================================
document.getElementById("add-laboratorio-form")?.addEventListener("submit", function (event) {
    event.preventDefault();

    const nomeLaboratorio = document.getElementById("nome_laboratorio").value;
    const usuarioEmail = document.getElementById("usuarios-select").value;

    if(!nomeLaboratorio || !usuarioEmail) {
        alert("Preencha todos os campos.");
        return;
    }

    fetch("/api/laboratorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            nome_laboratorio: nomeLaboratorio,
            usuario_email: usuarioEmail,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message);
                document.getElementById("add-laboratorio-form").reset();
                // Recarrega todos os dados sem precisar dar F5 na página
                loadLaboratorios(1);
                loadLaboratorios2();
                loadLaboratorios3();
            }
        })
        .catch((error) => console.error("Erro ao add laboratório:", error));
});

document.getElementById("remove-laboratorio-form")?.addEventListener("submit", function (event) {
    event.preventDefault();

    const idLaboratorio = document.getElementById("remove-laboratorio").value;

    if (!idLaboratorio) {
        alert("Por favor, selecione um laboratório.");
        return;
    }

    if(confirm("Tem certeza que deseja excluir este laboratório?")) {
        fetch(`/api/laboratorios/${idLaboratorio}`, {
            method: "DELETE",
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    alert(data.error);
                } else {
                    alert(data.message);
                    loadLaboratorios(1);
                    loadLaboratorios2();
                    loadLaboratorios3();
                }
            })
            .catch((error) => console.error("Erro ao remover laboratório:", error));
    }
});

document.getElementById("update-responsavel-form")?.addEventListener("submit", function (event) {
    event.preventDefault();

    const idLaboratorio = document.getElementById("laboratorios-select2").value;
    const emailResponsavel = document.getElementById("usuarios-select2").value;

    if (!idLaboratorio || !emailResponsavel) {
        alert("Por favor, selecione um laboratório e um novo responsável.");
        return;
    }

    fetch("/api/atualizar-responsavel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idLaboratorio, usuarioEmail: emailResponsavel }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message);
                loadLaboratorios(1);
            }
        })
        .catch((error) => console.error("Erro ao atualizar responsável:", error));
});