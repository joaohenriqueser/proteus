const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Função Server-side de Cálculo do IRE (Resolução CONAMA 357/2005)
 */
function calculateIRE(ph, turb, od, temp) {
  let sTurb = 20;
  if (turb <= 10) sTurb = 100;
  else if (turb <= 100) sTurb = 100 - 0.89 * (turb - 10);

  let spH = 100;
  if (ph >= 6.5 && ph <= 8.0) spH = 100;
  else if (ph > 8.5) spH = Math.max(0, 100 - 30 * (ph - 8.5));
  else if (ph < 6.0) spH = Math.max(0, 100 - 40 * (6.0 - ph));

  const fTemp = temp >= 25 ? 1.2 : 1.0;

  // FÓRMULA ATUALIZADA DO PROTEUS SEM OXIGÊNIO (Tri-paramétrica: 60% Turb, 40% pH)
  const iPonderado = (0.60 * sTurb) + (0.40 * spH);

  let ire = iPonderado / fTemp;
  ire = Math.min(100, Math.max(0, ire));

  let nivelRisco = 'Excelente';
  if (ire < 35) nivelRisco = 'Crítico';
  else if (ire < 55) nivelRisco = 'Alerta';
  else if (ire < 75) nivelRisco = 'Bom';

  return {
    ire: parseFloat(ire.toFixed(2)),
    nivelRisco,
    hasOD: false,
    formula: 'Atualizada PROTEUS (Sem OD - Tri-paramétrica)'
  };
}

/**
 * GET /api/telemetria/historico (RF13 - Suporte a período específico)
 */
