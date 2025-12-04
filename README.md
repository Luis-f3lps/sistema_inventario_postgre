
# Sistema de Inventário de Produtos Químicos Fiscalizados pela PF para o IFNMG Salinas

<p align="center">
    <img src="https://qualitapps.com/wp-content/uploads/2023/02/102.png" width="120" height="80"/>
</p>



Este é um sistema de inventário que permite gerenciar e registrar consumos de produtos químicos. O sistema inclui uma interface web e funcionalidades para gerar relatórios em PDF.

## Pré-requisitos

Certifique-se de que você tem as seguintes ferramentas instaladas:

- Node.js (v14 ou superior)
- Vercel
- Neon 

## Funcionalidades do Sistema

### 1. Gerenciamento de Produtos
- **Adicionar Produtos:** Inclui novos produtos químicos ao inventário, com detalhes como sigla, concentração, densidade, nome completo, tipo de unidade (mililitros ou gramas) e NCM.
- **Editar Produtos:** Atualiza informações sobre produtos já cadastrados.
- **Remover Produtos:** Exclui produtos do inventário após confirmação do usuário.

### 2. Registro de Consumo
- **Registrar Consumo:** Permite o registro detalhado do consumo de produtos, incluindo a seleção do produto, quantidade, laboratório, data do consumo e descrição adicional.

### 3. Geração de Relatórios em PDF
- **Relatórios Detalhados:** Gera relatórios em PDF com informações sobre o inventário e consumos registrados.

## Sub-abas do Sistema

### 4. Inventário
- Exibe todos os produtos, mostrando o nome do produto, a quantidade disponível e informações adicionais.

### 5. Adicionar Produto
- O usuário preenche os campos necessários e clica em "Adicionar Estoque" para concluir o cadastro de novos produtos.

### 6. Excluir Produto
- O usuário seleciona um produto da lista e confirma a exclusão clicando em "Excluir Estoque".

### 7. Registrar Entrada
- O usuário registra a entrada de produtos ao selecionar o item, informar a quantidade, a data da entrada e uma descrição, clicando em "Registrar" para finalizar o processo.

## Acesso ao Sistema
- **Usuários do tipo "normal":** Têm acesso limitado, podendo usar apenas o inventário e as funcionalidades de registro.
- **Usuários do tipo "admin":** Têm acesso a opções administrativas adicionais para um maior controle do sistema.
