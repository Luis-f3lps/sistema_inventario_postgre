
var sidemenu = document.getElementById("sidemenu");
function openmenu(){
    sidemenu.style.left = "0px";
}
function clossmenu(){
    sidemenu.style.left = "-800px";
}


// Função para verificar se o usuário está autenticado
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

// Função para redirecionar se o usuário não estiver autenticado
function redirecionarSeNaoAutenticado() {
    Autenticado().then(authenticated => {
        if (!authenticated) {
            window.location.href = 'index.html'; 
        }
    });
}

// Verifica autenticação ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname !== '/index.html') {
        redirecionarSeNaoAutenticado();
    }
    loadSelectOptions('/api/produto', 'sigla-select');
    loadSelectOptions('/api/laboratorios', 'laboratorio-select');
    loadsiglasEntrada();
});

// Função genérica para carregar opções em um select
function loadSelectOptions(url, selectId) {
}

fetch('/api/lab')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        const select = document.getElementById('laboratorio-select');
        select.innerHTML = ''; // Limpa o select antes  

        data.forEach(lab => {
            const option = document.createElement('option');
            option.value = lab.id_laboratorio; // Use o ID do laboratório
            option.textContent = lab.nome_laboratorio; // Use o nome do laboratório
            select.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Erro ao carregar laboratórios:', error);
    });


fetch('/api/est')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        const select = document.getElementById('sigla-select');
        select.innerHTML = ''; // Limpa o select antes  

        data.forEach(lab => {
            const option = document.createElement('option');
            option.value = lab.id_produto; // Use o ID do produto
            option.textContent = lab.sigla; // Use a sigla como texto da opção
            select.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Erro ao carregar produto:', error);
    });

// Função para carregar siglas de entrada
function loadsiglasEntrada() {
    // Implemente a lógica para carregar siglas de entrada aqui, se necessário
}

// Função para abrir a aba correspondente
function opentab(tabname) {
    document.querySelectorAll('.tab-links').forEach(link => link.classList.remove('active-link'));
    document.querySelectorAll('.tab-contents').forEach(content => content.classList.remove('active-tab'));

    document.getElementById(tabname).classList.add('active-tab');
    event.currentTarget.classList.add('active-link');
}

// Manipulador de eventos para os submenus
document.querySelectorAll('.submenu > a').forEach(menu => {
    menu.addEventListener('click', function(e) {
        e.preventDefault();
        const submenuItems = this.nextElementSibling;
        submenuItems.classList.toggle('open');
        this.querySelector('.fas.fa-chevron-down').classList.toggle('rotate');
    });
});

// Pegar o nome do usuário logado
function loadLoggedInUser() {
    fetch('/api/usuario-logado')
        .then(response => response.json())
        .then(data => {
            const userNameElement = document.getElementById('user-name-text');
            userNameElement.innerHTML = data.nome;
            if (data.tipo_usuario === 'admin') {
                document.querySelector('.admin-menu').style.display = 'block';
                document.querySelector('.tab-links[onclick="opentab(\'Aba02\')"]').style.display = 'block';

            }
        })
        .catch(error => console.error('Erro ao carregar usuário logado:', error));
}
loadLoggedInUser();

