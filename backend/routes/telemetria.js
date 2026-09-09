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

  let sOD = 0;
  if (od >= 5.0) sOD = 100;
  else if (od >= 2.0) sOD = 20 * od;

  const fTemp = temp >= 25 ? 1.2 : 1.0;
  const iPonderado = (0.40 * sTurb) + (0.35 * sOD) + (0.25 * spH);
  let ire = iPonderado / fTemp;
  ire = Math.min(100, Math.max(0, ire));

  let nivelRisco = 'Excelente';
  if (ire < 35) nivelRisco = 'Crítico';
  else if (ire < 55) nivelRisco = 'Alerta';
  else if (ire < 75) nivelRisco = 'Bom';

  return {
    ire: parseFloat(ire.toFixed(2)),
    nivelRisco
  };
}

/**
 * GET /api/telemetria/historico
 */
router.get('/historico', async (req, res) => {
  try {
    const { estacao_id, limit = 50 } = req.query;
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
    `;
    const params = [];
    let paramIndex = 1;

    if (estacao_id) {
      const isNum = !isNaN(estacao_id);
      if (isNum) {
        sql += ` WHERE e.codigo = $${paramIndex} OR e.id = $${paramIndex + 1}`;
        params.push(estacao_id, parseInt(estacao_id, 10));
        paramIndex += 2;
      } else {
        sql += ` WHERE e.codigo = $${paramIndex}`;
        params.push(estacao_id);
        paramIndex += 1;
      }
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
 * POST /api/telemetria
 */
router.post('/', async (req, res) => {
  try {
    const { estacao_codigo, ph, turb, od, temp, cenario_tag, bateria_nivel, sinal_rssi } = req.body;

    if (!estacao_codigo || ph === undefined || turb === undefined || od === undefined || temp === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios ausentes: estacao_codigo, ph, turb, od, temp são requeridos.'
      });
    }

    const isNum = !isNaN(estacao_codigo);
    const estQuery = isNum 
      ? 'SELECT id FROM estacoes WHERE codigo = $1 OR id = $2 LIMIT 1'
      : 'SELECT id FROM estacoes WHERE codigo = $1 LIMIT 1';
    
    const estParams = isNum ? [estacao_codigo, parseInt(estacao_codigo, 10)] : [estacao_codigo];
    const estRes = await db.query(estQuery, estParams);

    if (estRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Estação '${estacao_codigo}' não encontrada no PostgreSQL.` });
    }
    const estacaoId = estRes.rows[0].id;

    const calc = calculateIRE(ph, turb, od, temp);
    const ireValor = req.body.ire !== undefined ? parseFloat(req.body.ire) : calc.ire;
    const nivelRisco = req.body.nivel_risco || calc.nivelRisco;
    const scenarioTag = cenario_tag || '[TELEMETRIA AO VIVO]';

    const sql = `
      INSERT INTO leituras_telemetria 
      (estacao_id, ph, turbidez, oxigenio_dissolvido, temperatura, ire, nivel_risco, cenario_tag, bateria_nivel, sinal_rssi)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, data_hora;
    `;

    const values = [
      estacaoId,
      ph,
      turb,
      od,
      temp,
      ireValor,
      nivelRisco,
      scenarioTag,
      bateria_nivel || null,
      sinal_rssi || null
    ];

    const { rows } = await db.query(sql, values);

    res.status(201).json({
      success: true,
      message: 'Telemetria gravada com sucesso no PostgreSQL!',
      data: {
        id: rows[0].id,
        estacao_codigo,
        data_hora: rows[0].data_hora,
        params: { ph, turb, od, temp },
        ire: ireValor,
        nivel_risco: nivelRisco,
        scenarioTag
      }
    });
  } catch (err) {
    console.error('Erro ao gravar telemetria:', err);
    res.status(500).json({ success: false, error: 'Erro ao gravar leitura no PostgreSQL.' });
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
