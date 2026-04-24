import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pkg from "pg";
import PDFDocument from "pdfkit";
import fs from "fs";
import bcrypt from "bcryptjs";
import pool from "./database.js";


import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SISTEMA,
    pass: process.env.SENHA_EMAIL_SISTEMA
  }
});


// 1. NOVOS IMPORTS PARA O JWT E COOKIES
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "variaveis.env") });
console.log({
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
});

const app = express();

// 2. CHAVE SECRETA DO JWT (Recomendo depois colocar no seu variaveis.env como JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || "chaveSuperSecretaDoInventario2026";

(async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("Conexão bem-sucedida ao banco de dados!");
  } catch (err) {
    console.error("Erro ao conectar ao banco de dados:", err);
  }
})();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. ATIVANDO O LEITOR DE COOKIES
app.use(cookieParser());

// 4. NOVO MIDDLEWARE DE AUTENTICAÇÃO 
function Autenticado(req, res, next) {
  const token = req.cookies.token; // Pega o crachá digital do cookie

  if (!token) {
    console.log("Usuário não autenticado, bloqueando acesso...");
    if (req.originalUrl.startsWith('/api') || req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(401).json({ error: "Não autorizado" });
    } else {
      return res.redirect("https://sistema-merlin.vercel.app/");
    }
  }

  try {
    // Confere a assinatura matemática do token
    const decoded = jwt.verify(token, JWT_SECRET);

    //  Recria o req.session.user na memória rápida para não quebrar o resto do seu sistema!
    req.session = { user: decoded };

    next();
  } catch (err) {
    console.error("Token inválido ou expirado.");
    res.clearCookie("token");
    return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
  }
}
//  MIDDLEWARE Bloqueio por Cargo

function AutorizadoPara(cargosPermitidos) {
  return (req, res, next) => {
    let tipoUser = req.session.user.tipo_usuario.trim().toLowerCase();

    // Padroniza a nomenclatura do admin para evitar furos
    if (tipoUser === 'administrador') tipoUser = 'admin';

    // Verifica se o cargo do usuário está na "lista VIP" daquela rota
    if (cargosPermitidos.includes(tipoUser)) {
      next(); // Passou! Pode acessar a rota.
    } else {
      console.warn(`Tentativa de acesso negado. Cargo: ${tipoUser}. Rota: ${req.originalUrl}`);

      if (req.originalUrl.startsWith('/api')) {
        return res.status(403).json({ error: "Acesso Negado: Seu cargo não tem permissão para realizar esta ação." });
      } else {
        // Define a "rota de fuga" correta baseada no cargo do usuário
        let rotaSegura = '/login.html';
        if (tipoUser === 'admin') rotaSegura = '/Inventario';
        if (tipoUser === 'tecnico' || tipoUser === 'professor') rotaSegura = '/Home';

        // Trava absoluta de segurança: se ele já estiver na rota segura e mesmo assim for bloqueado, mostra tela de erro.
        if (req.originalUrl === rotaSegura) {
          return res.status(403).send("<h1 style='text-align:center; margin-top:50px;'>403 - Acesso Negado</h1><p style='text-align:center;'>Você não tem permissão para ver esta página.</p>");
        }

        // Redireciona para o lugar certo e quebra o loop!
        return res.redirect(rotaSegura);
      }
    }
  };
}
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// 5. NOVA ROTA DE LOGIN (Gera o Token JWT)
app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
    }

    const { rows } = await pool.query(
      "SELECT * FROM usuario WHERE email = $1",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = rows[0];

    if (user.status === "desativado") {
      return res.status(403).json({
        error: "Usuário desativado, entre em contato com o Administrador para ativação.",
      });
    }

    const match = await bcrypt.compare(senha, user.senha);
    if (!match) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    // Criando os dados que vão dentro do crachá (Token)
    const userData = {
      nome: user.nome_usuario,
      email: user.email,
      tipo_usuario: user.tipo_usuario,
    };

    // Assinando o Token válido por 8 horas
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '8h' });

    // Enviando o Token como um Cookie seguro para o navegador
    res.cookie('token', token, {
      httpOnly: true, // Impede roubo por hackers via Javascript
      secure: process.env.NODE_ENV === 'production', // true na Vercel
      maxAge: 8 * 60 * 60 * 1000 // 8 horas
    });

    res.json({ success: true, tipo_usuario: user.tipo_usuario });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando no endereço http://localhost:${PORT}`);
});

// ==========================================
// PÁGINAS LIVRES
// ==========================================
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/novo-usuario", (req, res) => res.sendFile(path.join(__dirname, "public", "novo-usuario.html")));
// ==========================================
// PÁGINAS GERAIS & PROFESSOR/TÉCNICO
// ==========================================
app.get("/Home", Autenticado, AutorizadoPara(['tecnico', 'professor']), (req, res) => res.sendFile(path.join(__dirname, "public", "Home.html")));
app.get("/Calendario", Autenticado, AutorizadoPara(['tecnico', 'professor']), (req, res) => res.sendFile(path.join(__dirname, "public", "calendario.html")));

// ==========================================
// PÁGINAS DO PROFESSOR (.professor, .Disciplinas, .Horarios)
// ==========================================
app.get("/Horario", Autenticado, AutorizadoPara(['professor']), (req, res) => res.sendFile(path.join(__dirname, "public", "horarios.html")));
app.get("/agendamento-recorrente", Autenticado, AutorizadoPara(['professor']), (req, res) => res.sendFile(path.join(__dirname, "public", "agendamento-recorrente.html")));
app.get("/Tela_Professor", Autenticado, AutorizadoPara(['professor']), (req, res) => res.sendFile(path.join(__dirname, "public", "tela_professor.html")));

// ==========================================
// PÁGINAS DO TÉCNICO (.tecnico)
// ==========================================
app.get("/Tela_Tecnico", Autenticado, AutorizadoPara(['tecnico']), (req, res) => res.sendFile(path.join(__dirname, "public", "tela_tecnico.html")));

// ==========================================
// PÁGINAS COMPARTILHADAS 
// ==========================================
app.get("/Disciplinas", Autenticado, AutorizadoPara(['admin', 'professor']), (req, res) => res.sendFile(path.join(__dirname, "public", "disciplinas.html")));

app.get("/Produto", Autenticado, AutorizadoPara(['admin', 'tecnico']), (req, res) => res.sendFile(path.join(__dirname, "public", "Produto.html")));
app.get("/MovimentacaoProduto", Autenticado, AutorizadoPara(['admin', 'tecnico']), (req, res) => res.sendFile(path.join(__dirname, "public", "MovimentacaoProduto.html")));
app.get("/EditarMovimentacoes", Autenticado, AutorizadoPara(['admin', 'tecnico']), (req, res) => res.sendFile(path.join(__dirname, "public", "EditarMovimentacoes.html")));
app.get("/Inventario", Autenticado, AutorizadoPara(['admin', 'tecnico']), (req, res) => res.sendFile(path.join(__dirname, "public", "Inventario.html")));


app.get("/Relatorio", Autenticado, AutorizadoPara(['admin', 'tecnico']), (req, res) => res.sendFile(path.join(__dirname, "public", "relatorio.html")));
app.get("/Usuarios", Autenticado, AutorizadoPara(['admin']), (req, res) => res.sendFile(path.join(__dirname, "public", "usuarios.html")));
app.get("/Laboratorio", Autenticado, AutorizadoPara(['admin']), (req, res) => res.sendFile(path.join(__dirname, "public", "laboratorio.html")));
// Novas telas de Sala de Aula
app.get("/Salas", Autenticado, AutorizadoPara(['admin', 'tecnico']), (req, res) => res.sendFile(path.join(__dirname, "public", "salas.html")));
app.get("/Tela_Responsavel_Salas", Autenticado, (req, res) => res.sendFile(path.join(__dirname, "public", "tela_responsavel_salas.html")));

app.get("/agendamento-recorrente-salas", Autenticado, AutorizadoPara(['professor']), (req, res) => res.sendFile(path.join(__dirname, "public", "agendamento-recorrente-salas.html")));
app.get("/CalendarioSalas", Autenticado, AutorizadoPara(['tecnico', 'admin', 'professor']), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "calendario_salas.html"));
});
app.get("/DashboardSalas", Autenticado, (req, res) => res.sendFile(path.join(__dirname, "public", "home_salas.html")));
app.get("/api/usuario-logado", (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Usuário não logado" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      email: decoded.email,
      nome: decoded.nome,
      tipo_usuario: decoded.tipo_usuario,
    });
  } catch (err) {
    res.status(401).json({ error: "Sessão inválida ou expirada" });
  }
});

// 7. NOVA ROTA DE LOGOUT (Apaga o cookie)
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login.html");
});

// 8. ATUALIZADA: Checar Autenticação
app.get("/api/check-auth", (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Autenticado: false });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ Autenticado: true });
  } catch (err) {
    res.json({ Autenticado: false });
  }
});

