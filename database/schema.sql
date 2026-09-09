-- ============================================================
-- P.R.O.T.E.U.S. - Banco de Dados de Telemetria e Qualidade da Água
-- Sistema de Observação em Tempo Real e Telemetria de Eutrofização
-- ============================================================
-- Compatível com MariaDB / MySQL (Testado no DBeaver)
-- ============================================================

-- 1. TABELA DE ESTAÇÕES / LOCAIS DE MONITORAMENTO
CREATE TABLE IF NOT EXISTS estacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,           -- Ex: 'BRB-04', 'PNP-02', 'ARÇ-01'
    nome VARCHAR(100) NOT NULL,                   -- Ex: 'BRB-04 · Barbosa-SP'
    rio_local VARCHAR(150) NOT NULL,              -- Ex: 'Rio Tietê · Barbosa-SP'
    cidade VARCHAR(100) NOT NULL,                 -- Ex: 'Barbosa'
    estado VARCHAR(2) DEFAULT 'SP',               -- Ex: 'SP'
    latitude DECIMAL(10, 8) NOT NULL,             -- Coordenada Lat: -21.26620000
    longitude DECIMAL(11, 8) NOT NULL,            -- Coordenada Lng: -49.94820000
    bacia_hidrografica VARCHAR(100) DEFAULT 'Baixo Tietê',
    status_operacional VARCHAR(20) DEFAULT 'Ativo', -- 'Ativo', 'Manutenção', 'Inativo'
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. TABELA DE LEITURAS / TELEMETRIA DA QUALIDADE DA ÁGUA
CREATE TABLE IF NOT EXISTS leituras_telemetria (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    estacao_id INT NOT NULL,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Parâmetros Físico-Químicos Monitorados (CONAMA Nº 357/2005)
    ph DECIMAL(4, 2) NOT NULL,                   -- Potencial Hidrogeniônico (ex: 7.20)
    turbidez DECIMAL(6, 2) NOT NULL,             -- Turbidez em NTU (ex: 4.00)
    oxigenio_dissolvido DECIMAL(5, 2) NOT NULL,  -- OD em mg/L (ex: 8.60)
    temperatura DECIMAL(4, 2) NOT NULL,           -- Temperatura da água em °C (ex: 22.40)
    
    -- Métricas Calculadas pelo Algoritmo IRE
    ire DECIMAL(5, 2) NOT NULL,                   -- Índice de Risco de Eutrofização (0.00 a 100.00)
    nivel_risco VARCHAR(20) NOT NULL,             -- 'Excelente', 'Bom', 'Alerta', 'Crítico'
    cenario_tag VARCHAR(50),                      -- Ex: '[MOCK] ÁGUA IDEAL', 'ANOXIA', 'ENXURRADA'
    
    -- Metadados Opcionais do Hardware IoT (ESP32)
    bateria_nivel INT,                            -- Porcentagem de bateria (%)
    sinal_rssi INT,                               -- Força do sinal Wi-Fi/4G (dBm)

    FOREIGN KEY (estacao_id) REFERENCES estacoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DADOS INICIAIS (SEED) PARA TESTAR E VISUALIZAR NO DBEAVER
-- ============================================================

INSERT IGNORE INTO estacoes (id, codigo, nome, rio_local, cidade, estado, latitude, longitude, bacia_hidrografica)
VALUES 
(1, 'BRB-04', 'BRB-04 · Barbosa-SP', 'Rio Tietê · Barbosa-SP', 'Barbosa', 'SP', -21.26620000, -49.94820000, 'Baixo Tietê'),
(2, 'PNP-02', 'PNP-02 · Penápolis-SP', 'Res. Nova Avanhandava · Penápolis-SP', 'Penápolis', 'SP', -21.42850000, -50.07750000, 'Baixo Tietê'),
(3, 'ARÇ-01', 'ARÇ-01 · Araçatuba-SP', 'Rio Tietê · Araçatuba (Jupiá)', 'Araçatuba', 'SP', -21.20890000, -50.44020000, 'Baixo Tietê');

-- Inserção de Histórico Inicial de Telemetria
INSERT INTO leituras_telemetria (estacao_id, ph, turbidez, oxigenio_dissolvido, temperatura, ire, nivel_risco, cenario_tag)
VALUES 
(1, 7.20, 4.00, 8.60, 22.40, 15.30, 'Excelente', '[MOCK] ÁGUA IDEAL'),
(2, 8.40, 48.00, 3.80, 26.50, 58.70, 'Alerta', '[MOCK] ÁGUA REGULAR'),
(3, 9.20, 120.00, 1.10, 29.50, 89.40, 'Crítico', '[MOCK] ÁGUA RUIM / CRÍTICA');
