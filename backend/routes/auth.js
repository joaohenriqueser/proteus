const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authMiddleware = require('../middlewares/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'proteus_jwt_padrao_dev';

/**
 * POST /api/auth/login
 * Realiza o login do administrador por USUÁRIO ou E-MAIL e devolve o Token JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { login, email, usuario, senha } = req.body;
    // Aceita tanto { login: 'admin' } quanto { usuario: 'admin' } ou { email: 'admin@proteus.com' }
    const identificador = (login || email || usuario || '').toLowerCase().trim();

    if (!identificador || !senha) {
      return res.status(400).json({ 
        success: false, 
        error: 'Informe o usuário (ou e-mail) e a senha.' 
      });
    }

    // Busca o usuário ativo no banco por e-mail OU pelo nome de usuário
    const sql = `
      SELECT * FROM usuarios_admin 
      WHERE (LOWER(email) = $1 OR LOWER(usuario) = $1) 
        AND ativo = TRUE 
      LIMIT 1
    `;
    const { rows } = await db.query(sql, [identificador]);

    if (rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciais inválidas. Verifique seu usuário/e-mail e senha.' 
      });
    }

    const usuarioEncontrado = rows[0];

    // Compara a senha digitada com o hash no banco
    const senhaValida = await bcrypt.compare(senha, usuarioEncontrado.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciais inválidas. Verifique seu usuário/e-mail e senha.' 
      });
    }

    // Gera o Token JWT com validade de 8 horas
    const token = jwt.sign(
      { 
        id: usuarioEncontrado.id, 
        nome: usuarioEncontrado.nome, 
        usuario: usuarioEncontrado.usuario,
        email: usuarioEncontrado.email 
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      token,
      usuario: {
        id: usuarioEncontrado.id,
        nome: usuarioEncontrado.nome,
        usuario: usuarioEncontrado.usuario,
        email: usuarioEncontrado.email
      }
    });

  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao processar o login.' 
    });
  }
});

/**
 * GET /api/auth/me
 * Retorna os dados do administrador atualmente autenticado
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, nome, usuario, email, ativo, criado_em FROM usuarios_admin WHERE id = $1',
      [req.usuario.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    }

    res.json({ success: true, usuario: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao obter dados do usuário.' });
  }
});

/**
 * GET /api/auth/usuarios
 * Lista os administradores cadastrados (acesso restrito por token)
 */
router.get('/usuarios', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, nome, usuario, email, ativo, criado_em FROM usuarios_admin ORDER BY id ASC'
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao listar administradores.' });
  }
});

/**
 * POST /api/auth/usuarios
 * Cadastra um novo administrador (apenas um administrador logado pode cadastrar outro)
 */
router.post('/usuarios', authMiddleware, async (req, res) => {
  try {
    const { nome, usuario, email, senha } = req.body;

    if (!nome || !usuario || !email || !senha) {
      return res.status(400).json({
        success: false,
        error: 'Todos os campos são obrigatórios: nome, usuário, e-mail e senha.'
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'A senha deve conter no mínimo 6 caracteres.'
      });
    }

    // Hash com bcrypt
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const sql = `
      INSERT INTO usuarios_admin (nome, usuario, email, senha_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nome, usuario, email, ativo, criado_em;
    `;

    const { rows } = await db.query(sql, [
      nome.trim(),
      usuario.toLowerCase().trim(),
      email.toLowerCase().trim(),
      senhaHash
    ]);

    res.status(201).json({
      success: true,
      message: 'Novo administrador cadastrado com sucesso!',
      data: rows[0]
    });
  } catch (err) {
    if (err.code === '23505') { // Violação de unicidade (e-mail ou usuário já existem)
      return res.status(400).json({
        success: false,
        error: 'Já existe um administrador cadastrado com este e-mail ou nome de usuário.'
      });
    }
    console.error('Erro ao cadastrar administrador:', err);
    res.status(500).json({ success: false, error: 'Erro ao cadastrar administrador.' });
  }
});

