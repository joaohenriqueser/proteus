const { Pool } = require('pg');
require('dotenv').config();

// Pool de Conexões PostgreSQL NATIVO
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'postgres',
  max: 10
});

async function initPostgreSQL() {
  let client;
  try {
    client = await pool.connect();
    console.log(`✅ Conexão NATIVA com PostgreSQL na porta 5432 (Base '${process.env.DB_NAME || 'postgres'}') OK!`);

    // Criar tabela estacoes se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS estacoes (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(20) UNIQUE NOT NULL,
        nome VARCHAR(100) NOT NULL,
        rio_local VARCHAR(150) NOT NULL,
        cidade VARCHAR(100) NOT NULL,
        estado VARCHAR(2) DEFAULT 'SP',
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        bacia_hidrografica VARCHAR(100) DEFAULT 'Baixo Tietê',
        status_operacional VARCHAR(20) DEFAULT 'Ativo',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Criar tabela leituras_telemetria se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS leituras_telemetria (
        id BIGSERIAL PRIMARY KEY,
        estacao_id INT NOT NULL REFERENCES estacoes(id) ON DELETE CASCADE,
        data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        ph DECIMAL(4, 2) NOT NULL,
        turbidez DECIMAL(6, 2) NOT NULL,
        oxigenio_dissolvido DECIMAL(5, 2) NOT NULL,
        temperatura DECIMAL(4, 2) NOT NULL,
        ire DECIMAL(5, 2) NOT NULL,
        nivel_risco VARCHAR(20) NOT NULL,
        cenario_tag VARCHAR(50),
        bateria_nivel INT,
        sinal_rssi INT
      );
    `);

    // Inserir estacoes padrão se a tabela estiver vazia
    const res = await client.query('SELECT COUNT(*) AS total FROM estacoes');
    if (parseInt(res.rows[0].total, 10) === 0) {
      await client.query(`
        INSERT INTO estacoes (codigo, nome, rio_local, cidade, estado, latitude, longitude, bacia_hidrografica)
        VALUES 
        ('BRB-04', 'BRB-04 · Barbosa-SP', 'Rio Tietê · Barbosa-SP', 'Barbosa', 'SP', -21.26620000, -49.94820000, 'Baixo Tietê'),
        ('PNP-02', 'PNP-02 · Penápolis-SP', 'Res. Nova Avanhandava · Penápolis-SP', 'Penápolis', 'SP', -21.42850000, -50.07750000, 'Baixo Tietê'),
        ('ARÇ-01', 'ARÇ-01 · Araçatuba-SP', 'Rio Tietê · Araçatuba (Jupiá)', 'Araçatuba', 'SP', -21.20890000, -50.44020000, 'Baixo Tietê')
        ON CONFLICT (codigo) DO NOTHING;

        INSERT INTO leituras_telemetria (estacao_id, ph, turbidez, oxigenio_dissolvido, temperatura, ire, nivel_risco, cenario_tag)
        VALUES 
        (1, 7.20, 4.00, 8.60, 22.40, 15.30, 'Excelente', '[MOCK] ÁGUA IDEAL'),
        (2, 8.40, 48.00, 3.80, 26.50, 58.70, 'Alerta', '[MOCK] ÁGUA REGULAR'),
        (3, 9.20, 120.00, 1.10, 29.50, 89.40, 'Crítico', '[MOCK] ÁGUA RUIM / CRÍTICA');
      `);
      console.log('🌱 Dados iniciais (Seed) populados no PostgreSQL!');
    }
  } catch (err) {
    console.error('❌ Erro de conexão com PostgreSQL:', err.message);
    console.error('💡 Verifique se o serviço do PostgreSQL está ativo e a senha no backend/.env');
  } finally {
    if (client) client.release();
  }
}

initPostgreSQL();

module.exports = pool;
