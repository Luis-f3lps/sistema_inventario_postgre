import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'nova_senha',  // Garanta que esteja igual à senha usada no login direto
  database: process.env.DB_NAME || 'banco_dados_si',
  waitForConnections: true,
  connectionLimit: 10,  // Limite de conexões simultâneas
  queueLimit: 0         // Sem limite de filas de espera
});

export default pool;
