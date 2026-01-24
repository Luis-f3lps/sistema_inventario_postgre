
var sidemenu = document.getElementById("sidemenu");
function openmenu() {
    sidemenu.style.left = "0px";
}
function clossmenu() {
    sidemenu.style.left = "-800px";
}


document.addEventListener('DOMContentLoaded', () => {
    const menuContainer = document.getElementById('menu-container');
    if (menuContainer) {
        fetch('menu.html')
            .then(response => response.text())
            .then(data => {
                menuContainer.innerHTML = data;
            })
            .catch(error => console.error('Erro ao carregar o menu:', error));
    }
});

function Autenticado() {
    return fetch('/api/check-auth', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => data.Autenticado)
        .catch(() => false);
}

function redirecionarSeNaoAutenticado() {
    Autenticado().then(authenticated => {
        if (!authenticated) {
            window.location.href = 'login.html';
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    if (window.location.pathname !== '/login.html') {
        redirecionarSeNaoAutenticado();
    }
});

function opentab(tabname) {
    var tablinks = document.getElementsByClassName("tab-links");
    var tabcontents = document.getElementsByClassName("tab-contents");

    Array.from(tablinks).forEach(link => link.classList.remove("active-link"));

    Array.from(tabcontents).forEach(content => {
        content.classList.remove("active-tab");
        if (content.id === tabname) {
            content.classList.add("active-tab");
        }
    });

    event.currentTarget.classList.add("active-link");
}

function loadUsers() {
    fetch('/api/usuarios')
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('usuarios-tbody');
            const selectRemove = document.getElementById('usuarios-select');
            const selectActivate = document.getElementById('usuarios-select-ativar');

            tbody.innerHTML = '';
            selectRemove.innerHTML = ''; 
            selectActivate.innerHTML = ''; 

            data.forEach(usuario => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${usuario.nome_usuario}</td>
                    <td>${usuario.email}</td>
                    <td>${usuario.tipo_usuario}</td>
                    <td>${usuario.status}</td>
                `;
                tbody.appendChild(tr);
                if (usuario.status === 'ativado') {
                    const optionRemove = document.createElement('option');
                    optionRemove.value = usuario.email;
                    optionRemove.textContent = `${usuario.nome_usuario} (${usuario.status})`;
                    selectRemove.appendChild(optionRemove);
                }

                if (usuario.status === 'desativado') {
                    const optionActivate = document.createElement('option');
                    optionActivate.value = usuario.email;
                    optionActivate.textContent = `${usuario.nome_usuario} (${usuario.status})`;
                    selectActivate.appendChild(optionActivate);
                }
            });
        })
        .catch(error => console.error('Erro ao carregar usuários:', error));
}

loadUsers();

async function loadLoggedInUser() {
    const response = await fetch('/api/usuario-logado');
    if (!response.ok) {
        window.location.href = '/login.html';
        return;
    }
    fetch('/api/usuario-logado')
        .then(response => {
            if (!response.ok) {
                throw new Error('Falha ao buscar usuário. Status: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            const userNameElement = document.getElementById('user-name-text');
            userNameElement.innerHTML = data.nome;

            const userType = data.tipo_usuario ? data.tipo_usuario.trim().toLowerCase() : '';

            switch (userType) {
                case 'admin':
                    document.querySelector('.admin-menu').style.display = 'block';
                    document.querySelector('#sidemenu > li.submenu.produto').style.display = 'block';

                    break;
                case 'tecnico':
                    document.querySelector('.tecnico').style.display = 'block';
                    document.querySelector('.Home').style.display = 'block';
                    document.querySelector('#sidemenu > li.submenu.produto').style.display = 'block';

                    break;
                case 'professor':
                    document.querySelector('.Home').style.display = 'block';
                    document.querySelector('.professor').style.display = 'block';
                    document.querySelector('.Horarios').style.display = 'block';

                    break;
            }
        })
        .catch(error => console.error('Erro ao carregar usuário logado:', error));
}
loadLoggedInUser();


document.getElementById('add-user-form').addEventListener('submit', function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const userType = document.getElementById('type').value; 
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        alert('As senhas não coincidem!');
        return;
    }

    fetch('/api/usuarios', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nome_usuario: username, email: email, tipo_usuario: userType, senha: password }) 
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message);

                const tbody = document.getElementById('usuarios-tbody');
                const tr = document.createElement('tr');
                tr.innerHTML = `
                <td>${username}</td>
                <td>${email}</td>
            `;
                tbody.appendChild(tr);

                const select = document.getElementById('usuarios-select');
                const option = document.createElement('option');
                option.value = email;
                option.textContent = username;
                select.appendChild(option);

                document.getElementById('add-user-form').reset();
                location.reload();
            }
        })
        .catch(error => console.error('Erro ao adicionar usuário:', error));
});

document.getElementById('remove-user-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const email = document.getElementById('usuarios-select').value;

    fetch(`/api/usuarios/${email}`, {
        method: 'PATCH',
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message);
                location.reload();
            }
        })
        .catch(error => console.error('Erro ao desativar usuário:', error));
});

document.getElementById('activate-user-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const email = document.getElementById('usuarios-select-ativar').value;

    fetch(`/api/usuarios/ativar/${email}`, {
        method: 'PATCH',
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message);
                location.reload();
            }
        })
        .catch(error => console.error('Erro ao ativar usuário:', error));
});

function updateUserStatus(email, status) {
    const rows = document.querySelectorAll(`#usuarios-tbody tr`);
    rows.forEach(row => {
        if (row.cells[1].textContent === email) {
            row.cells[2].textContent = status; 
        }
    });
}

function removeOptionFromSelect(email, selectId) {
    const select = document.getElementById(selectId);
    const options = select.querySelectorAll('option');
    options.forEach(option => {
        if (option.value === email) {
            option.remove();
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    loadLoggedInUser();
});

document.querySelectorAll('.submenu > a').forEach(menu => {
    menu.addEventListener('click', function (e) {
        e.preventDefault();
        const submenuItems = this.nextElementSibling;
        submenuItems.classList.toggle('open');
        this.querySelector('.fas.fa-chevron-down').classList.toggle('rotate');
    });
});