// Carregar siglas no select de entrada de produto
function loadsiglasEntrada() {
    fetch('/api/siglas')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('produto-entrada-select');
            select.innerHTML = ''; // Limpa o select antes  

            data.forEach(sigla => {
                const option = document.createElement('option');
                option.value = sigla.id_produto; // Usar id_produto como valor
                option.textContent = sigla.sigla; // Exibir a sigla como texto da opção
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar siglas:', error));
}

// Chama a função quando a página for carregada
document.addEventListener('DOMContentLoaded', function() {
    loadsiglasEntrada();
});
// Manipulador de envio do formulário de entrada
document.getElementById('entrada-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Previne o comportamento padrão de envio do formulário

    const idproduto = document.getElementById('produto-entrada-select').value;
    const quantidade = parseInt(document.getElementById('quantidade-entrada').value, 10);
    const dataEntrada = document.getElementById('data-entrada').value;
    const descricao = document.getElementById('descricao-entrada').value;

    // Validação dos campos
    if (!idproduto || isNaN(quantidade) || quantidade <= 0 || !dataEntrada || !descricao) {
        alert('Todos os campos são obrigatórios e a quantidade deve ser maior que zero.');
        return;
    }

    const entradaData = {
        id_produto: idproduto,
        quantidade: quantidade,
        data_entrada: dataEntrada,
        descricao: descricao
    };

    // Envia os dados para registrar a entrada e atualizar o produto
    fetch('/api/registrar_entrada', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(entradaData),
    })
    .then(response => response.json())
    .then(result => {
        if (result.message) {
            alert(result.message);
        } else {
            alert(result.error || 'Erro ao registrar a entrada.');
        }
    })
    .catch(error => console.error('Erro ao registrar entrada:', error));
});

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('consumo-form').addEventListener('submit', function(event) {
        event.preventDefault(); // Previne o comportamento padrão de envio do formulário

        const idproduto = document.getElementById('sigla-select').value;
        const quantidade = parseInt(document.getElementById('quantidade').value, 10);
        const laboratorio = document.getElementById('laboratorio-select').value;
        const data_consumo = document.getElementById('data_consumo').value;
        const descricao = document.getElementById('descricao_comsumo').value; // Corrigido para usar o ID correto

        // Verifica se todos os campos estão preenchidos
        if (!idproduto || isNaN(quantidade) || quantidade <= 0 || !laboratorio || !data_consumo || !descricao) {
            alert('Por favor, preencha todos os campos e a quantidade deve ser maior que zero.');
            return;
        }

        // Cria o objeto de dados para enviar
        const consumoData = {
            data_consumo: data_consumo,
            id_produto: idproduto,
            id_laboratorio: laboratorio,
            quantidade: quantidade,
            descricao: descricao
        };

        // Enviar os dados corretamente
        fetch('/api/registrar_consumo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(consumoData) 
        })
        .then(response => response.json())
        .then(result => {
            if (result.message) {
                alert(result.message);
            } else {
                alert(result.error || 'Erro ao registrar consumo.');
            }
        })
        .catch(error => console.error('Erro ao registrar consumo:', error));
    });
});

document.addEventListener('DOMContentLoaded', function() {
    // Carregar os IDs de entrada no select
    fetch('/api/entradas') 
        .then(response => response.json())
        .then(data => {
            const idSelect = document.getElementById('id-select');
            data.forEach(entrada => {
                const option = document.createElement('option');
                option.value = entrada.id; 
                option.textContent = entrada.id; 
                idSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar IDs de entrada:', error));

    // Manipulador de envio do formulário
    document.getElementById('entrada-form').addEventListener('submit', function(event) {
        event.preventDefault(); // Previne o comportamento padrão de envio do formulário

        const idEntrada = document.getElementById('id-select').value; // ID da entrada selecionada
        const idProduto = document.getElementById('produto-entrada-select').value; // ID do produto
        const quantidade = parseInt(document.getElementById('quantidade-entrada').value); // Quantidade
        const dataEntrada = document.getElementById('data-entrada').value; // Data de entrada

        // Validação dos campos
        if (!idEntrada || !idProduto || !quantidade || !dataEntrada) {
            alert('Todos os campos são obrigatórios.');
            return;
        }

        const entradaData = {
            id_entrada: idEntrada, // Incluindo o ID da entrada
            id_produto: idProduto,
            quantidade: quantidade,
            data_entrada: dataEntrada,
        };

        // Envia os dados para atualizar a entrada
        fetch('/api/edita_registrar_entrada', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(entradaData),
        })
        .then(response => response.json())
        .then(result => {
            if (result.message) {
                alert(result.message);
            } else {
                alert(result.error);
            }
        })
        .catch(error => console.error('Erro ao atualizar entrada:', error));
    });
});