// Rotas para usuários
app.get("/api/usuarios", Autenticado, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT nome_usuario, email, tipo_usuario, status FROM usuario ORDER BY tipo_usuario ASC, nome_usuario ASC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Desativar Usuários
app.patch("/api/usuarios/:email", Autenticado, async (req, res) => {
  const { email } = req.params;
  const loggedUserEmail = req.session.user.email;

  try {
    if (email === loggedUserEmail) {
      return res.status(403).json({ error: "Você não pode desativar sua própria conta." });
    }

    const resultUserToDeactivate = await pool.query(
      "SELECT tipo_usuario FROM usuario WHERE email = $1",
      [email],
    );

    if (resultUserToDeactivate.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const userType = resultUserToDeactivate.rows[0].tipo_usuario;

    if (userType === "admin") {
      const resultActiveAdmins = await pool.query(
        "SELECT COUNT(*) AS count FROM usuario WHERE tipo_usuario = $1 AND status = $2",
        ["admin", "ativado"],
      );

      if (resultActiveAdmins.rows[0].count <= 1) {
        return res.status(403).json({ error: "Não é possível desativar o único usuário admin ativo." });
      }
    }

    await pool.query("UPDATE usuario SET status = $1 WHERE email = $2", ["desativado", email]);
    res.status(200).json({ message: "Usuário desativado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Ativar Usuários
app.patch("/api/usuarios/ativar/:email", Autenticado, async (req, res) => {
  const { email } = req.params;
  try {
    // 1. Atualiza o status e já busca o nome do usuário para o email
    const result = await pool.query(
      "UPDATE usuario SET status = $1 WHERE email = $2 RETURNING nome_usuario",
      ["ativado", email]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const nomeUsuario = result.rows[0].nome_usuario;

    // 2. Tenta enviar o email de boas-vindas
    try {
      console.log(`\n⏳ Enviando confirmação de ativação para: ${email}...`);
      await enviarEmailAtivacaoUsuario(email, nomeUsuario);
      console.log("✅ Usuário notificado por email com sucesso!");
    } catch (erroEmail) {
      console.error("❌ Erro ao enviar email de ativação (mas o usuário foi ativado no banco):");
      console.error(erroEmail);
    }

    res.status(200).json({ message: "Usuário ativado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro no servidor ao ativar usuário" });
  }
});

// Adicionar Usuários
app.post("/api/usuarios", Autenticado, async (req, res) => {
  const { nome_usuario, email, senha, tipo_usuario } = req.body;

  if (!nome_usuario || !email || !senha || !tipo_usuario) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  if (senha.length > 12) {
    return res.status(400).json({ error: "A senha deve ter no máximo 12 caracteres" });
  }

  try {
    const { rows: existingUserByName } = await pool.query(
      "SELECT email FROM usuario WHERE nome_usuario = $1", [nome_usuario]
    );

    if (existingUserByName.length > 0) {
      return res.status(400).json({ error: "Nome de usuário já está em uso" });
    }

    const { rows: existingUserByEmail } = await pool.query(
      "SELECT email FROM usuario WHERE email = $1", [email]
    );

    if (existingUserByEmail.length > 0) {
      return res.status(400).json({ error: "Email já está em uso" });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    await pool.query(
      "INSERT INTO usuario (nome_usuario, email, senha, tipo_usuario) VALUES ($1, $2, $3, $4)",
      [nome_usuario, email, hashedPassword, tipo_usuario],
    );

    res.status(201).json({ message: "Usuário adicionado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.post("/api/novo-usuario", async (req, res) => {
  const { nome_usuario, email, senha, tipo_usuario } = req.body;

  if (!nome_usuario || !email || !senha || !tipo_usuario) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  const tiposPermitidos = ["professor", "tecnico"];
  if (!tiposPermitidos.includes(tipo_usuario)) {
    return res.status(403).json({ error: "Apenas perfis de Professor ou Técnico são permitidos neste cadastro." });
  }

  if (senha.length > 12) {
    return res.status(400).json({ error: "A senha deve ter no máximo 12 caracteres" });
  }

  try {
    const { rows: existingUserByEmail } = await pool.query(
      "SELECT email FROM usuario WHERE email = $1", [email]
    );

    if (existingUserByEmail.length > 0) {
      return res.status(400).json({ error: "Email já está em uso" });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    // 1. Salva o usuário no banco como desativado
    await pool.query(
      "INSERT INTO usuario (nome_usuario, email, senha, tipo_usuario, status) VALUES ($1, $2, $3, $4, 'desativado')",
      [nome_usuario, email, hashedPassword, tipo_usuario],
    );

    await enviarEmailCriacaoConta(email, nome_usuario).catch(e => console.error("Erro ao enviar email de criação:", e));

    res.status(201).json({ message: "Usuário adicionado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

/* --------------Email------------------*/

async function enviarEmailAutorizacao(emailDestino, dadosAula) {
  const mailOptions = {
    from: `Sistema Merlin <${process.env.EMAIL_SISTEMA}>`,
    to: emailDestino,
    subject: 'Aula autorizada',
    html: `
      <h2 style="color: #28a745;">Sua aula foi autorizada!</h2>
      <p><strong>Disciplina:</strong> ${dadosAula.disciplina}</p>
      <p><strong>Laboratório:</strong> ${dadosAula.laboratorio}</p>
      <p><strong>Data:</strong> ${dadosAula.data} às ${dadosAula.horario}</p>
      <p>Bom trabalho!</p>
    `
  };
  return transporter.sendMail(mailOptions);
}

async function enviarEmailRecusa(emailDestino, dadosAula, justificativa) {
  const mailOptions = {
    from: `Sistema Merlin <${process.env.EMAIL_SISTEMA}>`,
    to: emailDestino,
    subject: 'Aula não autorizada',
    html: `
      <h2 style="color: #dc3545;">Sua solicitação não foi autorizada</h2>
      <p><strong>Disciplina:</strong> ${dadosAula.disciplina}</p>
      <p><strong>Laboratório:</strong> ${dadosAula.laboratorio}</p>
      <p><strong>Data:</strong> ${dadosAula.data} às ${dadosAula.horario}</p>
      <p><strong>Motivo:</strong> ${justificativa}</p>
      <p>Para dúvidas, entre em contato com o técnico responsável.</p>
    `
  };
  return transporter.sendMail(mailOptions);
}

async function enviarEmailCancelamento(emailDestino, dadosAula) {
  const mailOptions = {
    from: `Sistema Merlin <${process.env.EMAIL_SISTEMA}>`,
    to: emailDestino,
    subject: 'Aula cancelada',
    html: `
      <h2 style="color: #6c757d;">Agendamento Cancelado</h2>
      <p>Informamos que o agendamento da disciplina <strong>${dadosAula.disciplina}</strong> no laboratório <strong>${dadosAula.laboratorio}</strong>, programado para o dia ${dadosAula.data} às ${dadosAula.horario}, foi cancelado.</p>
    `
  };
  return transporter.sendMail(mailOptions);
}

async function enviarEmailCriacaoConta(emailDestino, nomeUsuario) {
  const mailOptions = {
    from: `Sistema Merlin <${process.env.EMAIL_SISTEMA}>`,
    to: emailDestino,
    subject: 'Bem-vindo ao Sistema Merlin - Aguardando Ativação',
    html: `
      <h2 style="color: #0056b3;">Olá, ${nomeUsuario}!</h2>
      <p>Sua conta no <strong>Sistema Merlin</strong> foi criada com sucesso.</p>
      <p>No momento, o seu perfil está com o status <strong>em análise</strong>.</p>
      <p>Por questões de segurança, você precisa aguardar que um administrador do sistema aprove e ative o seu acesso aos laboratórios.</p>
      <p>Assim que o administrador liberar o seu perfil, você conseguirá fazer login no sistema.</p>
      <br>
      <p>Atenciosamente,<br>Equipe Sistema Merlin</p>
    `
  };
  return transporter.sendMail(mailOptions);
}
async function enviarEmailNovaSolicitacaoTecnico(emailDestino, dadosSolicitacao) {
  const mailOptions = {
    from: `Sistema Merlin <${process.env.EMAIL_SISTEMA}>`,
    to: emailDestino,
    subject: '🚨 Nova Solicitação de Aula',
    html: `
      <h2 style="color: #0056b3;">Nova Solicitação de Agendamento</h2>
      <p>Olá, <strong>${dadosSolicitacao.nome_tecnico}</strong>!</p>
      <p>O professor <strong>${dadosSolicitacao.nome_professor}</strong> acabou de solicitar o uso do laboratório <strong>${dadosSolicitacao.laboratorio}</strong>.</p>
      <ul style="font-size: 15px; background: #f8f9fa; padding: 15px; border-radius: 5px; list-style: none;">
        <li>📅 <strong>Data:</strong> ${dadosSolicitacao.data}</li>
        <li>⏰ <strong>Horário:</strong> ${dadosSolicitacao.horario}</li>
        <li>📚 <strong>Disciplina:</strong> ${dadosSolicitacao.disciplina}</li>
        <li>🛠️ <strong>Precisa do seu apoio?</strong> ${dadosSolicitacao.precisa_tecnico ? '<span style="color: red;">SIM</span>' : 'NÃO'}</li>
      </ul>
      <p>Por favor, acesse o painel do técnico no sistema para autorizar ou recusar esta solicitação.</p>
    `
  };
  return transporter.sendMail(mailOptions);
}

async function enviarEmailNovaSolicitacaoRecorrenteTecnico(emailDestino, dadosSolicitacao) {
  const mailOptions = {
    from: `Sistema Merlin <${process.env.EMAIL_SISTEMA}>`,
    to: emailDestino,
    subject: '🚨 Nova Solicitação de Aula RECORRENTE',
    html: `
      <h2 style="color: #0056b3;">Nova Solicitação de Agendamento Recorrente</h2>
      <p>Olá, <strong>${dadosSolicitacao.nome_tecnico}</strong>!</p>
      <p>O professor <strong>${dadosSolicitacao.nome_professor}</strong> solicitou o uso do laboratório <strong>${dadosSolicitacao.laboratorio}</strong> para um período contínuo.</p>
      <ul style="font-size: 15px; background: #f8f9fa; padding: 15px; border-radius: 5px; list-style: none;">
        <li>📅 <strong>Período:</strong> De ${dadosSolicitacao.dataInicio} até ${dadosSolicitacao.dataFim}</li>
        <li>⏰ <strong>Horários Selecionados:</strong> ${dadosSolicitacao.horarios}</li>
        <li>📚 <strong>Disciplina:</strong> ${dadosSolicitacao.disciplina}</li>
        <li>🛠️ <strong>Precisa do seu apoio?</strong> ${dadosSolicitacao.precisa_tecnico ? '<span style="color: red;">SIM</span>' : 'NÃO'}</li>
      </ul>
      <p>Por favor, acesse o painel do técnico para analisar este pedido em lote.</p>
    `
  };
  return transporter.sendMail(mailOptions);
}

async function enviarEmailAtivacaoUsuario(emailDestino, nomeUsuario) {
  const mailOptions = {
    from: `Sistema Merlin <${process.env.EMAIL_SISTEMA}>`,
    to: emailDestino,
    subject: 'Sua conta foi ativada! - Sistema Merlin',
    html: `
      <h2 style="color: #28a745;">Boas notícias, ${nomeUsuario}!</h2>
      <p>Sua conta no <strong>Sistema Merlin</strong> foi analisada e <strong>ativada</strong> por um administrador.</p>
      <p>Agora você já pode acessar o sistema com seu email e senha para realizar seus agendamentos e consultar o inventário.</p>
      <div style="margin-top: 20px;">
        <a href="https://sistema-merlin.vercel.app/" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Acessar o Sistema</a>
      </div>
      <br>
      <p>Atenciosamente,<br>Equipe Sistema Merlin</p>
    `
  };
  return transporter.sendMail(mailOptions);
}

// Rotas para produtos
app.get("/api/produto", Autenticado, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT sigla, nome_produto, concentracao, densidade, quantidade, tipo_unidade_produto, ncm FROM produto ORDER BY nome_produto ASC",
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao obter produtos:", error);
    res.status(500).json({ error: "Erro no servidor ao obter produtos" });
  }
});

/* --------------laboratórios------------------*/

// Obter todos os laboratórios
app.get("/api/laboratorios", Autenticado, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        l.id_laboratorio, 
        l.nome_laboratorio, 
        string_agg(u.nome_usuario, ', ') AS responsavel, 
        string_agg(u.email, ', ') AS usuario_email
      FROM laboratorio l
      LEFT JOIN laboratorio_usuario lu ON l.id_laboratorio = lu.id_laboratorio
      LEFT JOIN usuario u ON lu.usuario_email = u.email
      GROUP BY l.id_laboratorio, l.nome_laboratorio
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Erro no servidor ao obter laboratórios" });
  }
});

// Paginação para laboratórios
app.get("/api/laboratoriosPag", Autenticado, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageInt = parseInt(page, 10);
  const limitInt = parseInt(limit, 10);
  const offset = (pageInt - 1) * limitInt;

  try {
    const result = await pool.query(`
        SELECT 
            l.id_laboratorio, 
            l.nome_laboratorio, 
            string_agg(u.email, ', ') AS usuario_email, 
            string_agg(u.nome_usuario, ', ') AS nome_usuario
        FROM laboratorio l
        LEFT JOIN laboratorio_usuario lu ON l.id_laboratorio = lu.id_laboratorio
        LEFT JOIN usuario u ON lu.usuario_email = u.email
        GROUP BY l.id_laboratorio, l.nome_laboratorio
        LIMIT $1 OFFSET $2
      `, [limitInt, offset]
    );

    const countResult = await pool.query("SELECT COUNT(*) as total FROM laboratorio");
    const totalPages = Math.ceil(countResult.rows[0].total / limitInt);

    res.json({ data: result.rows, totalItems: countResult.rows[0].total, totalPages, currentPage: pageInt });
  } catch (error) {
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Adicionar um laboratório
app.post("/api/atualizar-responsavel", Autenticado, async (req, res) => {
  const { idLaboratorio, usuarioEmail } = req.body;
  try {
    await pool.query(
        "INSERT INTO laboratorio_usuario (id_laboratorio, usuario_email) VALUES ($1, $2) ON CONFLICT DO NOTHING", 
        [idLaboratorio, usuarioEmail]
    );
    res.json({ message: "Responsável vinculado com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao vincular responsável." });
  }
});

// Remover um laboratório
app.delete(
  "/api/laboratorios/:id_laboratorio",
  Autenticado,
  async (req, res) => {
    try {
      const { id_laboratorio } = req.params;
      console.log("ID do Laboratório recebido:", id_laboratorio);

      // Verifica se o laboratório existe
      const laboratorioCheck = await pool.query(
        "SELECT id_laboratorio FROM laboratorio WHERE id_laboratorio = $1",
        [id_laboratorio],
      );
      if (laboratorioCheck.rows.length === 0) {
        return res.status(404).json({ error: "Laboratório não encontrado." });
      }

      // Verifica se existem registros de consumo associados ao laboratório
      const consumoCheck = await pool.query(
        "SELECT id_consumo FROM registro_consumo WHERE id_laboratorio = $1",
        [id_laboratorio],
      );
      if (consumoCheck.rows.length > 0) {
        return res.status(400).json({
          error:
            "Não é possível remover o laboratório. Existem registros de consumo associados a ele.",
        });
      }

      // Remove o laboratório
      await pool.query("DELETE FROM laboratorio WHERE id_laboratorio = $1", [
        id_laboratorio,
      ]);
      res.json({ message: "Laboratório removido com sucesso!" });
    } catch (error) {
      console.error("Erro ao remover laboratório:", error);
      res.status(500).json({ error: "Erro ao remover laboratório" });
    }
  },
);

// Obter laboratórios com base no tipo de usuário

app.get("/api/lab", Autenticado, async (req, res) => {
  try {
    const { tipo_usuario, email } = req.session.user; 

    let query;
    let params = [];

    if (tipo_usuario === "admin") {
      query = "SELECT id_laboratorio, nome_laboratorio FROM laboratorio";
    } else {
      query = `
        SELECT l.id_laboratorio, l.nome_laboratorio 
        FROM laboratorio l
        JOIN laboratorio_usuario lu ON l.id_laboratorio = lu.id_laboratorio
        WHERE lu.usuario_email = $1
      `;
      params.push(email); 
    }

    const { rows: labs } = await pool.query(query, params);
    res.json(labs);
  } catch (error) {
    console.error("Erro ao buscar laboratórios:", error);
    res.status(500).json({ message: "Erro ao buscar laboratórios" });
  }
});

// Obter laboratórios com base no tipo de usuário
app.get("/api/lab32", Autenticado, async (req, res) => {
  try {
    const { tipo_usuario, email } = req.session.user;

    let query;
    let params = [];

    if (tipo_usuario === "professor") {
      query = "SELECT id_laboratorio, nome_laboratorio FROM laboratorio";
    } else {
      query = `
        SELECT l.id_laboratorio, l.nome_laboratorio 
        FROM laboratorio l
        JOIN laboratorio_usuario lu ON l.id_laboratorio = lu.id_laboratorio
        WHERE lu.usuario_email = $1
      `;
      params.push(email); 
    }

    const { rows: labs } = await pool.query(query, params);
    res.json(labs);
  } catch (error) {
    console.error("Erro ao buscar laboratórios:", error);
    res.status(500).json({ message: "Erro ao buscar laboratórios" });
  }
});

// Endpoint para buscar as disciplinas de um professor logado
// 1. Coloque o "Autenticado" aqui 👇
app.get("/api/minhas-disciplinas", Autenticado, async (req, res) => {
  if (!req.session?.user?.email) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  try {
    // 2. Pega o email do professor a partir da sessão
    const professor_email = req.session.user.email;

    // 3. Busca no banco de dados todas as disciplinas associadas a esse email
    const query = `
            SELECT id_disciplina, nome_disciplina 
            FROM disciplina 
            WHERE professor_email_responsavel = $1 
            ORDER BY nome_disciplina ASC
        `;

    const result = await pool.query(query, [professor_email]);

    // 4. Retorna a lista de disciplinas em formato JSON
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar disciplinas do professor:", err);
    res.status(500).json({ error: "Erro ao buscar as disciplinas." });
  }
});

app.delete("/api/excluir-produto/:idproduto", Autenticado, async (req, res) => {
  const { idproduto } = req.params;

  try {
    // Primeiro, verifica a quantidade do produto
    const { rows: quantidadeResult } = await pool.query(
      "SELECT quantidade FROM produto WHERE id_produto = $1",
      [idproduto],
    );

    if (quantidadeResult.length === 0) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    const quantidade = quantidadeResult[0].quantidade;

    // Se a quantidade for maior que zero, não permite a exclusão
    if (quantidade > 0) {
      return res.status(400).json({
        message:
          "Não é possível excluir o produto enquanto houver quantidade disponível.",
      });
    }

    // Se a quantidade for zero ou menor, apaga todos os registros de entrada e consumo
    await pool.query("DELETE FROM registro_entrada WHERE id_produto = $1", [
      idproduto,
    ]);
    await pool.query("DELETE FROM registro_consumo WHERE id_produto = $1", [
      idproduto,
    ]);

    // Por fim, exclui o produto
    const { rowCount } = await pool.query(
      "DELETE FROM produto WHERE id_produto = $1",
      [idproduto],
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    res.json({
      message: "Produto e registros relacionados excluídos com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    res.status(500).json({ message: "Erro ao excluir produto" });
  }
});

// Adicionar um produto// Rota para adicionar um produto
app.post("/api/addproduto", Autenticado, async (req, res) => {
  try {
    const {
      sigla,
      concentracao,
      densidade,
      nome_produto,
      tipo_unidade_produto,
      ncm,
      quantidade,
    } = req.body;

    // Primeiro, verifica se já existe um registro com a mesma sigla
    const { rows: existing } = await pool.query(
      "SELECT * FROM produto WHERE sigla = $1",
      [sigla],
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Sigla já usada." });
    }

    // Adicionar o produto à tabela de produto
    const { rows: result } = await pool.query(
      "INSERT INTO produto (sigla, concentracao, densidade, nome_produto, tipo_unidade_produto, ncm, quantidade) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_produto",
      [
        sigla,
        concentracao,
        densidade,
        nome_produto,
        tipo_unidade_produto,
        ncm,
        quantidade,
      ],
    );

    const idProduto = result[0].id_produto;

    // Pegando a data atual no fuso horário local
    const dataAtual = new Date();
    const dataLocal = new Date(
      dataAtual.getTime() - dataAtual.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .split("T")[0];

    // Adiciona um registro de entrada na tabela 'registro_entrada'
    await pool.query(
      "INSERT INTO registro_entrada (id_produto, data_entrada, quantidade, descricao) VALUES ($1, $2, $3, $4)",
      [idProduto, dataLocal, quantidade, "registro entrada inicial"],
    );

    res.status(201).json({ message: "Produto adicionado com sucesso!" });
  } catch (error) {
    console.error("Erro ao adicionar produto:", error);
    res.status(500).json({ error: "Erro ao adicionar produto." });
  }
});

// Rota para obter todos os produtos (id_produto e sigla)
app.get("/api/est", Autenticado, async (req, res) => {
  try {
    const { rows: labs } = await pool.query(
      "SELECT id_produto, sigla FROM produto",
    );
    res.json(labs);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    res.status(500).json({ message: "Erro ao buscar produtos" });
  }
});
// Obter todos os produtos com paginação
app.get("/api/produtoPag", Autenticado, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  // Converter page e limit para inteiros
  const pageInt = parseInt(page, 10);
  const limitInt = parseInt(limit, 10);

  if (isNaN(pageInt) || isNaN(limitInt) || limitInt <= 0 || pageInt <= 0) {
    return res.status(400).json({
      error:
        "Os parâmetros de página e limite devem ser números inteiros positivos.",
    });
  }

  // Limite máximo para o número de itens por página
  const MAX_LIMIT = 100;
  const finalLimit = limitInt > MAX_LIMIT ? MAX_LIMIT : limitInt;

  const offset = (pageInt - 1) * finalLimit;

  try {
    // Usando pool de conexões para consultas
    const { rows } = await pool.query(
      `
            SELECT sigla, concentracao, densidade, nome_produto, quantidade, tipo_unidade_produto, ncm
            FROM produto
            LIMIT $1 OFFSET $2`,
      [finalLimit, offset],
    );

    // Conta o total de registros
    const { rows: countResult } = await pool.query(
      "SELECT COUNT(*) as total FROM produto",
    );
    const totalItems = parseInt(countResult[0].total, 10);
    const totalPages = Math.ceil(totalItems / finalLimit);

    res.json({
      data: rows,
      totalItems,
      totalPages,
      currentPage: pageInt,
    });
  } catch (error) {
    console.error("Erro ao obter produtos:", error);
    res.status(500).json({ error: "Erro no servidor ao obter produtos." });
  }
});

// Rota para obter um produto específico pelo sigla
app.get("/api/produto/:sigla", Autenticado, async (req, res) => {
  const sigla = req.params.sigla;
  console.log("Sigla recebida:", sigla);

  try {
    const { rows } = await pool.query(
      "SELECT * FROM produto WHERE sigla = $1",
      [sigla],
    );

    // Verifica se algum produto foi encontrado
    if (rows.length === 0) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    res.json(rows);
  } catch (error) {
    console.error("Erro ao carregar produto:", error);
    res.status(500).json({ error: "Erro ao carregar produto" });
  }
});

app.get("/generate-pdf-produto", Autenticado, async (req, res) => {
  try {
    // Consulta para obter produtos usando pool de PostgreSQL
    const { rows: produtos } = await pool.query(
      "SELECT nome_produto, concentracao, densidade, quantidade, tipo_unidade_produto, ncm FROM produto ORDER BY nome_produto ASC",
    );

    // Configuração do PDF
    const doc = new PDFDocument({ margin: 50 });
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0]; // data como YYYY-MM-DD
    const formattedTime = today.toTimeString().split(" ")[0]; // hora como HH:MM:SS
    const fileName = "Relatorio_produto.pdf";

    // Configurações de cabeçalho de resposta
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    doc.pipe(res); // Envia o PDF para o cliente

    // Adicionar imagem do logo
    const logoPath = path.join(
      __dirname,
      "../src/public/images/logoRelatorio.jpg",
    );
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 150 });
    }

    // Título do relatório
    doc.fontSize(16).text("Relatório de Produto", { align: "center" });
    doc.moveDown();

    // Data e hora
    doc.fontSize(12).text(`Data: ${formattedDate}`, { align: "center" });
    doc.text(`Hora: ${formattedTime}`, { align: "center" });
    doc.moveDown();

    // Configurações da tabela
    const tableTop = 150;
    const itemHeight = 20;
    const columnWidths = [130, 80, 80, 80, 90, 100]; // Largura das colunas
    let yPosition = tableTop;

    // Função para desenhar os cabeçalhos da tabela
    const drawTableHeaders = () => {
      doc.fontSize(10).text("Nome do Produto", 50, yPosition);
      doc.text("Concentração", 50 + columnWidths[0], yPosition);
      doc.text("Densidade", 50 + columnWidths[0] + columnWidths[1], yPosition);
      doc.text(
        "Quantidade",
        50 + columnWidths[0] + columnWidths[1] + columnWidths[2],
        yPosition,
      );
      doc.text(
        "Tipo de Unidade",
        50 +
        columnWidths[0] +
        columnWidths[1] +
        columnWidths[2] +
        columnWidths[3],
        yPosition,
      );
      doc.text(
        "NCM",
        50 +
        columnWidths[0] +
        columnWidths[1] +
        columnWidths[2] +
        columnWidths[3] +
        columnWidths[4],
        yPosition,
      );
      yPosition += itemHeight;
    };

    // Função para desenhar uma linha da tabela
    const drawTableRow = (item) => {
      if (yPosition + itemHeight > doc.page.height - 50) {
        // Verifica se precisa adicionar uma nova página
        doc.addPage();
        yPosition = tableTop; // Reseta a posição Y
        drawTableHeaders(); // Redesenha os cabeçalhos
      }

      doc.text(item.nome_produto, 50, yPosition, { width: columnWidths[0] });
      doc.text(item.concentracao, 50 + columnWidths[0], yPosition, {
        width: columnWidths[1],
      });
      doc.text(
        item.densidade,
        50 + columnWidths[0] + columnWidths[1],
        yPosition,
        { width: columnWidths[2] },
      );
      doc.text(
        item.quantidade,
        50 + columnWidths[0] + columnWidths[1] + columnWidths[2],
        yPosition,
        { width: columnWidths[3] },
      );
      doc.text(
        item.tipo_unidade_produto,
        50 +
        columnWidths[0] +
        columnWidths[1] +
        columnWidths[2] +
        columnWidths[3],
        yPosition,
        { width: columnWidths[4] },
      );
      doc.text(
        item.ncm,
        50 +
        columnWidths[0] +
        columnWidths[1] +
        columnWidths[2] +
        columnWidths[3] +
        columnWidths[4],
        yPosition,
        { width: columnWidths[5] },
      );
      yPosition += itemHeight;
    };

    // Desenhar cabeçalhos
    drawTableHeaders();

    // Desenhar linhas da tabela
    produtos.forEach((item) => {
      drawTableRow(item);
    });

    doc.end(); // Finaliza o PDF
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    res.status(500).json({ error: "Erro ao gerar PDF" });
  }
});

app.get("/generate-pdf-entradatipo2", Autenticado, async (req, res) => {
  const { start_date, end_date } = req.query;

  let sqlQuery = `
        SELECT 
            re.data_entrada, 
            e.nome_produto, 
            re.quantidade,
            re.descricao
        FROM 
            registro_entrada re
        JOIN 
            produto e ON re.id_produto = e.id_produto
    `;

  const queryParams = [];
  if (start_date && end_date) {
    sqlQuery += " WHERE re.data_entrada BETWEEN $1 AND $2";
    queryParams.push(start_date, end_date); // No PostgreSQL, usamos $1, $2 para parâmetros
  }

  sqlQuery += " ORDER BY re.data_entrada DESC";

  try {
    const { rows: registraEntrada } = await pool.query(sqlQuery, queryParams);

    const doc = new PDFDocument({ margin: 50 });
    const today = new Date();
    const formattedDate = today.toLocaleDateString("pt-BR");
    const formattedTime = today.toLocaleTimeString("pt-BR");
    const fileName = `Relatorio_Entrada.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // Adicionar logo
    const logoPath = path.join(
      __dirname,
      "../src/public/images/logoRelatorio.jpg",
    );
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 100 });
    }

    // Título do relatório
    doc.fontSize(16).text("Relatório de Entrada", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Data: ${formattedDate}`, { align: "center" });
    doc.text(`Hora: ${formattedTime}`, { align: "center" });
    doc.moveDown(2);

    // Configurações da tabela
    const tableTop = 150;
    const itemHeight = 20;
    const columnWidths = [120, 180, 100, 200]; // Ajustar para 4 colunas (incluindo descricao)
    let yPosition = tableTop;

    // Função para desenhar os cabeçalhos da tabela
    const drawTableHeaders = () => {
      doc.fontSize(10).text("Data Entrada", 50, yPosition);
      doc.text("Nome Produto", 50 + columnWidths[0], yPosition);
      doc.text("Quantidade", 50 + columnWidths[0] + columnWidths[1], yPosition);
      doc.text(
        "Descrição",
        50 + columnWidths[0] + columnWidths[1] + columnWidths[2],
        yPosition,
      ); // Novo cabeçalho para Descrição
      yPosition += itemHeight;
    };

    // Função para desenhar uma linha da tabela
    const drawTableRow = (item) => {
      const formattedDataEntrada = new Date(
        item.data_entrada,
      ).toLocaleDateString("pt-BR");
      if (yPosition + itemHeight > doc.page.height - 50) {
        doc.addPage();
        yPosition = tableTop; // Reseta a posição Y para a nova página
        drawTableHeaders(); // Redesenha os cabeçalhos na nova página
      }

      doc.text(formattedDataEntrada, 50, yPosition, { width: columnWidths[0] });
      doc.text(item.nome_produto, 50 + columnWidths[0], yPosition, {
        width: columnWidths[1],
      });
      doc.text(
        item.quantidade,
        50 + columnWidths[0] + columnWidths[1],
        yPosition,
        { width: columnWidths[2] },
      );
      doc.text(
        item.descricao,
        50 + columnWidths[0] + columnWidths[1] + columnWidths[2],
        yPosition,
        { width: columnWidths[3] },
      ); // Adiciona Descrição
      yPosition += itemHeight;
    };

    // Desenhar cabeçalhos inicialmente
    drawTableHeaders();

    // Desenhar as linhas
    registraEntrada.forEach((item) => {
      drawTableRow(item);
    });

    doc.end();
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    res
      .status(500)
      .json({ error: "Erro ao gerar PDF. Tente novamente mais tarde." });
  }
});

app.get("/generate-pdf-consumo", Autenticado, async (req, res) => {
  try {
    const { start_date, end_date, laboratorio } = req.query;

    // Log dos parâmetros recebidos para debugging
    console.log("Parâmetros recebidos:", { start_date, end_date, laboratorio });

    // Base da consulta SQL
    let sqlQuery = `
            SELECT 
                rc.id_consumo, 
                rc.data_consumo, 
                e.sigla, 
                e.nome_produto, 
                l.nome_laboratorio, 
                rc.quantidade, 
                e.tipo_unidade_produto, 
                rc.descricao 
            FROM 
                registro_consumo rc 
            JOIN 
                produto e ON rc.id_produto = e.id_produto 
            JOIN 
                laboratorio l ON rc.id_laboratorio = l.id_laboratorio
        `;

    const queryParams = [];

    // Adiciona filtros de data
    if (start_date && end_date) {
      sqlQuery += " WHERE rc.data_consumo BETWEEN $1 AND $2";
      queryParams.push(start_date, end_date);
    }

    // Filtro de laboratório
    if (laboratorio && laboratorio !== "todos") {
      sqlQuery += queryParams.length
        ? " AND rc.id_laboratorio = $3"
        : " WHERE rc.id_laboratorio = $3";
      queryParams.push(laboratorio);
    }

    sqlQuery += " ORDER BY rc.data_consumo DESC";

    console.log("Consulta SQL:", sqlQuery);
    console.log("Parâmetros da consulta:", queryParams);

    // Executa a consulta usando o pool PostgreSQL
    const { rows: registroConsumo } = await pool.query(sqlQuery, queryParams);

    if (registroConsumo.length === 0) {
      console.log("Nenhum dado encontrado.");
      return res.status(404).json({ message: "Nenhum dado encontrado" });
    }

    const doc = new PDFDocument({ margin: 50 });
    const today = new Date();
    const formattedDate = today.toLocaleDateString("pt-BR");
    const formattedTime = today.toLocaleTimeString("pt-BR");
    const fileName = `Relatorio_Consumo.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // Adiciona logo
    const logoPath = path.join(
      __dirname,
      "../src/public/images/logoRelatorio.jpg",
    );
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 100 });
    } else {
      console.warn("Logo não encontrado, continuando sem logo.");
    }

    // Título
    doc.fontSize(16).text("Relatório de Consumo", { align: "center" });
    doc.fontSize(12).text(`Data: ${formattedDate}`, { align: "center" });
    doc.text(`Hora: ${formattedTime}`, { align: "center" });
    doc.moveDown(2);

    // Configuração da tabela
    const tableTop = 150;
    const itemHeight = 20;
    const columnWidths = [70, 90, 70, 110, 50, 70, 70];
    const pageHeight = doc.page.height - 50;
    let yPosition = tableTop;

    // Função para desenhar os cabeçalhos da tabela
    const drawTableHeaders = () => {
      doc.fontSize(8).text("Data Consumo", 50, yPosition);
      doc.text("Sigla", 50 + columnWidths[0], yPosition);
      doc.text("Produto", 50 + columnWidths[0] + columnWidths[1], yPosition);
      doc.text(
        "Laboratório",
        50 + columnWidths[0] + columnWidths[1] + columnWidths[2],
        yPosition,
      );
      doc.text(
        "Quantidade",
        50 +
        columnWidths[0] +
        columnWidths[1] +
        columnWidths[2] +
        columnWidths[3],
        yPosition,
      );
      doc.text(
        "Tipo de Unidade",
        50 +
        columnWidths[0] +
        columnWidths[1] +
        columnWidths[2] +
        columnWidths[3] +
        columnWidths[4],
        yPosition,
      );
      doc.text(
        "Descrição",
        50 +
        columnWidths[0] +
        columnWidths[1] +
        columnWidths[2] +
        columnWidths[3] +
        columnWidths[4] +
        columnWidths[5],
        yPosition,
      );
      yPosition += itemHeight;
    };

    // Função para desenhar uma linha da tabela
    const drawTableRow = (item) => {
      if (yPosition + itemHeight > pageHeight) {
        doc.addPage();
        yPosition = 50;
        drawTableHeaders();
      }

      const formattedDataConsumo = new Date(
        item.data_consumo,
      ).toLocaleDateString("pt-BR");
      doc.text(formattedDataConsumo, 50, yPosition, { width: columnWidths[0] });
      doc.text(item.sigla, 50 + columnWidths[0], yPosition, {
        width: columnWidths[1],
      });
      doc.text(
        item.nome_produto,
        50 + columnWidths[0] + columnWidths[1],
        yPosition,
        { width: columnWidths[2] },
      );
      doc.text(
        item.nome_laboratorio,
        50 + columnWidths[0] + columnWidths[1] + columnWidths[2],
        yPosition,
        { width: columnWidths[3] },
      );
      doc.text(
        item.quantidade,
        50 +
        columnWidths[0] +
        columnWidths[1] +
        columnWidths[2] +
        columnWidths[3],
        yPosition,
        { width: columnWidths[4] },
      );
      doc.text(
        item.tipo_unidade_produto,
        50 +
        columnWidths[0] +
        columnWidths[1] +
        columnWidths[2] +
        columnWidths[3] +
        columnWidths[4],
        yPosition,
        { width: columnWidths[5] },
      );
      doc.text(
        item.descricao,
        50 +
        columnWidths[0] +
        columnWidths[1] +
        columnWidths[2] +
        columnWidths[3] +
        columnWidths[4] +
        columnWidths[5],
        yPosition,
        { width: columnWidths[6] },
      );

      yPosition += itemHeight;
    };

    drawTableHeaders();
    registroConsumo.forEach((item) => drawTableRow(item));

    doc.end();
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    res.status(500).json({ error: "Erro ao gerar PDF" });
  }
});

// Endpoint para registrar entrada (versão PostgreSQL com atualização de quantidade)
app.post("/api/registrar_entrada", Autenticado, async (req, res) => {
  const { id_produto, quantidade, data_entrada, descricao } = req.body;

  // Validação simples
  if (!id_produto || !quantidade || !data_entrada) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    // Passo 1: Buscar a quantidade atual do produto
    const produtoResult = await pool.query(
      "SELECT quantidade FROM produto WHERE id_produto = $1",
      [id_produto],
    );

    if (produtoResult.rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    const quantidadeAtual = produtoResult.rows[0].quantidade;

    // Passo 2: Somar a nova quantidade
    const novaQuantidade = parseFloat(quantidadeAtual) + parseFloat(quantidade);

    // Passo 3: Atualizar a quantidade do produto
    await pool.query(
      "UPDATE produto SET quantidade = $1 WHERE id_produto = $2",
      [novaQuantidade, id_produto],
    );

    // Passo 4: Inserir o registro de entrada
    await pool.query(
      "INSERT INTO registro_entrada (id_produto, quantidade, data_entrada, descricao) VALUES ($1, $2, $3, $4)",
      [id_produto, quantidade, data_entrada, descricao],
    );

    res.json({
      message: "Entrada registrada e quantidade atualizada com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao registrar entrada:", error);
    res.status(500).json({ error: "Erro ao registrar entrada." });
  }
});

// Endpoint para registrar consumo com atualização da quantidade (PostgreSQL)
app.post("/api/registrar_consumo", Autenticado, async (req, res) => {
  console.log(req.body); // Log para depuração

  const { data_consumo, id_produto, id_laboratorio, quantidade, descricao } =
    req.body;

  // Validação simples
  if (!data_consumo || !id_produto || !id_laboratorio || !quantidade) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    // Passo 1: Buscar a quantidade atual do produto
    const produtoResult = await pool.query(
      "SELECT quantidade FROM produto WHERE id_produto = $1",
      [id_produto],
    );

    if (produtoResult.rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    const quantidadeAtual = parseFloat(produtoResult.rows[0].quantidade);

    // Passo 2: Verificar se há quantidade suficiente
    if (parseFloat(quantidade) > quantidadeAtual) {
      return res
        .status(400)
        .json({ error: "Quantidade insuficiente no produto." });
    }

    // Passo 3: Calcular a nova quantidade
    const novaQuantidade = quantidadeAtual - parseFloat(quantidade);

    // Passo 4: Atualizar a quantidade do produto
    await pool.query(
      "UPDATE produto SET quantidade = $1 WHERE id_produto = $2",
      [novaQuantidade, id_produto],
    );

    // Passo 5: Registrar o consumo
    await pool.query(
      "INSERT INTO registro_consumo (data_consumo, id_produto, id_laboratorio, quantidade, descricao) VALUES ($1, $2, $3, $4, $5)",
      [data_consumo, id_produto, id_laboratorio, quantidade, descricao],
    );

    res.json({
      message: "Consumo registrado e quantidade atualizada com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao registrar consumo:", error);
    res.status(500).json({ error: "Erro ao registrar consumo." });
  }
});

// Endpoint para buscar consumos

app.get("/api/consumos", Autenticado, async (req, res) => {
  try {
    const { startDate, endDate, laboratorio } = req.query;

    // Validação do formato de data (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (
      (startDate && !dateRegex.test(startDate)) ||
      (endDate && !dateRegex.test(endDate))
    ) {
      return res
        .status(400)
        .json({ error: "As datas devem estar no formato YYYY-MM-DD." });
    }

    // Validação do intervalo de datas
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        error: "A data de início não pode ser posterior à data de término.",
      });
    }

    let query = `
      SELECT 
        rc.id_consumo, 
        rc.data_consumo, 
        e.sigla, 
        e.nome_produto, 
        l.nome_laboratorio, 
        rc.quantidade, 
        e.tipo_unidade_produto, 
        rc.descricao 
      FROM 
        registro_consumo rc 
      JOIN 
        produto e ON rc.id_produto = e.id_produto 
      JOIN 
        laboratorio l ON rc.id_laboratorio = l.id_laboratorio
    `;

    const params = [];
    const whereClauses = [];

    // Filtrar por intervalo de datas
    if (startDate && endDate) {
      whereClauses.push("rc.data_consumo BETWEEN $1 AND $2");
      params.push(startDate, endDate);
    }

    // Filtrar por laboratório
    if (laboratorio && laboratorio !== "todos") {
      whereClauses.push(`rc.id_laboratorio = $${params.length + 1}`);
      params.push(laboratorio);
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    query += " ORDER BY rc.data_consumo DESC;";

    // Executar a consulta
    const { rows: consumos } = await pool.query(query, params);

    // Retornar resultados
    res.json(consumos.length ? consumos : []); // Retornar array vazio se não houver resultados
  } catch (error) {
    console.error("Erro ao buscar consumos:", error);
    res.status(500).json({ error: "Erro ao buscar consumos" });
  }
});

// Endpoint para buscar siglas
app.get("/api/siglas", Autenticado, async (req, res) => {
  try {
    const { rows: siglas } = await pool.query(
      "SELECT id_produto, sigla FROM produto",
    );

    // Retorna um array vazio se não houver siglas
    res.json(siglas.length ? siglas : []);
  } catch (error) {
    console.error("Erro ao buscar siglas:", error);
    res.status(500).json({ error: "Erro ao buscar siglas." });
  }
});

app.post("/api/atualizar-responsavel", Autenticado, async (req, res) => {
  const { idLaboratorio, usuarioEmail } = req.body;

  if (!idLaboratorio || !usuarioEmail) {
    return res.status(400).json({
      error: "ID do laboratório e email do responsável são obrigatórios.",
    });
  }

  // Validação básica de formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(usuarioEmail)) {
    return res.status(400).json({ error: "Formato de email inválido." });
  }

  try {
    // Verificar se o usuário existe
    const userResult = await pool.query(
      "SELECT * FROM usuario WHERE email = $1",
      [usuarioEmail],
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "O email do usuário não existe." });
    }

    // Atualizar o responsável do laboratório
    const result = await pool.query(
      "UPDATE laboratorio SET usuario_email = $1 WHERE id_laboratorio = $2",
      [usuarioEmail, idLaboratorio],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Laboratório não encontrado." });
    }

    res.json({
      message: "Responsável atualizado com sucesso",
      updatedResponsible: usuarioEmail,
    });
  } catch (error) {
    console.error("Erro ao atualizar responsável:", error);
    res
      .status(500)
      .json({ error: "Erro no servidor ao atualizar responsável." });
  }
});

app.get("/api/produtoPag", Autenticado, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  // Converter page e limit para inteiros
  const pageInt = parseInt(page, 10);
  const limitInt = parseInt(limit, 10);

  if (isNaN(pageInt) || isNaN(limitInt) || limitInt <= 0 || pageInt <= 0) {
    return res.status(400).json({
      error:
        "Os parâmetros de página e limite devem ser números inteiros positivos.",
    });
  }

  // Limite máximo para o número de itens por página
  const MAX_LIMIT = 100;
  const finalLimit = Math.min(limitInt, MAX_LIMIT);

  const offset = (pageInt - 1) * finalLimit;

  try {
    // Consulta com paginação
    const [rows] = await connection.query(
      `
            SELECT sigla, concentracao, densidade, nome_produto, quantidade, tipo_unidade_produto, ncm
            FROM produto
            LIMIT ? OFFSET ?`,
      [finalLimit, offset],
    );

    // Conta o total de registros
    const [countResult] = await connection.query(
      "SELECT COUNT(*) as total FROM produto",
    );
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / finalLimit);

    res.json({
      data: rows,
      totalItems,
      totalPages,
      currentPage: pageInt,
    });
  } catch (error) {
    console.error("Erro ao obter produtos:", error);
    res.status(500).json({ error: "Erro no servidor ao obter produtos." });
  }
});

// Obter registros de entrada com filtros de data
// Obter registros de entrada sem paginação
app.get("/api/tabelaregistraentradaInico", Autenticado, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validação do formato de data (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (
      (startDate && !dateRegex.test(startDate)) ||
      (endDate && !dateRegex.test(endDate))
    ) {
      return res
        .status(400)
        .json({ error: "As datas devem estar no formato YYYY-MM-DD." });
    }

    let query = `
            SELECT 
                r.id_entrada, 
                r.data_entrada, 
                r.quantidade, 
                e.nome_produto, 
                r.descricao
            FROM registro_entrada r
            JOIN produto e ON r.id_produto = e.id_produto
        `;

    const params = [];
    if (startDate && endDate) {
      query += " WHERE r.data_entrada BETWEEN $1 AND $2"; // Usando placeholders do PostgreSQL
      params.push(startDate, endDate);
    }

    query += " ORDER BY r.data_entrada DESC";

    // Usando pool.query() para executar a consulta no PostgreSQL
    const { rows } = await pool.query(query, params); // Correção aqui

    res.json(rows);
  } catch (error) {
    console.error("Erro ao buscar registros de entrada:", error);
    res.status(500).json({ error: "Erro ao buscar registros de entrada" });
  }
});

app.get("/api/tabelaregistraentrada", Autenticado, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    // Validação de página e limite
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);

    if (isNaN(pageInt) || pageInt <= 0 || isNaN(limitInt) || limitInt <= 0) {
      return res.status(400).json({
        error:
          "Os parâmetros de página e limite devem ser números inteiros positivos.",
      });
    }

    // Limitar o limite de itens por página
    const MAX_LIMIT = 100;
    const finalLimit = limitInt > MAX_LIMIT ? MAX_LIMIT : limitInt;

    const offset = (pageInt - 1) * finalLimit;

    // Validação do formato das datas
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (
      (startDate && !dateRegex.test(startDate)) ||
      (endDate && !dateRegex.test(endDate))
    ) {
      return res
        .status(400)
        .json({ error: "As datas devem estar no formato YYYY-MM-DD." });
    }

    let query = `
      SELECT 
        r.id_entrada, 
        r.data_entrada, 
        r.quantidade, 
        e.nome_produto, 
        r.descricao
      FROM registro_entrada r
      JOIN produto e ON r.id_produto = e.id_produto
    `;

    const params = [];
    if (startDate && endDate) {
      query += " WHERE r.data_entrada BETWEEN $1 AND $2";
      params.push(startDate, endDate);
    }

    query += ` ORDER BY r.data_entrada DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(finalLimit, offset);

    // Executar a query para obter os dados
    const { rows } = await pool.query(query, params);

    // Obter o total de registros
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM registro_entrada r 
      JOIN produto e ON r.id_produto = e.id_produto
    `;

    const countParams = [];
    if (startDate && endDate) {
      countQuery += " WHERE r.data_entrada BETWEEN $1 AND $2";
      countParams.push(startDate, endDate);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalItems = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalItems / finalLimit);

    res.json({
      data: rows,
      totalItems,
      totalPages,
      currentPage: pageInt,
    });
  } catch (error) {
    console.error("Erro ao buscar registros de entrada:", error);
    res.status(500).json({ error: "Erro ao buscar registros de entrada" });
  }
});

app.get("/api/tabelaregistraConsumo", Autenticado, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    // Validação de página e limite
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);

    if (isNaN(pageInt) || pageInt <= 0 || isNaN(limitInt) || limitInt <= 0) {
      return res.status(400).json({
        error:
          "Os parâmetros de página e limite devem ser números inteiros positivos.",
      });
    }

    // Limitar o limite de itens por página
    const MAX_LIMIT = 100;
    const finalLimit = limitInt > MAX_LIMIT ? MAX_LIMIT : limitInt;

    const offset = (pageInt - 1) * finalLimit;

    // Validação de formato de data (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (
      (startDate && !dateRegex.test(startDate)) ||
      (endDate && !dateRegex.test(endDate))
    ) {
      return res
        .status(400)
        .json({ error: "As datas devem estar no formato YYYY-MM-DD." });
    }

    let query = `
            SELECT 
                rc.id_consumo, 
                rc.data_consumo, 
                e.sigla, 
                e.nome_produto, 
                l.nome_laboratorio, 
                rc.quantidade, 
                e.tipo_unidade_produto, 
                rc.descricao 
            FROM 
                registro_consumo rc 
            JOIN 
                produto e ON rc.id_produto = e.id_produto 
            JOIN 
                laboratorio l ON rc.id_laboratorio = l.id_laboratorio
        `;

    const params = [];
    if (startDate && endDate) {
      query += " WHERE rc.data_consumo BETWEEN $1 AND $2";
      params.push(startDate, endDate);
    }

    query += " ORDER BY rc.data_consumo DESC LIMIT $3 OFFSET $4";
    params.push(finalLimit, offset);

    const result = await pool.query(query, params); // Usando pool para execução da consulta

    // Contar o total de registros
    const countQuery = `
            SELECT COUNT(*) as total 
            FROM registro_consumo rc 
            JOIN produto e ON rc.id_produto = e.id_produto
            JOIN laboratorio l ON rc.id_laboratorio = l.id_laboratorio
            ${startDate && endDate ? "WHERE rc.data_consumo BETWEEN $1 AND $2" : ""}
        `;

    const countParams = startDate && endDate ? [startDate, endDate] : [];
    const countResult = await pool.query(countQuery, countParams); // Contando o total de registros

    const totalItems = countResult.rows[0].total;
    const totalPages = Math.ceil(totalItems / finalLimit);

    res.json({
      data: result.rows,
      totalItems,
      totalPages,
      currentPage: pageInt,
    });
  } catch (error) {
    console.error("Erro ao buscar registros de consumo:", error);
    res.status(500).json({ error: "Erro ao buscar registros de consumo" });
  }
});

app.post("/api/filter_records", Autenticado, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    // Verifica se as datas são fornecidas
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Data inicial e final são obrigatórias." });
    }

    // Validação de formato de data (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        error:
          "Formato de data inválido. Utilize a data no formato YYYY-MM-DD.",
      });
    }

    // Converte as datas para objetos Date
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ error: "Formato de data inválido." });
    }

    // Verifica se a data final é posterior à data inicial
    if (start > end) {
      return res
        .status(400)
        .json({ error: "A data final não pode ser anterior à data inicial." });
    }

    // Consulta para filtrar registros entre as datas
    const query = `
        SELECT r.id_entrada, r.data_entrada, r.quantidade, e.nome_produto, r.descricao
        FROM registro_entrada r
        JOIN produto e ON r.id_produto = e.id_produto
        WHERE r.data_entrada BETWEEN ? AND ?
        ORDER BY r.data_entrada DESC
      `;

    const [rows] = await pool.execute(query, [startDate, endDate]); // Alterado para usar pool

    // Retorna os registros encontrados
    res.status(200).json({
      status: "success",
      data: rows,
    });
  } catch (error) {
    console.error("Erro ao filtrar registros:", error);
    res.status(500).json({ error: "Erro ao filtrar registros." });
  }
});

app.get("/api/availability", Autenticado, async (req, res) => {
  try {
    const { date, labId } = req.query;
    const result = await pool.query(
      `SELECT h.hora_inicio 
             FROM aulas a
             JOIN horarios h ON a.id_horario = h.id_horario
             WHERE 
               a.data = $1 
               AND a.id_laboratorio = $2`,
      [date, labId],
    );
    const occupied = result.rows.map((r) => r.hora_inicio.slice(0, 5));
    res.json({ occupied });
  } catch (err) {
    console.error("Erro ao buscar disponibilidade:", err);
    res.status(500).json({ error: "Erro ao buscar disponibilidade" });
  }
});
app.post("/api/schedule", Autenticado, async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Você precisa estar logado." });
  }

  try {
    const professor_email = req.session.user.email;

    const {
      labId,
      date,
      hour,
      precisa_tecnico,
      link_roteiro,
      id_disciplina,
      numero_discentes,
    } = req.body;

    if (!labId || !date || !hour || !numero_discentes) {
      return res.status(400).json({ error: "Dados incompletos para o agendamento." });
    }

    const statusProfessor = await pool.query(
      "SELECT status FROM usuario WHERE email = $1",
      [professor_email],
    );
    if (statusProfessor.rowCount > 0 && statusProfessor.rows[0].status === "desativado") {
      return res.status(403).json({ error: "Sua conta está desativada. Você não tem permissão para solicitar agendamentos." });
    }

    const statusLaboratorio = await pool.query(
      `SELECT u.status 
       FROM laboratorio l
       JOIN usuario u ON l.usuario_email = u.email
       WHERE l.id_laboratorio = $1`,
      [labId],
    );
    if (statusLaboratorio.rowCount > 0 && statusLaboratorio.rows[0].status === "desativado") {
      return res.status(403).json({ error: "Não é possível agendar neste laboratório, pois o usuário responsável por ele está desativado." });
    }

    const dataAgendamento = new Date(`${date}T00:00:00`);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataMinima = new Date(hoje);
    dataMinima.setDate(hoje.getDate() + 4);

    if (dataAgendamento < dataMinima) {
      return res.status(400).json({ error: "O agendamento deve ser feito com pelo menos 4 dias de antecedência." });
    }

    const horario = await pool.query(
      "SELECT id_horario FROM horarios WHERE to_char(hora_inicio, 'HH24:MI') = $1",
      [hour],
    );
    if (horario.rowCount === 0) {
      return res.status(400).json({ error: "Horário inválido" });
    }
    const id_horario = horario.rows[0].id_horario;

    if (precisa_tecnico === true) {
      const tecnicoOcupado = await pool.query(
        `SELECT 1
         FROM aulas a
         JOIN laboratorio l ON a.id_laboratorio = l.id_laboratorio
         WHERE l.usuario_email = (SELECT usuario_email FROM laboratorio WHERE id_laboratorio = $1)
           AND a.data = $2
           AND a.id_horario = $3
           AND a.precisa_tecnico = true
           AND a.status IN ('analisando', 'autorizado')
         LIMIT 1`,
        [labId, date, id_horario],
      );

      if (tecnicoOcupado.rowCount > 0) {
        return res.status(400).json({ error: "O técnico responsável por este laboratório já está agendado para auxiliar em outra aula neste mesmo horário." });
      }
    }

    // 1. INSERE A AULA NO BANCO
    const result = await pool.query(
      `INSERT INTO aulas (professor_email, id_laboratorio, data, id_horario, precisa_tecnico, link_roteiro, id_disciplina, numero_discentes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [professor_email, labId, date, id_horario, precisa_tecnico, link_roteiro, id_disciplina, numero_discentes],
    );

    // 👇 2. NOVA LÓGICA DE AVISAR O TÉCNICO
    try {
      const emailQuery = await pool.query(`
        SELECT 
          prof.nome_usuario AS nome_professor,
          tec.nome_usuario AS nome_tecnico,
          tec.email AS email_tecnico,
          l.nome_laboratorio,
          d.nome_disciplina
        FROM laboratorio l
        JOIN usuario tec ON l.usuario_email = tec.email
        JOIN usuario prof ON prof.email = $1
        JOIN disciplina d ON d.id_disciplina = $2
        WHERE l.id_laboratorio = $3
      `, [professor_email, id_disciplina, labId]);

      if (emailQuery.rowCount > 0) {
        const info = emailQuery.rows[0];

        // Ajusta o formato da data para DD/MM/AAAA e evita erros de fuso horário
        const [ano, mes, dia] = date.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;

        const dadosEmail = {
          nome_professor: info.nome_professor,
          nome_tecnico: info.nome_tecnico,
          laboratorio: info.nome_laboratorio,
          disciplina: info.nome_disciplina,
          data: dataFormatada,
          horario: hour,
          precisa_tecnico: precisa_tecnico
        };

        console.log(`\n⏳ Avisando o técnico ${info.email_tecnico} sobre nova solicitação...`);
        await enviarEmailNovaSolicitacaoTecnico(info.email_tecnico, dadosEmail);
        console.log("✅ Email de nova solicitação enviado!");
      }
    } catch (erroEmail) {
      console.error("❌ ERRO AO AVISAR TÉCNICO NO EMAIL:");
      console.error(erroEmail);
    }

    res.status(201).json({ message: "Aula solicitada com sucesso!", aula: result.rows[0] });

  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Esse horário já está ocupado ou em análise neste laboratório" });
    }
    console.error("Erro ao solicitar aula:", err);
    res.status(500).json({ error: "Erro ao solicitar aula" });
  }
});
app.post("/api/schedule-recurring", Autenticado, async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Você precisa estar logado." });
  }

  const client = await pool.connect();

  try {
    const professor_email = req.session.user.email;
    const {
      labId,
      disciplinaId,
      diaDaSemana,
      dataInicio,
      dataFim,
      horarios,
      precisa_tecnico,
      link_roteiro,
      numero_discentes,
    } = req.body;

    if (
      !labId ||
      !disciplinaId ||
      !diaDaSemana ||
      !dataInicio ||
      !dataFim ||
      !horarios ||
      horarios.length === 0
    ) {
      return res.status(400).json({ error: "Dados incompletos." });
    }

    await client.query("BEGIN");

    const id_pedido = Math.floor(10000000 + Math.random() * 90000000);

    const datasParaAgendar = [];
    let dataAtual = new Date(dataInicio);
    const dataFinal = new Date(dataFim);

    while (dataAtual <= dataFinal) {
      if (dataAtual.getUTCDay() == diaDaSemana) {
        datasParaAgendar.push(new Date(dataAtual));
      }
      dataAtual.setUTCDate(dataAtual.getUTCDate() + 1);
    }

    if (datasParaAgendar.length === 0) {
      return res
        .status(400)
        .json({ error: "Nenhum dia correspondente no período." });
    }

    for (const data of datasParaAgendar) {
      for (const hora of horarios) {
        const horarioRes = await client.query(
          "SELECT id_horario FROM horarios WHERE to_char(hora_inicio, 'HH24:MI') = $1",
          [hora]
        );
        if (horarioRes.rowCount === 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: `Horário inválido: ${hora}` });
        }
        const id_horario = horarioRes.rows[0].id_horario;

        await client.query(
          `INSERT INTO aulas (
            professor_email, id_laboratorio, data, id_horario, precisa_tecnico, 
            link_roteiro, id_disciplina, numero_discentes, status, id_pedido, tipo_aula
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'analisando', $9, 'recorrente')`,
          [
            professor_email,
            labId,
            data,
            id_horario,
            precisa_tecnico,
            link_roteiro,
            disciplinaId,
            numero_discentes,
            id_pedido
          ]
        );
      }
    }

    // 1. SALVA TUDO NO BANCO DE DADOS PRIMEIRO
    await client.query("COMMIT");

    // 👇 2. NOVA LÓGICA DE AVISAR O TÉCNICO (UM ÚNICO EMAIL DE RESUMO)
    try {
      const emailQuery = await pool.query(`
        SELECT 
          prof.nome_usuario AS nome_professor,
          tec.nome_usuario AS nome_tecnico,
          tec.email AS email_tecnico,
          l.nome_laboratorio,
          d.nome_disciplina
        FROM laboratorio l
        JOIN usuario tec ON l.usuario_email = tec.email
        JOIN usuario prof ON prof.email = $1
        JOIN disciplina d ON d.id_disciplina = $2
        WHERE l.id_laboratorio = $3
      `, [professor_email, disciplinaId, labId]);

      if (emailQuery.rowCount > 0) {
        const info = emailQuery.rows[0];

        // Formata as datas para o padrão brasileiro DD/MM/AAAA
        const [anoI, mesI, diaI] = dataInicio.split('-');
        const [anoF, mesF, diaF] = dataFim.split('-');

        const dadosEmail = {
          nome_professor: info.nome_professor,
          nome_tecnico: info.nome_tecnico,
          laboratorio: info.nome_laboratorio,
          disciplina: info.nome_disciplina,
          dataInicio: `${diaI}/${mesI}/${anoI}`,
          dataFim: `${diaF}/${mesF}/${anoF}`,
          horarios: horarios.join(' e '), // Ex: "07:20 e 08:10"
          precisa_tecnico: precisa_tecnico
        };

        console.log(`\n⏳ Avisando o técnico ${info.email_tecnico} sobre agendamento RECORRENTE...`);
        await enviarEmailNovaSolicitacaoRecorrenteTecnico(info.email_tecnico, dadosEmail);
        console.log("✅ Email de nova solicitação recorrente enviado!");
      }
    } catch (erroEmail) {
      console.error("❌ ERRO AO AVISAR TÉCNICO NO EMAIL:");
      console.error(erroEmail);
    }

    // 3. AVISA O FRONTEND QUE DEU TUDO CERTO
    res.status(201).json({
      message: `${datasParaAgendar.length * horarios.length} aula(s) solicitada(s) com sucesso!`,
    });

  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "Conflito: Um ou mais horários já estão ocupados." });
    }
    console.error("Erro no agendamento recorrente:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  } finally {
    client.release();
  }
});

app.get("/api/requests", Autenticado, async (req, res) => {
  try {
    const { tecnico_email } = req.query;
    const query = `
            SELECT 
                a.id_aula, 
                u.nome_usuario AS professor, 
                l.nome_laboratorio, 
                d.nome_disciplina,
                a.link_roteiro,
                a.numero_discentes,
                a.data, 
                h.hora_inicio, 
                h.hora_fim,
                a.precisa_tecnico, 
                a.status,
                a.observacoes,
                a.tipo_aula,
                a.id_pedido 
            FROM aulas a
            JOIN usuario u ON a.professor_email = u.email
            JOIN laboratorio l ON a.id_laboratorio = l.id_laboratorio
            JOIN horarios h ON a.id_horario = h.id_horario
            LEFT JOIN disciplina d ON a.id_disciplina = d.id_disciplina
            WHERE 
                l.usuario_email = $1 
            ORDER BY 
                a.id_pedido DESC, a.data ASC, h.hora_inicio ASC
        `;
    const result = await pool.query(query, [tecnico_email]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar solicitações" });
  }
});

app.patch("/api/requests/:id", Autenticado, async (req, res) => {
  try {
    const { id } = req.params;
    const { novoStatus, observacoes } = req.body;

    if (!["autorizado", "nao_autorizado", "analisando"].includes(novoStatus)) {
      return res.status(400).json({ error: "Ação ou status inválido fornecido." });
    }

    // 1. Atualiza no Banco
    await pool.query(
      "UPDATE aulas SET status = $1, observacoes = $3 WHERE id_aula = $2",
      [novoStatus, id, observacoes || null],
    );

    // 👇 2. NOVA LÓGICA DE EMAIL COM RASTREADOR DE ERROS
    if (novoStatus === 'autorizado' || novoStatus === 'nao_autorizado') {
      const emailQuery = await pool.query(`
        SELECT a.professor_email, d.nome_disciplina, l.nome_laboratorio, a.data, h.hora_inicio 
        FROM aulas a
        JOIN disciplina d ON a.id_disciplina = d.id_disciplina
        JOIN laboratorio l ON a.id_laboratorio = l.id_laboratorio
        JOIN horarios h ON a.id_horario = h.id_horario
        WHERE a.id_aula = $1
      `, [id]);

      if (emailQuery.rowCount > 0) {
        const info = emailQuery.rows[0];
        const dadosAula = {
          disciplina: info.nome_disciplina,
          laboratorio: info.nome_laboratorio,
          data: new Date(info.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
          horario: info.hora_inicio.slice(0, 5)
        };

        console.log(`\n⏳ Tentando enviar email para: ${info.professor_email}...`);

        try {
          if (novoStatus === 'autorizado') {
            await enviarEmailAutorizacao(info.professor_email, dadosAula);
          } else {
            await enviarEmailRecusa(info.professor_email, dadosAula, observacoes);
          }
          console.log("✅ SUCESSO ABSOLUTO: O email foi entregue ao servidor do Google!");
        } catch (erroEmail) {
          console.error("❌ ERRO GRAVE NO NODEMAILER:");
          console.error(erroEmail);
        }
      }
    }

    res.json({ message: "Status da aula atualizado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno ao atualizar o status da aula." });
  }
});

// Endpoint para listar todas as aulas de um professor ou técnico
app.get("/api/my-classes", Autenticado, async (req, res) => {
  try {
    const { email } = req.query;
    const result = await pool.query(
      `SELECT 
         a.id_aula, l.nome_laboratorio, a.data, h.hora_inicio, 
         a.precisa_tecnico, a.status
       FROM aulas a
       JOIN laboratorio l ON a.id_laboratorio = l.id_laboratorio 
       JOIN horarios h ON a.id_horario = h.id_horario
       WHERE 
         a.professor_email = $1 
         OR (a.precisa_tecnico = true AND l.usuario_email = $1)`,
      [email],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar aulas:", err);
    res.status(500).json({ error: "Erro ao buscar aulas" });
  }
});

// Endpoint para o professor ver as suas próprias solicitações futuras
app.get("/api/minhas-solicitacoes", Autenticado, async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ error: "Utilizador não autenticado." });
    }
    const professor_email = req.session.user.email;

    await pool.query(
      `UPDATE aulas SET status = 'nao_autorizado' 
             WHERE professor_email = $1 AND status = 'analisando' AND data < CURRENT_DATE`,
      [professor_email],
    );

    const result = await pool.query(
      `SELECT 
                a.id_aula,
                a.id_pedido,
                a.tipo_aula,
                l.nome_laboratorio, 
                d.nome_disciplina,
                a.link_roteiro,
                a.numero_discentes, 
                a.observacoes,
                a.data, 
                h.hora_inicio, 
                h.hora_fim,
                a.precisa_tecnico, 
                a.status
            FROM aulas a
            JOIN laboratorio l ON a.id_laboratorio = l.id_laboratorio
            JOIN horarios h ON a.id_horario = h.id_horario
            JOIN disciplina d ON a.id_disciplina = d.id_disciplina
            WHERE 
                a.professor_email = $1 
                AND a.data >= CURRENT_DATE
            ORDER BY 
                a.data ASC, h.hora_inicio ASC`,
      [professor_email],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao processar as suas solicitações." });
  }
});

app.get("/api/dashboard/aulas-autorizadas", Autenticado, async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Não autenticado." });
  try {
    const professor_email = req.session.user.email;
    const result = await pool.query(
      `SELECT 
                l.nome_laboratorio, 
                d.nome_disciplina,
                a.link_roteiro,
                a.data, 
                h.hora_inicio, 
                h.hora_fim,
                a.precisa_tecnico -- <<< ADICIONADO AQUI
            FROM aulas a
            JOIN laboratorio l ON a.id_laboratorio = l.id_laboratorio
            JOIN horarios h ON a.id_horario = h.id_horario
            JOIN disciplina d ON a.id_disciplina = d.id_disciplina
            WHERE a.professor_email = $1 
              AND a.status = 'autorizado' 
              AND a.data >= CURRENT_DATE
            ORDER BY a.data ASC, h.hora_inicio ASC
            LIMIT 6`,
      [professor_email],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar aulas autorizadas." });
  }
});
// Endpoint para o painel "Meus Laboratórios"
app.get("/api/dashboard/meus-laboratorios", Autenticado, async (req, res) => {
  const user_email = req.session.user.email;
  const result = await pool.query(`
      SELECT l.id_laboratorio, l.nome_laboratorio 
      FROM laboratorio l
      JOIN laboratorio_usuario lu ON l.id_laboratorio = lu.id_laboratorio
      WHERE lu.usuario_email = $1 ORDER BY l.nome_laboratorio`, 
  [user_email]);
  res.json(result.rows);
});

// Endpoint para o painel do Técnico "Aulas no meu laboratório"
app.get("/api/aulas-meus-laboratorios", Autenticado, async (req, res) => {
  if (!req.session?.user?.email) {
    return res.status(401).json({ error: "Não autenticado." });
  }
  try {
    const tecnico_email = req.session.user.email;
    const query = `
            SELECT 
                l.nome_laboratorio, 
                prof.nome_usuario AS nome_professor, 
                d.nome_disciplina,
                a.link_roteiro,
                a.data, 
                h.hora_inicio, 
                h.hora_fim,
                a.precisa_tecnico,
                a.numero_discentes,
                a.observacoes,
                a.tipo_aula, 
                a.id_pedido  
            FROM aulas a
            JOIN laboratorio l ON a.id_laboratorio = l.id_laboratorio
            JOIN horarios h ON a.id_horario = h.id_horario
            JOIN usuario prof ON a.professor_email = prof.email
            LEFT JOIN disciplina d ON a.id_disciplina = d.id_disciplina
            JOIN laboratorio_usuario lu ON l.id_laboratorio = lu.id_laboratorio -- 👇 ADICIONADO
            WHERE 
                lu.usuario_email = $1 -- 👇 CORRIGIDO
                AND a.data >= CURRENT_DATE
                AND a.status = 'autorizado' 
            ORDER BY 
                a.data ASC, h.hora_inicio ASC
        `;
    const result = await pool.query(query, [tecnico_email]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar as aulas." });
  }
});
// Endpoint para buscar todos os horários possíveis cadastrados no banco
app.get("/api/horarios", Autenticado, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT hora_inicio, hora_fim FROM horarios ORDER BY hora_inicio ASC",
    );

    // Agora, formata para enviar um objeto com início e fim
    const horariosFormatados = result.rows.map((h) => ({
      inicio: h.hora_inicio.slice(0, 5), // "07:20"
      fim: h.hora_fim.slice(0, 5), // "08:10"
    }));

    res.json(horariosFormatados);
  } catch (err) {
    console.error("Erro ao buscar a lista de horários:", err);
    res.status(500).json({ error: "Erro ao buscar horários." });
  }
});
// Endpoint para buscar aulas autorizadas para o calendário por mês/ano

app.get("/api/calendario/aulas-autorizadas", Autenticado, async (req, res) => {
  if (!req.session?.user)
    return res.status(401).json({ error: "Não autenticado." });
  try {
    const professor_email = req.session.user.email;
    const { ano, mes } = req.query;

    if (!ano || !mes) {
      return res.status(400).json({ error: "Ano e mês são obrigatórios." });
    }

    const result = await pool.query(
      `SELECT 
                l.nome_laboratorio, 
                d.nome_disciplina,
                a.data, 
                h.hora_inicio, 
                h.hora_fim, 
                a.tipo_aula
            FROM aulas a
            JOIN laboratorio l ON a.id_laboratorio = l.id_laboratorio
            JOIN horarios h ON a.id_horario = h.id_horario
            JOIN disciplina d ON a.id_disciplina = d.id_disciplina
            WHERE a.professor_email = $1 
              AND a.status = 'autorizado' 
              AND EXTRACT(YEAR FROM a.data) = $2
              AND EXTRACT(MONTH FROM a.data) = $3
            ORDER BY a.data ASC, h.hora_inicio ASC`,
      [professor_email, ano, mes],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar aulas para o calendário:", err);
    res.status(500).json({ error: "Erro ao buscar aulas para o calendário." });
  }
});
app.get("/api/calendario/aulas-tecnico", Autenticado, async (req, res) => {
  if (!req.session?.user)
    return res.status(401).json({ error: "Não autenticado." });

  try {
    const tecnico_email = req.session.user.email;
    const { ano, mes } = req.query;

    if (!ano || !mes) {
      return res.status(400).json({ error: "Ano e mês são obrigatórios." });
    }

    const result = await pool.query(
      `SELECT 
                l.nome_laboratorio, 
                d.nome_disciplina,
                u.nome_usuario AS nome_professor,
                h.hora_inicio,
                h.hora_fim,
                a.tipo_aula,
                a.data
            FROM aulas a
            JOIN laboratorio l ON a.id_laboratorio = l.id_laboratorio
            JOIN horarios h ON a.id_horario = h.id_horario
            JOIN disciplina d ON a.id_disciplina = d.id_disciplina
            JOIN usuario u ON a.professor_email = u.email
            JOIN laboratorio_usuario lu ON l.id_laboratorio = lu.id_laboratorio
            WHERE lu.usuario_email = $1 -- <<< ALTERADO DE l.usuario_email PARA lu.usuario_email
              AND a.status = 'autorizado' 
              AND EXTRACT(YEAR FROM a.data) = $2
              AND EXTRACT(MONTH FROM a.data) = $3
            ORDER BY a.data ASC, h.hora_inicio ASC`,
      [tecnico_email, ano, mes],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar aulas para o calendário do técnico:", err);
    res.status(500).json({ error: "Erro ao buscar aulas para o calendário." });
  }
});

app.get("/api/disciplinas", Autenticado, async (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Não autenticado." });
  }
  try {
    const usuarioEmail = req.session.user.email;
    const tipoUsuario = req.session.user.tipo_usuario;

    let query = "";
    let values = [];

    if (tipoUsuario === "admin") {
      query = 'SELECT * FROM "disciplina" ORDER BY nome_disciplina, status';
    }
    else if (tipoUsuario === "professor") {
      query =
        'SELECT * FROM "disciplina" WHERE professor_email_responsavel = $1 ORDER BY nome_disciplina, status';
      values = [usuarioEmail];
    }
    else {
      return res.json([]);
    }

    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Erro ao buscar disciplinas no servidor." });
  }
});

app.post("/api/disciplinas", Autenticado, async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Não autenticado." });

  const { nome_disciplina, professor_email_responsavel } = req.body;

  if (!nome_disciplina || !professor_email_responsavel) {
    return res.status(400).json({
      error: "Nome da disciplina e e-mail do professor são obrigatórios.",
    });
  }

  try {
    const query = `
            INSERT INTO "disciplina" (nome_disciplina, professor_email_responsavel) 
            VALUES ($1, $2) 
            RETURNING *
        `;
    const result = await pool.query(query, [
      nome_disciplina,
      professor_email_responsavel,
    ]);

    res.status(201).json({
      message: "Disciplina adicionada com sucesso!",
      disciplina: result.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    if (err.code === "23503") {
      return res.status(400).json({
        error:
          "Erro: O professor com este e-mail não existe no cadastro de usuários.",
      });
    }
    res.status(500).json({ error: "Erro ao adicionar disciplina." });
  }
});

app.patch("/api/disciplinas/desativar/:id", Autenticado, async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Não autenticado." });

  const { id } = req.params;
  try {
    const query = `
            UPDATE "disciplina" 
            SET status = 'desativado' 
            WHERE id_disciplina = $1 
            RETURNING *
        `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Disciplina não encontrada." });
    }

    res.json({
      message: "Disciplina desativada com sucesso!",
      disciplina: result.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Erro ao desativar disciplina." });
  }
});

app.patch("/api/disciplinas/ativar/:id", Autenticado, async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Não autenticado." });

  const { id } = req.params;
  try {
    const query = `
            UPDATE "disciplina" 
            SET status = 'ativado' 
            WHERE id_disciplina = $1 
            RETURNING *
        `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Disciplina não encontrada." });
    }

    res.json({
      message: "Disciplina ativada com sucesso!",
      disciplina: result.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Erro ao ativar disciplina." });
  }
});
app.put("/api/agendamentos/:id/status", Autenticado, async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Você precisa estar logado." });
  }

  try {
    const { id } = req.params;
    const { status } = req.body;
    const professor_email = req.session.user.email;

    const verifyQuery = await pool.query(
      `SELECT id_aula FROM aulas 
       WHERE id_aula = $1 AND professor_email = $2 AND data >= CURRENT_DATE`,
      [id, professor_email],
    );

    if (verifyQuery.rowCount === 0) {
      return res.status(403).json({ error: "Você não tem permissão para cancelar esta aula, ou ela já ocorreu." });
    }

    const updateQuery = await pool.query(
      "UPDATE aulas SET status = $1 WHERE id_aula = $2 RETURNING *",
      [status, id],
    );

    // 👇 NOVA LÓGICA DE EMAIL DE CANCELAMENTO
    if (status === 'cancelado') {
      const emailQuery = await pool.query(`
        SELECT a.professor_email, d.nome_disciplina, l.nome_laboratorio, l.usuario_email AS tecnico_email, a.data, h.hora_inicio 
        FROM aulas a
        JOIN disciplina d ON a.id_disciplina = d.id_disciplina
        JOIN laboratorio l ON a.id_laboratorio = l.id_laboratorio
        JOIN horarios h ON a.id_horario = h.id_horario
        WHERE a.id_aula = $1
      `, [id]);

      if (emailQuery.rowCount > 0) {
        const info = emailQuery.rows[0];
        const dadosAula = {
          disciplina: info.nome_disciplina,
          laboratorio: info.nome_laboratorio,
          data: new Date(info.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
          horario: info.hora_inicio.slice(0, 5)
        };

        // Avisa o professor e o técnico sobre o cancelamento
        await enviarEmailCancelamento(info.professor_email, dadosAula).catch(e => console.error(e));
        await enviarEmailCancelamento(info.tecnico_email, dadosAula).catch(e => console.error(e));
      }
    }

    res.json({ message: "Agendamento cancelado com sucesso!", aula: updateQuery.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno ao processar o cancelamento." });
  }
});

app.get("/api/solicitacoes-analise-tecnico", Autenticado, async (req, res) => {
  try {
    if (!req.session?.user?.email) {
      return res.json({ total: 0 });
    }

    const email_tecnico = req.session.user.email;

    const result = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM aulas a
       JOIN laboratorio l ON a.id_laboratorio = l.id_laboratorio
       JOIN laboratorio_usuario lu ON l.id_laboratorio = lu.id_laboratorio
       WHERE lu.usuario_email = $1 AND a.status = 'analisando'`, 
      [email_tecnico]
    );

    res.json({ total: parseInt(result.rows[0].total) });
  } catch (err) {
    console.error("Erro na contagem de solicitacoes:", err);
    res.status(500).json({ total: 0 });
  }
});
app.get("/api/aulas-hoje", Autenticado, async (req, res) => {
  try {
    const email = req.session.user.email;
    const query = `
      SELECT 
        h.hora_inicio, 
        h.hora_fim, 
        d.nome_disciplina, 
        l.nome_laboratorio
      FROM aulas a
      JOIN horarios h ON a.id_horario = h.id_horario
      JOIN disciplina d ON a.id_disciplina = d.id_disciplina
      JOIN laboratorio l ON a.id_laboratorio = l.id_laboratorio
      WHERE a.professor_email = $1 
        AND a.data = CURRENT_DATE
        AND a.status = 'autorizado'
      ORDER BY h.hora_inicio ASC
    `;
    const result = await pool.query(query, [email]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar aulas de hoje." });
  }
});
/* ========================================================= */
/* -------------- SALAS DE AULA --------------------------- */
/* ========================================================= */

// 1. Obter todas as salas (Para carregar os selects sem paginação)
app.get("/api/salas", Autenticado, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id_sala, 
        s.nome_sala, 
        u.nome_usuario AS responsavel, 
        u.email AS responsavel_email
      FROM sala_de_aula s
      LEFT JOIN usuario u ON s.responsavel_email = u.email
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao obter salas:", error);
    res.status(500).json({ error: "Erro no servidor ao obter salas" });
  }
});

// 2. Obter salas com Paginação (Para montar a tabela HTML principal)
app.get("/api/salasPag", Autenticado, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageInt = parseInt(page, 10);
  const limitInt = parseInt(limit, 10);

  if (isNaN(pageInt) || isNaN(limitInt)) {
    return res.status(400).json({ error: "Os parâmetros de página e limite devem ser inteiros." });
  }

  const offset = (pageInt - 1) * limitInt;

  try {
    const result = await pool.query(`
        SELECT s.id_sala, s.nome_sala, u.email AS responsavel_email, u.nome_usuario
        FROM sala_de_aula s
        LEFT JOIN usuario u ON s.responsavel_email = u.email
        LIMIT $1 OFFSET $2
      `, [limitInt, offset]
    );

    const countResult = await pool.query("SELECT COUNT(*) as total FROM sala_de_aula");
    const totalItems = countResult.rows[0].total;
    const totalPages = Math.ceil(totalItems / limitInt);

    res.json({
      data: result.rows,
      totalItems,
      totalPages,
      currentPage: pageInt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro no servidor ao paginar salas" });
  }
});

// 3. Adicionar nova sala
app.post("/api/salas", Autenticado, async (req, res) => {
  try {
    const { nome_sala, responsavel_email } = req.body;

    if (!nome_sala || !responsavel_email) {
      return res.status(400).json({ error: "Nome da sala e email do responsável são obrigatórios." });
    }

    // Verificar se a sala já existe
    const result = await pool.query("SELECT * FROM sala_de_aula WHERE nome_sala = $1", [nome_sala]);
    if (result.rows.length > 0) {
      return res.status(400).json({ error: "Esse nome de sala já está em uso." });
    }

    // Inserir nova sala
    const insertResult = await pool.query(
      "INSERT INTO sala_de_aula (nome_sala, responsavel_email) VALUES ($1, $2) RETURNING id_sala",
      [nome_sala, responsavel_email]
    );

    res.status(201).json({
      message: "Sala de aula adicionada com sucesso!",
      id_sala: insertResult.rows[0].id_sala,
    });
  } catch (error) {
    console.error("Erro ao adicionar sala:", error);
    res.status(500).json({ error: "Erro ao adicionar sala." });
  }
});

// 4. Remover sala
app.delete("/api/salas/:id_sala", Autenticado, async (req, res) => {
  try {
    const { id_sala } = req.params;

    // Verifica se a sala existe
    const salaCheck = await pool.query("SELECT id_sala FROM sala_de_aula WHERE id_sala = $1", [id_sala]);
    if (salaCheck.rows.length === 0) {
      return res.status(404).json({ error: "Sala não encontrada." });
    }

    // Remove a sala
    await pool.query("DELETE FROM sala_de_aula WHERE id_sala = $1", [id_sala]);
    res.json({ message: "Sala de aula removida com sucesso!" });
  } catch (error) {
    console.error("Erro ao remover sala:", error);
    res.status(500).json({ error: "Erro ao remover sala" });
  }
});

// 5. Atualizar Responsável da Sala
app.post("/api/atualizar-responsavel-sala", Autenticado, async (req, res) => {
  const { idSala, responsavelEmail } = req.body;

  if (!idSala || !responsavelEmail) {
    return res.status(400).json({ error: "ID da sala e email do responsável são obrigatórios." });
  }

  try {
    // Verificar se o usuário existe
    const userResult = await pool.query("SELECT * FROM usuario WHERE email = $1", [responsavelEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "O email do usuário não existe." });
    }

    // Atualizar o responsável da sala
    const result = await pool.query(
      "UPDATE sala_de_aula SET responsavel_email = $1 WHERE id_sala = $2",
      [responsavelEmail, idSala]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Sala não encontrada." });
    }

    res.json({ message: "Responsável atualizado com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar responsável da sala:", error);
    res.status(500).json({ error: "Erro no servidor ao atualizar responsável." });
  }
});

app.post("/api/schedule-recurring-salas", Autenticado, async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Você precisa estar logado." });
  }

  const client = await pool.connect();

  try {
    const professor_email = req.session.user.email;
    const {
      salaId,
      disciplinaId,
      diaDaSemana,
      dataInicio,
      dataFim,
      horarios,
      precisa_tecnico,
      link_roteiro,
      numero_discentes,
    } = req.body;

    if (!salaId || !disciplinaId || !diaDaSemana || !dataInicio || !dataFim || !horarios || horarios.length === 0) {
      return res.status(400).json({ error: "Dados incompletos para agendar a sala." });
    }

    await client.query("BEGIN");

    const id_pedido = Math.floor(10000000 + Math.random() * 90000000);
    const datasParaAgendar = [];
    let dataAtual = new Date(dataInicio);
    const dataFinal = new Date(dataFim);

    while (dataAtual <= dataFinal) {
      if (dataAtual.getUTCDay() == diaDaSemana) {
        datasParaAgendar.push(new Date(dataAtual));
      }
      dataAtual.setUTCDate(dataAtual.getUTCDate() + 1);
    }

    if (datasParaAgendar.length === 0) {
      return res.status(400).json({ error: "Nenhum dia correspondente no período." });
    }

    for (const data of datasParaAgendar) {
      for (const hora of horarios) {
        const horarioRes = await client.query(
          "SELECT id_horario FROM horarios WHERE to_char(hora_inicio, 'HH24:MI') = $1",
          [hora]
        );
        if (horarioRes.rowCount === 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: `Horário inválido: ${hora}` });
        }
        const id_horario = horarioRes.rows[0].id_horario;

        await client.query(
          `INSERT INTO agendamento_salas (
            professor_email, id_sala, data, id_horario, precisa_tecnico, 
            link_roteiro, id_disciplina, numero_discentes, status, id_pedido, tipo_aula
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'analisando', $9, 'recorrente')`,
          [
            professor_email,
            salaId,
            data,
            id_horario,
            precisa_tecnico,
            link_roteiro,
            disciplinaId,
            numero_discentes,
            id_pedido
          ]
        );
      }
    }

    await client.query("COMMIT");

    try {
      const emailQuery = await pool.query(`
        SELECT 
          prof.nome_usuario AS nome_professor,
          resp.nome_usuario AS nome_responsavel,
          resp.email AS email_responsavel,
          s.nome_sala,
          d.nome_disciplina
        FROM sala_de_aula s
        JOIN usuario resp ON s.responsavel_email = resp.email
        JOIN usuario prof ON prof.email = $1
        JOIN disciplina d ON d.id_disciplina = $2
        WHERE s.id_sala = $3
      `, [professor_email, disciplinaId, salaId]);

      if (emailQuery.rowCount > 0) {
        const info = emailQuery.rows[0];
        const [anoI, mesI, diaI] = dataInicio.split('-');
        const [anoF, mesF, diaF] = dataFim.split('-');

        const dadosEmail = {
          nome_professor: info.nome_professor,
          nome_tecnico: info.nome_responsavel,
          laboratorio: info.nome_sala,
          disciplina: info.nome_disciplina,
          dataInicio: `${diaI}/${mesI}/${anoI}`,
          dataFim: `${diaF}/${mesF}/${anoF}`,
          horarios: horarios.join(' e '),
          precisa_tecnico: precisa_tecnico
        };

        console.log(`\n⏳ Avisando o responsável ${info.email_responsavel} sobre reserva da sala...`);
        await enviarEmailNovaSolicitacaoRecorrenteTecnico(info.email_responsavel, dadosEmail);
      }
    } catch (erroEmail) {
      console.error("❌ ERRO AO AVISAR RESPONSÁVEL DA SALA:");
      console.error(erroEmail);
    }

    res.status(201).json({
      message: `${datasParaAgendar.length * horarios.length} reserva(s) de sala solicitada(s) com sucesso!`,
    });

  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({ error: "Conflito: Um ou mais horários já estão ocupados nesta sala." });
    }
    console.error("Erro no agendamento de sala:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  } finally {
    client.release();
  }
});

// ROTA PARA O RESPONSÁVEL VER AS SOLICITAÇÕES DE SALA
app.get("/api/requests", Autenticado, async (req, res) => {
  try {
    const { tecnico_email } = req.query;
    const query = `
            SELECT 
                a.id_aula, 
                u.nome_usuario AS professor, 
                l.nome_laboratorio, 
                d.nome_disciplina,
                a.link_roteiro,
                a.numero_discentes,
                a.data, 
                h.hora_inicio, 
                h.hora_fim,
                a.precisa_tecnico, 
                a.status,
                a.observacoes,
                a.tipo_aula,
                a.id_pedido 
            FROM aulas a
            JOIN usuario u ON a.professor_email = u.email
            JOIN laboratorio l ON a.id_laboratorio = l.id_laboratorio
            JOIN horarios h ON a.id_horario = h.id_horario
            LEFT JOIN disciplina d ON a.id_disciplina = d.id_disciplina
            JOIN laboratorio_usuario lu ON l.id_laboratorio = lu.id_laboratorio -- 👇 ADICIONADO
            WHERE 
                lu.usuario_email = $1 -- 👇 CORRIGIDO PARA 'lu'
            ORDER BY 
                a.id_pedido DESC, a.data ASC, h.hora_inicio ASC
        `;
    const result = await pool.query(query, [tecnico_email]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar solicitações" });
  }
});

// ROTA PARA O RESPONSÁVEL AUTORIZAR/RECUSAR A SALA
app.patch("/api/requests-salas/:id", Autenticado, async (req, res) => {
  try {
    const { id } = req.params;
    const { novoStatus, observacoes } = req.body;

    if (!["autorizado", "nao_autorizado", "analisando"].includes(novoStatus)) {
      return res.status(400).json({ error: "Status inválido." });
    }

    // 1. Atualiza no Banco
    await pool.query(
      "UPDATE agendamento_salas SET status = $1, observacoes = $3 WHERE id_agendamento = $2",
      [novoStatus, id, observacoes || null],
    );

    // 2. Dispara o Email para o Professor
    if (novoStatus === 'autorizado' || novoStatus === 'nao_autorizado') {
      const emailQuery = await pool.query(`
        SELECT a.professor_email, d.nome_disciplina, s.nome_sala, a.data, h.hora_inicio 
        FROM agendamento_salas a
        JOIN disciplina d ON a.id_disciplina = d.id_disciplina
        JOIN sala_de_aula s ON a.id_sala = s.id_sala
        JOIN horarios h ON a.id_horario = h.id_horario
        WHERE a.id_agendamento = $1
      `, [id]);

      if (emailQuery.rowCount > 0) {
        const info = emailQuery.rows[0];
        const dadosAula = {
          disciplina: info.nome_disciplina,
          laboratorio: info.nome_sala, // Enviamos como laboratório para reaproveitar o template do email
          data: new Date(info.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
          horario: info.hora_inicio.slice(0, 5)
        };

        try {
          if (novoStatus === 'autorizado') {
            await enviarEmailAutorizacao(info.professor_email, dadosAula);
          } else {
            await enviarEmailRecusa(info.professor_email, dadosAula, observacoes);
          }
        } catch (erroEmail) {
          console.error("Erro ao enviar email de decisão da sala:", erroEmail);
        }
      }
    }

    res.json({ message: "Status da sala atualizado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno ao atualizar a sala." });
  }
});

/* ========================================================= */
/* -------------- DASHBOARD DE SALAS DE AULA --------------- */
/* ========================================================= */

// 1. Mostrar as salas que a pessoa é responsável
app.get("/api/dashboard/minhas-salas", Autenticado, async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: "Não autenticado." });
  try {
    const user_email = req.session.user.email;
    const result = await pool.query(
      `SELECT nome_sala FROM sala_de_aula WHERE responsavel_email = $1 ORDER BY nome_sala`,
      [user_email]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Erro ao buscar salas." }); }
});

// 2. Mostrar aulas nas salas que a pessoa é responsável (Lista)
app.get("/api/aulas-minhas-salas", Autenticado, async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: "Não autenticado." });
  try {
    const responsavel_email = req.session.user.email;
    const query = `
        SELECT 
            s.nome_sala, prof.nome_usuario AS nome_professor, d.nome_disciplina,
            a.link_roteiro, a.data, h.hora_inicio, h.hora_fim, a.precisa_tecnico,
            a.numero_discentes, a.observacoes, a.tipo_aula, a.id_pedido  
        FROM agendamento_salas a
        JOIN sala_de_aula s ON a.id_sala = s.id_sala
        JOIN horarios h ON a.id_horario = h.id_horario
        JOIN usuario prof ON a.professor_email = prof.email
        JOIN disciplina d ON a.id_disciplina = d.id_disciplina
        WHERE s.responsavel_email = $1 AND a.data >= CURRENT_DATE AND a.status = 'autorizado' 
        ORDER BY a.data ASC, h.hora_inicio ASC
    `;
    const result = await pool.query(query, [responsavel_email]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Erro ao buscar as aulas." }); }
});

// 3. Calendário do Professor (Salas)
app.get("/api/calendario/aulas-autorizadas-salas", Autenticado, async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: "Não autenticado." });
  try {
    const professor_email = req.session.user.email;
    const { ano, mes } = req.query;
    const result = await pool.query(`
        SELECT s.nome_sala, d.nome_disciplina, a.data, h.hora_inicio, h.hora_fim, a.tipo_aula
        FROM agendamento_salas a
        JOIN sala_de_aula s ON a.id_sala = s.id_sala
        JOIN horarios h ON a.id_horario = h.id_horario
        JOIN disciplina d ON a.id_disciplina = d.id_disciplina
        WHERE a.professor_email = $1 AND a.status = 'autorizado' 
          AND EXTRACT(YEAR FROM a.data) = $2 AND EXTRACT(MONTH FROM a.data) = $3
        ORDER BY a.data ASC, h.hora_inicio ASC`,
      [professor_email, ano, mes]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Erro calendário do professor." }); }
});

// 4. Calendário do Responsável (Salas)
app.get("/api/calendario/aulas-responsavel-salas", Autenticado, async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: "Não autenticado." });
  try {
    const responsavel_email = req.session.user.email;
    const { ano, mes } = req.query;
    const result = await pool.query(`
        SELECT s.nome_sala, d.nome_disciplina, u.nome_usuario AS nome_professor,
               h.hora_inicio, h.hora_fim, a.tipo_aula, a.data
        FROM agendamento_salas a
        JOIN sala_de_aula s ON a.id_sala = s.id_sala
        JOIN horarios h ON a.id_horario = h.id_horario
        JOIN disciplina d ON a.id_disciplina = d.id_disciplina
        JOIN usuario u ON a.professor_email = u.email
        WHERE s.responsavel_email = $1 AND a.status = 'autorizado' 
          AND EXTRACT(YEAR FROM a.data) = $2 AND EXTRACT(MONTH FROM a.data) = $3
        ORDER BY a.data ASC, h.hora_inicio ASC`,
      [responsavel_email, ano, mes]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Erro calendário responsável." }); }
});

// 5. Aulas de Hoje do Professor (Salas)
app.get("/api/aulas-hoje-salas", Autenticado, async (req, res) => {
  try {
    const email = req.session.user.email;
    const result = await pool.query(`
      SELECT h.hora_inicio, h.hora_fim, d.nome_disciplina, s.nome_sala
      FROM agendamento_salas a
      JOIN horarios h ON a.id_horario = h.id_horario
      JOIN disciplina d ON a.id_disciplina = d.id_disciplina
      JOIN sala_de_aula s ON a.id_sala = s.id_sala
      WHERE a.professor_email = $1 AND a.data = CURRENT_DATE AND a.status = 'autorizado'
      ORDER BY h.hora_inicio ASC
    `, [email]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Erro aulas de hoje." }); }
});

// 6. Solicitacões do Professor (Salas)
app.get("/api/minhas-solicitacoes-salas", Autenticado, async (req, res) => {
  try {
    const professor_email = req.session.user.email;

    // Auto-cancela as que ficaram no passado analisando
    await pool.query(`UPDATE agendamento_salas SET status = 'nao_autorizado' 
                      WHERE professor_email = $1 AND status = 'analisando' AND data < CURRENT_DATE`, [professor_email]);

    const result = await pool.query(`
        SELECT a.id_agendamento, a.id_pedido, a.tipo_aula, s.nome_sala, d.nome_disciplina,
               a.link_roteiro, a.numero_discentes, a.observacoes, a.data, h.hora_inicio, h.hora_fim,
               a.precisa_tecnico, a.status
        FROM agendamento_salas a
        JOIN sala_de_aula s ON a.id_sala = s.id_sala
        JOIN horarios h ON a.id_horario = h.id_horario
        JOIN disciplina d ON a.id_disciplina = d.id_disciplina
        WHERE a.professor_email = $1 AND a.data >= CURRENT_DATE
        ORDER BY a.data ASC, h.hora_inicio ASC`,
      [professor_email]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Erro solicitações." }); }
});

// 7. Rota de Cancelamento do Professor (Salas)
app.put("/api/agendamentos-salas/:id/status", Autenticado, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const professor_email = req.session.user.email;

    const verifyQuery = await pool.query(
      `SELECT id_agendamento FROM agendamento_salas WHERE id_agendamento = $1 AND professor_email = $2 AND data >= CURRENT_DATE`,
      [id, professor_email],
    );

    if (verifyQuery.rowCount === 0) return res.status(403).json({ error: "Não permitido." });

    const updateQuery = await pool.query("UPDATE agendamento_salas SET status = $1 WHERE id_agendamento = $2 RETURNING *", [status, id]);
    res.json({ message: "Agendamento cancelado com sucesso!" });
  } catch (err) { res.status(500).json({ error: "Erro cancelamento." }); }
});

/* ========================================================= */
/* -------------- CALENDÁRIO E AGENDAMENTO DE SALAS -------- */
/* ========================================================= */

// 2. Rota que o JavaScript chama para descobrir quais horários já estão ocupados no dia
app.get("/api/availability-salas", Autenticado, async (req, res) => {
  try {
    const { date, salaId } = req.query;

    const result = await pool.query(
      `SELECT h.hora_inicio 
       FROM agendamento_salas a
       JOIN horarios h ON a.id_horario = h.id_horario
       WHERE a.data = $1 AND a.id_sala = $2 AND a.status != 'cancelado'`,
      [date, salaId]
    );

    // Devolve uma lista só com as horinhas (ex: ["07:20", "08:10"])
    const occupied = result.rows.map((r) => r.hora_inicio.slice(0, 5));
    res.json({ occupied });
  } catch (err) {
    console.error("Erro ao buscar disponibilidade da sala:", err);
    res.status(500).json({ error: "Erro ao buscar disponibilidade" });
  }
});

// 3. Rota para Salvar o Agendamento de Dia Único (O formulário debaixo do calendário)
app.post("/api/schedule-salas", Autenticado, async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Você precisa estar logado." });
  }

  try {
    const professor_email = req.session.user.email;
    const { salaId, date, hour, precisa_tecnico, link_roteiro, disciplinaId, numero_discentes } = req.body;

    // 3.1. Descobre qual é o ID numérico desse horário (ex: "07:20" vira ID 1)
    const horario = await pool.query("SELECT id_horario FROM horarios WHERE to_char(hora_inicio, 'HH24:MI') = $1", [hour]);
    if (horario.rowCount === 0) {
      return res.status(400).json({ error: "Horário inválido" });
    }
    const id_horario = horario.rows[0].id_horario;

    // 3.2. Cria um número de pedido aleatório para manter o padrão do banco
    const id_pedido = Math.floor(10000000 + Math.random() * 90000000);

    // 3.3. Salva na tabela exclusiva de salas
    const result = await pool.query(
      `INSERT INTO agendamento_salas (professor_email, id_sala, data, id_horario, precisa_tecnico, link_roteiro, id_disciplina, numero_discentes, status, id_pedido, tipo_aula)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'analisando', $9, 'individual') RETURNING *`,
      [professor_email, salaId, date, id_horario, precisa_tecnico, link_roteiro, disciplinaId, numero_discentes, id_pedido]
    );

    // 3.4. Dispara o e-mail avisando o Responsável da Sala
    try {
      const emailQuery = await pool.query(`
        SELECT 
            prof.nome_usuario AS nome_professor, 
            resp.nome_usuario AS nome_responsavel, 
            resp.email AS email_responsavel, 
            s.nome_sala, 
            d.nome_disciplina
        FROM sala_de_aula s
        JOIN usuario resp ON s.responsavel_email = resp.email
        JOIN usuario prof ON prof.email = $1
        JOIN disciplina d ON d.id_disciplina = $2
        WHERE s.id_sala = $3
      `, [professor_email, disciplinaId, salaId]);

      if (emailQuery.rowCount > 0) {
        const info = emailQuery.rows[0];
        const [ano, mes, dia] = date.split('-');

        // Montamos o pacote de dados do e-mail
        const dadosEmail = {
          nome_professor: info.nome_professor,
          nome_tecnico: info.nome_responsavel,
          laboratorio: info.nome_sala, // Mandamos na variável laboratório para o template do email funcionar
          disciplina: info.nome_disciplina,
          data: `${dia}/${mes}/${ano}`,
          horario: hour,
          precisa_tecnico: precisa_tecnico
        };

        console.log(`⏳ Avisando responsável da sala (${info.email_responsavel}) sobre a reserva...`);
        await enviarEmailNovaSolicitacaoTecnico(info.email_responsavel, dadosEmail);
      }
    } catch (erroEmail) {
      console.error("❌ Erro ao notificar responsável:", erroEmail);
    }

    // 3.5. Responde para o Frontend que deu tudo certo
    res.status(201).json({ message: "Reserva de sala solicitada com sucesso!" });

  } catch (err) {
    // Se bater no erro 23505, é porque a sala já está ocupada e o banco bloqueou
    if (err.code === "23505") {
      return res.status(400).json({ error: "Esse horário já está ocupado nesta sala." });
    }
    console.error("Erro ao solicitar sala:", err);
    res.status(500).json({ error: "Erro ao solicitar sala." });
  }
});
export default app;
