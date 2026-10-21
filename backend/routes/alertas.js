const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middlewares/authMiddleware');

function ehOperador(req) {
  return req.usuario && req.usuario.papel === 'operador';
}

/**
 * GET /api/alertas
 * Lista os alertas automáticos gerados pelo sistema (RF10)
 * Operador: restrito exclusivamente aos alertas da própria estação
 * Admin geral: pode listar de todas as estações ou filtrar por ?estacao_id=
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    let { estacao_id, status, nivel, limit = 50 } = req.query;

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

    // Regra estrita: se for operador, restringe à sua estação
    if (ehOperador(req)) {
      sql += ` AND a.estacao_id = $${paramIndex}`;
      params.push(req.usuario.estacao_id);
      paramIndex += 1;
    } else if (estacao_id) {
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
 * Operador: contadores restritos à sua estação
 */
router.get('/resumo', authMiddleware, async (req, res) => {
  try {
    const whereClause = ehOperador(req) ? ' WHERE estacao_id = $1' : '';
    const andWhere = ehOperador(req) ? ' AND estacao_id = $1' : '';
    const params = ehOperador(req) ? [req.usuario.estacao_id] : [];

    const totalQuery = await db.query(`SELECT COUNT(*) AS total FROM alertas${whereClause}`, params);
    const abertosQuery = await db.query(`SELECT COUNT(*) AS total FROM alertas WHERE status = 'Aberto'${andWhere}`, params);
    const emAnaliseQuery = await db.query(`SELECT COUNT(*) AS total FROM alertas WHERE status = 'Em análise'${andWhere}`, params);
    const resolvidosQuery = await db.query(`SELECT COUNT(*) AS total FROM alertas WHERE status = 'Resolvido'${andWhere}`, params);
    const criticosQuery = await db.query(`SELECT COUNT(*) AS total FROM alertas WHERE nivel = 'Crítico' AND status != 'Resolvido'${andWhere}`, params);

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
 * Operador: pode atualizar apenas alertas da sua própria estação
 */
router.put('/:id/status', authMiddleware, async (req, res) => {
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

    if (ehOperador(req)) {
      const check = await db.query('SELECT estacao_id FROM alertas WHERE id = $1', [id]);
      if (check.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Alerta não encontrado.' });
      }
      if (check.rows[0].estacao_id !== req.usuario.estacao_id) {
        return res.status(403).json({ success: false, error: 'Acesso negado. Este alerta pertence a outra estação.' });
      }
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
router.post('/', authMiddleware, async (req, res) => {
  try {
    let { estacao_id, medicao_id, nivel, descricao, parametro, valor_medido } = req.body;

    if (ehOperador(req)) {
      estacao_id = req.usuario.estacao_id;
    }

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
