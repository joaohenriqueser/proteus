const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * GET /api/equipamentos
 * Lista todos os equipamentos ESP32 cadastrados
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const sql = `
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
      ORDER BY eq.id DESC;
    `;

    const { rows } = await db.query(sql);
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
    const { id } = req.params;
    const sql = `
      SELECT 
        eq.*,
        e.codigo AS estacao_codigo,
        e.nome AS estacao_nome
      FROM equipamentos eq
      LEFT JOIN estacoes e ON eq.estacao_id = e.id
      WHERE eq.id = $1
      LIMIT 1;
    `;
    const { rows } = await db.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Equipamento não encontrado.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao buscar equipamento.' });
  }
});

/**
 * POST /api/equipamentos
 * Cadastra um novo equipamento (ESP32) vinculado ou não a uma estação
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      mac_address, 
      nome_dispositivo, 
      modelo, 
      estacao_id, 
      firmware_versao, 
      status 
    } = req.body;

    if (!mac_address || !nome_dispositivo) {
      return res.status(400).json({
        success: false,
        error: 'MAC Address e Nome do Dispositivo são obrigatórios.'
      });
    }

    // Validação simples de formato MAC Address (ex: 24:6F:28:7A:B9:4C)
    const macNormalizado = mac_address.trim().toUpperCase();

    // Gera uma API Key segura de 48 caracteres hexadecimais para o ESP32 autenticar leituras
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
 * Atualiza os dados de um equipamento
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nome_dispositivo, 
      modelo, 
      estacao_id, 
      firmware_versao, 
      status 
    } = req.body;

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
      estacao_id !== undefined ? (estacao_id ? parseInt(estacao_id, 10) : null) : null,
      firmware_versao || null,
      status || null,
      id
    ];

    const { rows } = await db.query(sql, values);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Equipamento não encontrado.' });
    }

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
    const novaApiKey = 'prt_' + crypto.randomBytes(24).toString('hex');

    const { rows } = await db.query(
      'UPDATE equipamentos SET api_key = $1 WHERE id = $2 RETURNING id, nome_dispositivo, api_key',
      [novaApiKey, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Equipamento não encontrado.' });
    }

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
    const { rowCount } = await db.query('DELETE FROM equipamentos WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Equipamento não encontrado.' });
    }

    res.json({ success: true, message: 'Equipamento excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir equipamento:', err);
    res.status(500).json({ success: false, error: 'Erro ao excluir equipamento.' });
  }
});

module.exports = router;
