const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const authMiddleware = require('../middlewares/authMiddleware');

function ehOperador(req) {
  return req.usuario && req.usuario.papel === 'operador';
}

/**
 * Carrega um equipamento e verifica se o solicitante pode acessá-lo.
 * Admin geral: qualquer equipamento. Operador: apenas os da própria estação.
 */
async function obterEquipamentoPermitido(req, id) {
  const { rows } = await db.query('SELECT * FROM equipamentos WHERE id = $1', [id]);
  if (rows.length === 0) {
    return { status: 404, error: 'Equipamento não encontrado.' };
  }

  const eq = rows[0];
  if (ehOperador(req) && (!eq.estacao_id || eq.estacao_id !== req.usuario.estacao_id)) {
    return { status: 403, error: 'Acesso negado. Este equipamento não pertence à sua estação.' };
  }
  return { eq };
}

const SELECT_EQUIPAMENTO = `
  SELECT 
    eq.id,
    eq.mac_address,
    eq.nome_dispositivo,
    eq.modelo,
    eq.estacao_id,
    e.codigo AS estacao_codigo,
    e.nome AS estacao_nome,
    e.cidade AS estacao_cidade,
    eq.api_key,
    eq.firmware_versao,
    eq.status,
    eq.ultima_comunicacao,
    eq.criado_em
  FROM equipamentos eq
  LEFT JOIN estacoes e ON eq.estacao_id = e.id
`;

/**
 * GET /api/equipamentos
 * Admin geral: lista todos (aceita ?estacao_id=N ou ?estacao_id=none para os sem estação).
 * Operador: lista apenas os equipamentos da própria estação.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const params = [];
    let where = '';

    if (ehOperador(req)) {
      params.push(req.usuario.estacao_id);
      where = 'WHERE eq.estacao_id = $1';
    } else if (req.query.estacao_id === 'none') {
      where = 'WHERE eq.estacao_id IS NULL';
    } else if (req.query.estacao_id) {
      params.push(parseInt(req.query.estacao_id, 10));
      where = 'WHERE eq.estacao_id = $1';
    }

    const { rows } = await db.query(`${SELECT_EQUIPAMENTO} ${where} ORDER BY eq.id DESC;`, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('Erro ao listar equipamentos:', err);
    res.status(500).json({ success: false, error: 'Erro interno ao consultar equipamentos.' });
  }
});

/**
 * GET /api/equipamentos/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const permissao = await obterEquipamentoPermitido(req, req.params.id);
    if (permissao.error) {
      return res.status(permissao.status).json({ success: false, error: permissao.error });
    }

    const { rows } = await db.query(`${SELECT_EQUIPAMENTO} WHERE eq.id = $1 LIMIT 1;`, [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao buscar equipamento.' });
  }
});

/**
 * POST /api/equipamentos
 * Cadastra um novo equipamento (ESP32).
 * Operador: o equipamento é sempre vinculado à própria estação.
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      mac_address, 
      nome_dispositivo, 
      modelo, 
      firmware_versao, 
      status 
    } = req.body;
    let { estacao_id } = req.body;

    if (ehOperador(req)) {
      estacao_id = req.usuario.estacao_id;
      if (!estacao_id) {
        return res.status(403).json({
          success: false,
          error: 'Seu usuário não está vinculado a nenhuma estação.'
        });
      }
    }

    if (!mac_address || !nome_dispositivo) {
      return res.status(400).json({
        success: false,
        error: 'MAC Address e Nome do Dispositivo são obrigatórios.'
      });
    }

    const macNormalizado = mac_address.trim().toUpperCase();

    // Gera uma API Key segura para o ESP32 autenticar leituras
    const apiKey = 'prt_' + crypto.randomBytes(24).toString('hex');

    const sql = `
      INSERT INTO equipamentos (
        mac_address, nome_dispositivo, modelo, estacao_id, 
        api_key, firmware_versao, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const values = [
      macNormalizado,
      nome_dispositivo.trim(),
      modelo || 'ESP32 DevKit V1',
      estacao_id ? parseInt(estacao_id, 10) : null,
      apiKey,
      firmware_versao || '1.0.0',
      status || 'Ativo'
    ];

    const { rows } = await db.query(sql, values);

    res.status(201).json({
      success: true,
      message: 'Equipamento cadastrado com sucesso!',
      data: rows[0]
    });

  } catch (err) {
    console.error('Erro ao cadastrar equipamento:', err);
    if (err.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Já existe um equipamento cadastrado com este MAC Address.'
      });
    }
    res.status(500).json({ success: false, error: 'Erro ao cadastrar equipamento no banco.' });
  }
});

/**
 * PUT /api/equipamentos/:id
 * Atualiza os dados de um equipamento.
 * Operador: não pode mover o equipamento para outra estação.
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const permissao = await obterEquipamentoPermitido(req, id);
    if (permissao.error) {
      return res.status(permissao.status).json({ success: false, error: permissao.error });
    }

    const { 
      nome_dispositivo, 
      modelo, 
      firmware_versao, 
      status 
    } = req.body;

    // Operador mantém sempre a estação atual; admin pode reatribuir (ou desvincular)
    let novaEstacao = permissao.eq.estacao_id;
    if (!ehOperador(req) && req.body.estacao_id !== undefined) {
      novaEstacao = req.body.estacao_id ? parseInt(req.body.estacao_id, 10) : null;
    }

    const sql = `
      UPDATE equipamentos 
      SET 
        nome_dispositivo = COALESCE($1, nome_dispositivo),
        modelo = COALESCE($2, modelo),
        estacao_id = $3,
        firmware_versao = COALESCE($4, firmware_versao),
        status = COALESCE($5, status)
      WHERE id = $6
      RETURNING *;
    `;

    const values = [
      nome_dispositivo ? nome_dispositivo.trim() : null,
      modelo || null,
      novaEstacao,
      firmware_versao || null,
      status || null,
      id
    ];

    const { rows } = await db.query(sql, values);

    res.json({
      success: true,
      message: 'Equipamento atualizado com sucesso!',
      data: rows[0]
    });
  } catch (err) {
    console.error('Erro ao atualizar equipamento:', err);
    res.status(500).json({ success: false, error: 'Erro ao atualizar equipamento.' });
  }
});

/**
 * POST /api/equipamentos/:id/regenerar-chave
 * Gera uma nova API Key caso a anterior precise ser revogada
 */
router.post('/:id/regenerar-chave', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const permissao = await obterEquipamentoPermitido(req, id);
    if (permissao.error) {
      return res.status(permissao.status).json({ success: false, error: permissao.error });
    }

    const novaApiKey = 'prt_' + crypto.randomBytes(24).toString('hex');

    const { rows } = await db.query(
      'UPDATE equipamentos SET api_key = $1 WHERE id = $2 RETURNING id, nome_dispositivo, api_key',
      [novaApiKey, id]
    );

    res.json({
      success: true,
      message: 'Nova API Key gerada com sucesso!',
      data: rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao regenerar API Key.' });
  }
});

/**
 * DELETE /api/equipamentos/:id
 * Exclui um equipamento
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const permissao = await obterEquipamentoPermitido(req, id);
    if (permissao.error) {
      return res.status(permissao.status).json({ success: false, error: permissao.error });
    }

    await db.query('DELETE FROM equipamentos WHERE id = $1', [id]);

    res.json({ success: true, message: 'Equipamento excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir equipamento:', err);
    res.status(500).json({ success: false, error: 'Erro ao excluir equipamento.' });
  }
});

module.exports = router;
