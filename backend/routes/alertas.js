const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * GET /api/alertas
 * Lista os alertas automáticos gerados pelo sistema (RF10)
 * Aceita filtros: ?estacao_id=&status=&nivel=&limit=
 */
router.get('/', async (req, res) => {
  try {
    const { estacao_id, status, nivel, limit = 50 } = req.query;

    let sql = `
      SELECT 
        a.id,
        a.estacao_id,
        e.codigo AS estacao_codigo,
        e.nome AS estacao_nome,
        e.cidade AS estacao_cidade,
        a.medicao_id,
        a.nivel,
        a.descricao,
        a.parametro,
        a.valor_medido,
        a.status,
        a.gerado_em,
        a.resolvido_em
      FROM alertas a
      JOIN estacoes e ON e.id = a.estacao_id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (estacao_id) {
      const isNum = !isNaN(estacao_id);
      if (isNum) {
        sql += ` AND (e.id = $${paramIndex} OR e.codigo = $${paramIndex + 1})`;
        params.push(parseInt(estacao_id, 10), estacao_id);
        paramIndex += 2;
      } else {
        sql += ` AND e.codigo = $${paramIndex}`;
        params.push(estacao_id);
        paramIndex += 1;
      }
    }

    if (status && status !== 'todos') {
      sql += ` AND LOWER(a.status) = LOWER($${paramIndex})`;
      params.push(status);
      paramIndex += 1;
    }

    if (nivel && nivel !== 'todos') {
      sql += ` AND LOWER(a.nivel) = LOWER($${paramIndex})`;
      params.push(nivel);
      paramIndex += 1;
    }

    sql += ` ORDER BY a.gerado_em DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit, 10));

    const { rows } = await db.query(sql, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows.map(r => ({
        id: r.id,
        estacao_id: r.estacao_id,
        estacao_codigo: r.estacao_codigo,
        estacao_nome: r.estacao_nome,
        estacao_cidade: r.estacao_cidade,
        medicao_id: r.medicao_id,
        nivel: r.nivel,
        descricao: r.descricao,
        parametro: r.parametro,
        valor_medido: r.valor_medido !== null ? parseFloat(r.valor_medido) : null,
        status: r.status,
        gerado_em: r.gerado_em,
        resolvido_em: r.resolvido_em
      }))
    });
  } catch (err) {
    console.error('Erro ao listar alertas:', err);
    res.status(500).json({ success: false, error: 'Erro ao listar alertas.' });
  }
});

/**
 * GET /api/alertas/resumo
 * Retorna contadores agregados de alertas (RF10)
 */
router.get('/resumo', async (req, res) => {
  try {
    const totalQuery = await db.query('SELECT COUNT(*) AS total FROM alertas');
    const abertosQuery = await db.query("SELECT COUNT(*) AS total FROM alertas WHERE status = 'Aberto'");
    const emAnaliseQuery = await db.query("SELECT COUNT(*) AS total FROM alertas WHERE status = 'Em análise'");
    const resolvidosQuery = await db.query("SELECT COUNT(*) AS total FROM alertas WHERE status = 'Resolvido'");
    const criticosQuery = await db.query("SELECT COUNT(*) AS total FROM alertas WHERE nivel = 'Crítico' AND status != 'Resolvido'");

    res.json({
      success: true,
      data: {
        total: parseInt(totalQuery.rows[0].total, 10),
        abertos: parseInt(abertosQuery.rows[0].total, 10),
        emAnalise: parseInt(emAnaliseQuery.rows[0].total, 10),
        resolvidos: parseInt(resolvidosQuery.rows[0].total, 10),
        criticosAtivos: parseInt(criticosQuery.rows[0].total, 10)
      }
    });
  } catch (err) {
    console.error('Erro ao buscar resumo de alertas:', err);
    res.status(500).json({ success: false, error: 'Erro ao gerar resumo de alertas.' });
  }
});

/**
 * PUT /api/alertas/:id/status
 * Atualiza o status de um alerta ('Aberto', 'Em análise', 'Resolvido')
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatus = ['Aberto', 'Em análise', 'Resolvido'];
    if (!status || !validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status inválido. Use um dos seguintes: ${validStatus.join(', ')}.`
      });
    }

    const resolvidoEm = status === 'Resolvido' ? new Date() : null;

    const sql = `
      UPDATE alertas 
      SET status = $1, resolvido_em = $2
      WHERE id = $3
      RETURNING *;
    `;

    const { rows } = await db.query(sql, [status, resolvidoEm, id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Alerta não encontrado.' });
    }

    res.json({
      success: true,
      message: `Status do alerta atualizado para '${status}' com sucesso!`,
      data: rows[0]
    });
  } catch (err) {
    console.error('Erro ao atualizar alerta:', err);
    res.status(500).json({ success: false, error: 'Erro ao atualizar status do alerta.' });
  }
});

/**
 * POST /api/alertas
 * Criação de alerta (usado pela telemetria ou operador)
 */
router.post('/', async (req, res) => {
  try {
    const { estacao_id, medicao_id, nivel, descricao, parametro, valor_medido } = req.body;

    if (!estacao_id || !descricao) {
      return res.status(400).json({ success: false, error: 'Estação e descrição são obrigatórias.' });
    }

    const sql = `
      INSERT INTO alertas (estacao_id, medicao_id, nivel, descricao, parametro, valor_medido, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'Aberto')
      RETURNING *;
    `;

    const values = [
      parseInt(estacao_id, 10),
      medicao_id ? parseInt(medicao_id, 10) : null,
      nivel || 'Atenção',
      descricao.trim(),
      parametro || null,
      valor_medido !== undefined ? parseFloat(valor_medido) : null
    ];

    const { rows } = await db.query(sql, values);

    res.status(201).json({
      success: true,
      message: 'Alerta gerado com sucesso!',
      data: rows[0]
    });
  } catch (err) {
    console.error('Erro ao registrar alerta:', err);
    res.status(500).json({ success: false, error: 'Erro ao criar alerta.' });
  }
});

module.exports = router;
