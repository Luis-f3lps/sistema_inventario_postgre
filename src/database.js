import pkg from 'pg'; // Importa o pacote pg
const { Pool } = pkg; // Desestruturação para acessar o Pool

// Criação da pool de conexões com o banco de dados PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined, // SSL configurado apenas se usar DATABASE_URL
});

export default pool;
