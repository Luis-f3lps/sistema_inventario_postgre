// ==========================================
// 1. CARREGAMENTO INICIAL
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Carrega a tabela principal (página 1)
    loadSalas(1);

    // Carrega as opções dos campos <select>
    loadUsuariosParaSelect();
    loadSalas2();
    loadSalas3();
    loadUsuarios2();

    // Carrega as informações do usuário
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

        const preencherNome = () => {
            const userNameElement = document.getElementById("user-name-text");
            if (userNameElement) {
                userNameElement.innerHTML = data.nome || "Usuário";
            } else {
                setTimeout(preencherNome, 100);
            }
        };
        preencherNome();

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
// 3. BUSCA E RENDERIZAÇÃO DE DADOS
// ==========================================
function loadSalas(page = 1, limit = 10) {
    fetch(`/api/salasPag?page=${page}&limit=${limit}`)
        .then((response) => response.json())
        .then((data) => {
            const tbody = document.getElementById("sala-tbody");
            if(!tbody) return;
            tbody.innerHTML = "";

            data.data.forEach((sala) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${sala.nome_sala}</td>
                    <td>${sala.nome_usuario || 'N/A'}</td>
                    <td>${sala.responsavel_email || 'N/A'}</td>
                `;
                tbody.appendChild(tr);
            });

            updatePagination(data.totalPages, page);
        })
        .catch((error) => console.error("Erro ao carregar salas:", error));
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
            loadSalas(i);
        });
        paginationDiv.appendChild(button);
    }
}

// Usuários 
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

// Salas nos Selects
function loadSalas2() {
    fetch("/api/salas")
        .then((response) => response.json())
        .then((data) => {
            const select = document.getElementById("salas-select2");
            if(!select) return;
            select.innerHTML = '<option value="">Selecione uma sala</option>';
            data.forEach((sala) => {
                const option = document.createElement("option");
                option.value = sala.id_sala;
                option.textContent = sala.nome_sala;
                select.appendChild(option);
            });
        })
        .catch((error) => console.error("Erro ao carregar salas:", error));
}

function loadSalas3() {
    fetch("/api/salas")
        .then((response) => response.json())
        .then((data) => {
            const select = document.getElementById("remove-sala");
            if(!select) return;
            select.innerHTML = '<option value="">Selecione uma sala</option>';
            data.forEach((sala) => {
                const option = document.createElement("option");
                option.value = sala.id_sala;
                option.textContent = sala.nome_sala;
                select.appendChild(option);
            });
        })
        .catch((error) => console.error("Erro ao carregar salas:", error));
}

// ==========================================
// 4. FORMULÁRIOS E AÇÕES (CRUD)
// ==========================================
document.getElementById("add-sala-form")?.addEventListener("submit", function (event) {
    event.preventDefault();

    const nomeSala = document.getElementById("nome_sala").value;
    const responsavelEmail = document.getElementById("usuarios-select").value;

    if(!nomeSala || !responsavelEmail) {
        alert("Preencha todos os campos.");
        return;
    }

    fetch("/api/salas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            nome_sala: nomeSala,
            responsavel_email: responsavelEmail,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message);
                document.getElementById("add-sala-form").reset();
                loadSalas(1);
                loadSalas2();
                loadSalas3();
            }
        })
        .catch((error) => console.error("Erro ao add sala:", error));
});

document.getElementById("remove-sala-form")?.addEventListener("submit", function (event) {
    event.preventDefault();

    const idSala = document.getElementById("remove-sala").value;

    if (!idSala) {
        alert("Por favor, selecione uma sala.");
        return;
    }

    if(confirm("Tem certeza que deseja excluir esta sala?")) {
        fetch(`/api/salas/${idSala}`, {
            method: "DELETE",
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    alert(data.error);
                } else {
                    alert(data.message);
                    loadSalas(1);
                    loadSalas2();
                    loadSalas3();
                }
            })
            .catch((error) => console.error("Erro ao remover sala:", error));
    }
});

document.getElementById("update-responsavel-form")?.addEventListener("submit", function (event) {
    event.preventDefault();

    const idSala = document.getElementById("salas-select2").value;
    const emailResponsavel = document.getElementById("usuarios-select2").value;

    if (!idSala || !emailResponsavel) {
        alert("Por favor, selecione uma sala e um novo responsável.");
        return;
    }

    fetch("/api/atualizar-responsavel-sala", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idSala, responsavelEmail: emailResponsavel }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message);
                loadSalas(1);
            }
        })
        .catch((error) => console.error("Erro ao atualizar responsável:", error));
});