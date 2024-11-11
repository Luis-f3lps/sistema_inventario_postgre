import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Criar o pool de conexões usando DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Necessário para conexões SSL em alguns ambientes de nuvem
  },
});

export default pool;