router.get('/historico', async (req, res) => {
  try {
    const { estacao_id, limit = 100, data_inicio, data_fim } = req.query;
    let sql = `
      SELECT 
        t.id,
        t.estacao_id,
        e.codigo AS estacao_codigo,
        e.nome AS estacao_nome,
        t.data_hora,
        t.ph,
        t.turbidez,
        t.oxigenio_dissolvido,
        t.temperatura,
        t.ire,
        t.nivel_risco,
        t.cenario_tag
      FROM leituras_telemetria t
      JOIN estacoes e ON e.id = t.estacao_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (estacao_id) {
      const isNum = !isNaN(estacao_id);
      if (isNum) {
        sql += ` AND (e.codigo = $${paramIndex} OR e.id = $${paramIndex + 1})`;
        params.push(estacao_id, parseInt(estacao_id, 10));
        paramIndex += 2;
      } else {
        sql += ` AND e.codigo = $${paramIndex}`;
        params.push(estacao_id);
        paramIndex += 1;
      }
    }

    if (data_inicio) {
      sql += ` AND t.data_hora >= $${paramIndex}`;
      params.push(new Date(data_inicio));
      paramIndex += 1;
    }

    if (data_fim) {
      sql += ` AND t.data_hora <= $${paramIndex}`;
      params.push(new Date(data_fim));
      paramIndex += 1;
    }

    sql += ` ORDER BY t.data_hora DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit, 10));

    const { rows } = await db.query(sql, params);

    const formatted = rows.map(r => ({
      id: r.id,
      estacao_codigo: r.estacao_codigo,
      estacao_nome: r.estacao_nome,
      timestamp: r.data_hora,
      params: {
        ph: parseFloat(r.ph),
        turb: parseFloat(r.turbidez),
        od: parseFloat(r.oxigenio_dissolvido),
        temp: parseFloat(r.temperatura)
      },
      ire: parseFloat(r.ire),
      nivel_risco: r.nivel_risco,
      scenarioTag: r.cenario_tag
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error('Erro ao buscar histórico de telemetria no PostgreSQL:', err);
    res.status(500).json({ success: false, error: 'Erro ao buscar histórico de telemetria.' });
  }
});

/**
 * POST /api/telemetria (RF03 + RF10 - Geração Automática de Alertas)
 */
router.post('/', async (req, res) => {
  try {
    const { estacao_codigo, ph, turb, od, temp, cenario_tag, bateria_nivel, sinal_rssi } = req.body;

    if (!estacao_codigo || ph === undefined || turb === undefined || temp === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios ausentes: estacao_codigo, ph, turb e temp são requeridos.'
      });
    }

    const isNum = !isNaN(estacao_codigo);
    const estQuery = isNum 
      ? 'SELECT id, codigo, nome FROM estacoes WHERE codigo = $1 OR id = $2 LIMIT 1'
      : 'SELECT id, codigo, nome FROM estacoes WHERE codigo = $1 LIMIT 1';
    
    const estParams = isNum ? [estacao_codigo, parseInt(estacao_codigo, 10)] : [estacao_codigo];
    const estRes = await db.query(estQuery, estParams);

    if (estRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Estação '${estacao_codigo}' não encontrada no PostgreSQL.` });
    }
    const estacao = estRes.rows[0];
    const estacaoId = estacao.id;

    const odVal = (od !== undefined && od !== null && od !== '' && !isNaN(parseFloat(od))) ? parseFloat(od) : null;
    const calc = calculateIRE(parseFloat(ph), parseFloat(turb), odVal, parseFloat(temp));
    const ireValor = req.body.ire !== undefined ? parseFloat(req.body.ire) : calc.ire;
    const nivelRisco = req.body.nivel_risco || calc.nivelRisco;
    const scenarioTag = cenario_tag || (odVal !== null ? '[TELEMETRIA ESP32 + OD]' : '[TELEMETRIA ESP32 TRI-PARAM]');

    const sql = `
      INSERT INTO leituras_telemetria 
      (estacao_id, ph, turbidez, oxigenio_dissolvido, temperatura, ire, nivel_risco, cenario_tag, bateria_nivel, sinal_rssi)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, data_hora;
    `;

    const values = [
      estacaoId,
      parseFloat(ph),
      parseFloat(turb),
      odVal,
      parseFloat(temp),
      ireValor,
      nivelRisco,
      scenarioTag,
      bateria_nivel || null,
      sinal_rssi || null
    ];

    const { rows } = await db.query(sql, values);
    const medicaoId = rows[0].id;

    // Geração Automática de Alertas (RF10)
    const alertasGerados = [];
    const phNum = parseFloat(ph);
    const turbNum = parseFloat(turb);
    const tempNum = parseFloat(temp);

    // Validação CONAMA nº 357/2005 - Classe 2
    if (turbNum > 100) {
      const nivel = turbNum > 150 ? 'Crítico' : 'Atenção';
      alertasGerados.push({
        nivel,
        parametro: 'Turbidez',
        valor: turbNum,
        descricao: `Turbidez elevada de ${turbNum.toFixed(1)} NTU (acima do limite CONAMA de 100 NTU).`
      });
    }

    if (phNum < 6.0) {
      alertasGerados.push({
        nivel: 'Crítico',
        parametro: 'pH',
        valor: phNum,
        descricao: `pH ácido de ${phNum.toFixed(2)} (abaixo da faixa ideal CONAMA 6.0 - 9.0).`
      });
    } else if (phNum > 9.0) {
      alertasGerados.push({
        nivel: 'Crítico',
        parametro: 'pH',
        valor: phNum,
        descricao: `pH alcalino de ${phNum.toFixed(2)} (acima da faixa ideal CONAMA 6.0 - 9.0).`
      });
    }

    if (tempNum > 30.0) {
      alertasGerados.push({
        nivel: 'Atenção',
        parametro: 'Temperatura',
        valor: tempNum,
        descricao: `Temperatura elevada da água em ${tempNum.toFixed(1)} °C (acima do limite padrão de 30 °C).`
      });
    }

    if (ireValor < 40) {
      alertasGerados.push({
        nivel: 'Crítico',
        parametro: 'IRE',
        valor: ireValor,
        descricao: `Índice IRE Crítico (${ireValor.toFixed(1)}/100) - Condição propícia para proliferação de microalgas.`
      });
    }

    // Persistir alertas automáticos identificados no banco de dados
    for (const al of alertasGerados) {
      try {
        await db.query(
          `INSERT INTO alertas (estacao_id, medicao_id, nivel, descricao, parametro, valor_medido, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'Aberto')`,
          [estacaoId, medicaoId, al.nivel, al.descricao, al.parametro, al.valor]
        );
      } catch (alertErr) {
        console.warn('Aviso: Não foi possível salvar alerta automático:', alertErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Telemetria gravada com sucesso no PostgreSQL!',
      data: {
        id: rows[0].id,
        estacao_codigo,
        data_hora: rows[0].data_hora,
        params: { ph: phNum, turb: turbNum, od: odVal, temp: tempNum },
        ire: ireValor,
        nivel_risco: nivelRisco,
        formula_utilizada: calc.formula,
        scenarioTag,
        alertas_gerados: alertasGerados.length
      }
    });
  } catch (err) {
    console.error('Erro ao gravar telemetria:', err);
    res.status(500).json({ success: false, error: 'Erro ao gravar leitura no PostgreSQL.' });
  }
});

/**
 * GET /api/telemetria/relatorio (RF12 - Relatórios Consolidados com Base nos Dados)
 */
router.get('/relatorio', async (req, res) => {
  try {
    const { estacao_id, data_inicio, data_fim } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let pIdx = 1;

    if (estacao_id) {
      const isNum = !isNaN(estacao_id);
      if (isNum) {
        whereClause += ` AND (e.codigo = $${pIdx} OR e.id = $${pIdx + 1})`;
        params.push(estacao_id, parseInt(estacao_id, 10));
        pIdx += 2;
      } else {
        whereClause += ` AND e.codigo = $${pIdx}`;
        params.push(estacao_id);
        pIdx += 1;
      }
    }

    if (data_inicio) {
      whereClause += ` AND t.data_hora >= $${pIdx}`;
      params.push(new Date(data_inicio));
      pIdx += 1;
    }

    if (data_fim) {
      whereClause += ` AND t.data_hora <= $${pIdx}`;
      params.push(new Date(data_fim));
      pIdx += 1;
    }

    // Consulta de agregados estatísticos
    const statsQuery = `
      SELECT 
        COUNT(t.id) AS total_leituras,
        AVG(t.ire) AS avg_ire,
        MIN(t.ire) AS min_ire,
        MAX(t.ire) AS max_ire,
        AVG(t.ph) AS avg_ph,
        MIN(t.ph) AS min_ph,
        MAX(t.ph) AS max_ph,
        AVG(t.turbidez) AS avg_turb,
        MIN(t.turbidez) AS min_turb,
        MAX(t.turbidez) AS max_turb,
        AVG(t.temperatura) AS avg_temp,
        MIN(t.temperatura) AS min_temp,
        MAX(t.temperatura) AS max_temp,
        SUM(CASE WHEN t.ph >= 6.0 AND t.ph <= 9.0 AND t.turbidez <= 100 AND t.temperatura <= 30 THEN 1 ELSE 0 END) AS leituras_conformes,
        SUM(CASE WHEN t.nivel_risco = 'Excelente' THEN 1 ELSE 0 END) AS count_excelente,
        SUM(CASE WHEN t.nivel_risco = 'Bom' THEN 1 ELSE 0 END) AS count_bom,
        SUM(CASE WHEN t.nivel_risco = 'Alerta' THEN 1 ELSE 0 END) AS count_alerta,
        SUM(CASE WHEN t.nivel_risco = 'Crítico' THEN 1 ELSE 0 END) AS count_critico
      FROM leituras_telemetria t
      JOIN estacoes e ON e.id = t.estacao_id
      ${whereClause};
    `;

    const { rows } = await db.query(statsQuery, params);
    const s = rows[0];
    const total = parseInt(s.total_leituras || 0, 10);
    const conformes = parseInt(s.leituras_conformes || 0, 10);
    const taxaConformidade = total > 0 ? parseFloat(((conformes / total) * 100).toFixed(1)) : 100;

    // Buscar lista de estações abrangidas no relatório
    const estQuery = estacao_id 
      ? `SELECT id, codigo, nome, rio_local, cidade, bacia_hidrografica FROM estacoes WHERE codigo = $1 OR id = $2`
      : `SELECT id, codigo, nome, rio_local, cidade, bacia_hidrografica FROM estacoes LIMIT 10`;
    const estParams = estacao_id ? [estacao_id, !isNaN(estacao_id) ? parseInt(estacao_id, 10) : 0] : [];
    const estResult = await db.query(estQuery, estParams);

    res.json({
      success: true,
      geradoEm: new Date().toISOString(),
      periodo: {
        data_inicio: data_inicio || 'Início dos registros',
        data_fim: data_fim || 'Data atual'
      },
      estacoes: estResult.rows,
      estatisticas: {
        totalLeituras: total,
        taxaConformidadeConama: taxaConformidade,
        distribuicaoRisco: {
          excelente: parseInt(s.count_excelente || 0, 10),
          bom: parseInt(s.count_bom || 0, 10),
          alerta: parseInt(s.count_alerta || 0, 10),
          critico: parseInt(s.count_critico || 0, 10)
        },
        ire: {
          media: s.avg_ire ? parseFloat(parseFloat(s.avg_ire).toFixed(2)) : 0,
          min: s.min_ire ? parseFloat(parseFloat(s.min_ire).toFixed(2)) : 0,
          max: s.max_ire ? parseFloat(parseFloat(s.max_ire).toFixed(2)) : 0
        },
        ph: {
          media: s.avg_ph ? parseFloat(parseFloat(s.avg_ph).toFixed(2)) : 0,
          min: s.min_ph ? parseFloat(parseFloat(s.min_ph).toFixed(2)) : 0,
          max: s.max_ph ? parseFloat(parseFloat(s.max_ph).toFixed(2)) : 0,
          referencia: '6.0 a 9.0 (CONAMA Classe 2)'
        },
        turbidez: {
          media: s.avg_turb ? parseFloat(parseFloat(s.avg_turb).toFixed(2)) : 0,
          min: s.min_turb ? parseFloat(parseFloat(s.min_turb).toFixed(2)) : 0,
          max: s.max_turb ? parseFloat(parseFloat(s.max_turb).toFixed(2)) : 0,
          unidade: 'NTU',
          referencia: 'Até 100 NTU (CONAMA Classe 2)'
        },
        temperatura: {
          media: s.avg_temp ? parseFloat(parseFloat(s.avg_temp).toFixed(2)) : 0,
          min: s.min_temp ? parseFloat(parseFloat(s.min_temp).toFixed(2)) : 0,
          max: s.max_temp ? parseFloat(parseFloat(s.max_temp).toFixed(2)) : 0,
          unidade: '°C',
          referencia: 'Máxima 30 °C'
        }
      }
    });

  } catch (err) {
    console.error('Erro ao gerar relatório técnico:', err);
    res.status(500).json({ success: false, error: 'Erro ao compilar dados do relatório técnico.' });
  }
});

/**
 * GET /api/telemetria/resumo
 */
router.get('/resumo', async (req, res) => {
  try {
    const totalReadings = await db.query('SELECT COUNT(*) AS total FROM leituras_telemetria');
    const totalStations = await db.query('SELECT COUNT(*) AS total FROM estacoes');
    const avgIRE = await db.query('SELECT AVG(ire) AS media_ire FROM leituras_telemetria');

    res.json({
      success: true,
      data: {
        totalLeituras: parseInt(totalReadings.rows[0].total, 10),
        totalEstacoes: parseInt(totalStations.rows[0].total, 10),
        mediaIRE: avgIRE.rows[0].media_ire ? parseFloat(avgIRE.rows[0].media_ire).toFixed(2) : 0
      }
    });
  } catch (err) {
    console.error('Erro ao buscar resumo:', err);
    res.status(500).json({ success: false, error: 'Erro ao gerar resumo estatístico.' });
  }
});

module.exports = router;
