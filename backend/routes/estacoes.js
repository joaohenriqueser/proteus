const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/estacoes
 * Listar todas as estações de monitoramento com a última leitura cadastrada no PostgreSQL
 */
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        e.id,
        e.codigo,
        e.nome,
        e.rio_local AS river,
        e.cidade,
        e.estado,
        e.latitude,
        e.longitude,
        e.bacia_hidrografica AS bacia,
        e.status_operacional AS status,
        t.ph,
        t.turbidez AS turb,
        t.oxigenio_dissolvido AS od,
        t.temperatura AS temp,
        t.ire,
        t.nivel_risco,
        t.cenario_tag AS scenario_tag,
        t.data_hora AS ultima_leitura
      FROM estacoes e
      LEFT JOIN LATERAL (
        SELECT ph, turbidez, oxigenio_dissolvido, temperatura, ire, nivel_risco, cenario_tag, data_hora
        FROM leituras_telemetria 
        WHERE estacao_id = e.id 
        ORDER BY data_hora DESC LIMIT 1
      ) t ON TRUE
      ORDER BY e.id ASC;
    `;

    const { rows } = await db.query(query);

    const result = rows.map(r => ({
      id: r.codigo,
      db_id: r.id,
      name: r.nome,
      river: r.river,
      cidade: r.cidade,
      estado: r.estado,
      coords: [parseFloat(r.latitude), parseFloat(r.longitude)],
      params: {
        ph: r.ph !== null ? parseFloat(r.ph) : 7.2,
        turb: r.turb !== null ? parseFloat(r.turb) : 4.0,
        od: r.od !== null ? parseFloat(r.od) : 8.6,
        temp: r.temp !== null ? parseFloat(r.temp) : 22.4
      },
      ire: r.ire !== null ? parseFloat(r.ire) : null,
      nivel_risco: r.nivel_risco || 'Excelente',
      scenarioTag: r.scenario_tag || '[MOCK] ÁGUA IDEAL',
      ultimaLeitura: r.ultima_leitura
    }));

    res.json({ success: true, count: result.length, data: result });
  } catch (err) {
    console.error('Erro ao buscar estações no PostgreSQL:', err);
    res.status(500).json({ success: false, error: 'Erro interno ao consultar estações.' });
  }
});

/**
 * GET /api/estacoes/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = !isNaN(id);
    const query = isNum 
      ? 'SELECT * FROM estacoes WHERE codigo = $1 OR id = $2 LIMIT 1'
      : 'SELECT * FROM estacoes WHERE codigo = $1 LIMIT 1';
    
    const params = isNum ? [id, parseInt(id, 10)] : [id];
    const { rows } = await db.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Estação não encontrada.' });
    }

    const st = rows[0];
    res.json({
      success: true,
      data: {
        id: st.codigo,
        db_id: st.id,
        name: st.nome,
        river: st.rio_local,
        cidade: st.cidade,
        estado: st.estado,
        coords: [parseFloat(st.latitude), parseFloat(st.longitude)],
        bacia: st.bacia_hidrografica,
        status: st.status_operacional
      }
    });
  } catch (err) {
    console.error('Erro ao buscar estação:', err);
    res.status(500).json({ success: false, error: 'Erro interno ao buscar estação.' });
  }
});

/**
 * POST /api/estacoes
 */
router.post('/', async (req, res) => {
  try {
    const { codigo, nome, rio_local, cidade, estado, latitude, longitude, bacia_hidrografica } = req.body;

    if (!codigo || !nome || !latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campos obrigatórios ausentes: codigo, nome, latitude e longitude são requeridos.' 
      });
    }

    const sql = `
      INSERT INTO estacoes (codigo, nome, rio_local, cidade, estado, latitude, longitude, bacia_hidrografica)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, codigo, nome;
    `;

    const values = [
      codigo.toUpperCase(),
      nome,
      rio_local || nome,
      cidade || 'Barbosa',
      estado || 'SP',
      latitude,
      longitude,
      bacia_hidrografica || 'Baixo Tietê'
    ];

    const { rows } = await db.query(sql, values);

    res.status(201).json({
      success: true,
      message: 'Estação cadastrada com sucesso!',
      data: rows[0]
    });
  } catch (err) {
    console.error('Erro ao criar estação:', err);
    if (err.code === '23505') { // PostgreSQL unique violation
      return res.status(400).json({ success: false, error: 'Já existe uma estação cadastrada com este código.' });
    }
    res.status(500).json({ success: false, error: 'Erro ao cadastrar estação no banco.' });
  }
});

/**
 * DELETE /api/estacoes/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = !isNaN(id);
    const sql = isNum 
      ? 'DELETE FROM estacoes WHERE codigo = $1 OR id = $2'
      : 'DELETE FROM estacoes WHERE codigo = $1';
    
    const params = isNum ? [id, parseInt(id, 10)] : [id];
    const { rowCount } = await db.query(sql, params);

    if (rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Estação não encontrada.' });
    }

    res.json({ success: true, message: 'Estação excluída com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir estação:', err);
    res.status(500).json({ success: false, error: 'Erro ao excluir estação.' });
  }
});

module.exports = router;
