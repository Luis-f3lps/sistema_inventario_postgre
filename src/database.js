import { Pool } from 'pg'; // Importando a classe Pool do pacote pg

// Criação da pool de conexões com o banco de dados PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST, // O host do banco de dados
  user: process.env.DB_USER, // Nome do usuário
  password: process.env.DB_PASSWORD, // Senha do usuário
  database: process.env.DB_NAME, // Nome do banco de dados
  port: process.env.DB_PORT, // Porta do banco de dados (opcional, padrão 5432)
  max: 10, // Limite de conexões na pool
  idleTimeoutMillis: 30000, // Tempo de espera por conexões ociosas
  connectionTimeoutMillis: 2000, // Tempo máximo para esperar uma conexão
});

// Exporta a pool para uso em outras partes da aplicação
export default pool;