/**
 * PUT /api/auth/usuarios/:id/status
 * Ativa ou desativa um administrador
 */
router.put('/usuarios/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { ativo } = req.body;

    if (parseInt(id, 10) === req.usuario.id) {
      return res.status(400).json({
        success: false,
        error: 'Você não pode desativar seu próprio usuário.'
      });
    }

    const { rows } = await db.query(
      'UPDATE usuarios_admin SET ativo = $1 WHERE id = $2 RETURNING id, nome, ativo',
      [!!ativo, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    }

    res.json({
      success: true,
      message: `Usuário ${ativo ? 'ativado' : 'desativado'} com sucesso!`,
      data: rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao alterar status do usuário.' });
  }
});

/**
 * POST /api/auth/recuperar-senha
 * Solicita recuperação: gera token de redefinição com validade de 1 hora
 */
router.post('/recuperar-senha', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Informe o e-mail cadastrado.' });
    }

    const { rows } = await db.query(
      'SELECT id, nome, email FROM usuarios_admin WHERE email = $1 AND ativo = TRUE', 
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      // Resposta genérica para segurança
      return res.json({ 
        success: true, 
        message: 'Se este e-mail estiver cadastrado, as instruções de recuperação foram geradas.' 
      });
    }

    const usuario = rows[0];
    const tokenRecuperacao = crypto.randomBytes(32).toString('hex');
    const expiraEm = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await db.query(
      `INSERT INTO tokens_recuperacao_senha (usuario_id, token, expira_em) 
       VALUES ($1, $2, $3)`,
      [usuario.id, tokenRecuperacao, expiraEm]
    );

    console.log('----------------------------------------------------');
    console.log(`📧 [RECUPERAÇÃO DE SENHA] E-mail: ${usuario.email}`);
    console.log(`🔗 Token gerado: ${tokenRecuperacao}`);
    console.log(`🌐 Link: http://localhost:3000/admin/redefinir-senha.html?token=${tokenRecuperacao}`);
    console.log('----------------------------------------------------');

    return res.json({
      success: true,
      message: 'Se este e-mail estiver cadastrado, as instruções de recuperação foram geradas.',
      devToken: tokenRecuperacao 
    });

  } catch (err) {
    console.error('Erro na recuperação de senha:', err);
    return res.status(500).json({ success: false, error: 'Erro ao processar recuperação de senha.' });
  }
});

/**
 * POST /api/auth/redefinir-senha
 * Recebe o token recebido por e-mail e redefine a senha do usuário
 */
router.post('/redefinir-senha', async (req, res) => {
  try {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha || novaSenha.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token e nova senha (mínimo de 6 caracteres) são obrigatórios.' 
      });
    }

    const sql = `
      SELECT * FROM tokens_recuperacao_senha 
      WHERE token = $1 AND usado = FALSE AND expira_em > NOW()
      ORDER BY id DESC LIMIT 1
    `;
    const { rows } = await db.query(sql, [token]);

    if (rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Este link de recuperação é inválido ou já expirou. Solicite um novo.' 
      });
    }

    const registroToken = rows[0];
    const salt = await bcrypt.genSalt(10);
    const novoHash = await bcrypt.hash(novaSenha, salt);

    await db.query(
      'UPDATE usuarios_admin SET senha_hash = $1 WHERE id = $2',
      [novoHash, registroToken.usuario_id]
    );

    await db.query(
      'UPDATE tokens_recuperacao_senha SET usado = TRUE WHERE id = $1',
      [registroToken.id]
    );

    return res.json({
      success: true,
      message: 'Senha alterada com sucesso! Você já pode fazer login com a nova senha.'
    });

  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    return res.status(500).json({ success: false, error: 'Erro ao redefinir senha.' });
  }
});

module.exports = router;
