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

    // Busca o usuário ativo no banco por e-mail OU pelo nome de usuário com dados da estação
    const sql = `
      SELECT u.*, e.nome AS estacao_nome, e.codigo AS estacao_codigo 
      FROM usuarios_admin u
      LEFT JOIN estacoes e ON e.id = u.estacao_id
      WHERE (LOWER(u.email) = $1 OR LOWER(u.usuario) = $1) 
        AND u.ativo = TRUE 
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

    // Gera o Token JWT com validade de 8 horas incluindo papel e estacao_id
    const token = jwt.sign(
      { 
        id: usuarioEncontrado.id, 
        nome: usuarioEncontrado.nome, 
        usuario: usuarioEncontrado.usuario,
        email: usuarioEncontrado.email,
        papel: usuarioEncontrado.papel || 'admin',
        estacao_id: usuarioEncontrado.estacao_id || null,
        estacao_nome: usuarioEncontrado.estacao_nome || null,
        estacao_codigo: usuarioEncontrado.estacao_codigo || null
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
        email: usuarioEncontrado.email,
        papel: usuarioEncontrado.papel || 'admin',
        estacao_id: usuarioEncontrado.estacao_id || null,
        estacao_nome: usuarioEncontrado.estacao_nome || null,
        estacao_codigo: usuarioEncontrado.estacao_codigo || null
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
 * Retorna os dados do usuário atualmente autenticado
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.nome, u.usuario, u.email, u.papel, u.estacao_id, u.ativo, u.criado_em,
             e.nome AS estacao_nome, e.codigo AS estacao_codigo
      FROM usuarios_admin u
      LEFT JOIN estacoes e ON e.id = u.estacao_id
      WHERE u.id = $1
    `, [req.usuario.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    }

    res.json({ success: true, usuario: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao obter dados do usuário.' });
  }
});

/**
 * Retorna true se o solicitante é operador de estação.
 */
function ehOperador(req) {
  return req.usuario && req.usuario.papel === 'operador';
}

/**
 * Busca o usuário alvo e verifica se o solicitante pode geri-lo.
 * Admin geral: qualquer usuário. Operador: apenas operadores da própria estação.
 */
async function obterUsuarioGerenciavel(req, id) {
  const { rows } = await db.query(
    'SELECT id, papel, estacao_id FROM usuarios_admin WHERE id = $1',
    [id]
  );
  if (rows.length === 0) return { status: 404, error: 'Usuário não encontrado.' };

  const alvo = rows[0];
  if (ehOperador(req)) {
    const mesmaEstacao = alvo.estacao_id && alvo.estacao_id === req.usuario.estacao_id;
    if (alvo.papel !== 'operador' || !mesmaEstacao) {
      return { status: 403, error: 'Acesso negado. Você só pode gerenciar usuários da sua estação.' };
    }
  }
  return { alvo };
}

/**
 * GET /api/auth/usuarios
 * Admin geral: lista todos (aceita ?estacao_id= para filtrar).
 * Operador: lista apenas os usuários da própria estação.
 */
router.get('/usuarios', authMiddleware, async (req, res) => {
  try {
    const params = [];
    let where = '';

    if (ehOperador(req)) {
      params.push(req.usuario.estacao_id);
      where = 'WHERE u.estacao_id = $1';
    } else if (req.query.estacao_id) {
      params.push(parseInt(req.query.estacao_id, 10));
      where = 'WHERE u.estacao_id = $1';
    }

    const { rows } = await db.query(`
      SELECT u.id, u.nome, u.usuario, u.email, u.papel, u.estacao_id, u.ativo, u.criado_em,
             e.nome AS estacao_nome, e.codigo AS estacao_codigo
      FROM usuarios_admin u
      LEFT JOIN estacoes e ON e.id = u.estacao_id
      ${where}
      ORDER BY u.id ASC
    `, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao listar usuários.' });
  }
});

/**
 * POST /api/auth/usuarios
 * Admin geral: cria administradores ou operadores de qualquer estação.
 * Operador: cria somente operadores, sempre vinculados à própria estação.
 */
router.post('/usuarios', authMiddleware, async (req, res) => {
  try {
    let { nome, usuario, email, senha, papel = 'admin', estacao_id = null } = req.body;

    if (ehOperador(req)) {
      // O operador não escolhe papel nem estação: ambos são impostos pelo servidor
      papel = 'operador';
      estacao_id = req.usuario.estacao_id;
      if (!estacao_id) {
        return res.status(403).json({
          success: false,
          error: 'Seu usuário não está vinculado a nenhuma estação.'
        });
      }
    }

    if (!nome || !usuario || !email || !senha) {
      return res.status(400).json({
        success: false,
        error: 'Todos os campos são obrigatórios: nome, usuário, e-mail e senha.'
      });
    }

    if (papel === 'operador' && !estacao_id) {
      return res.status(400).json({
        success: false,
        error: 'Para cadastrar um Operador por Estação, é obrigatório selecionar a estação designada.'
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'A senha deve conter no mínimo 6 caracteres.'
      });
    }

    // Se estacao_id for informado, verificar se a estação existe
    let estacaoValidaId = null;
    if (estacao_id) {
      const chk = await db.query('SELECT id FROM estacoes WHERE id = $1', [estacao_id]);
      if (chk.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'A estação informada não existe.' });
      }
      estacaoValidaId = estacao_id;
    }

    // Hash com bcrypt
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const sql = `
      INSERT INTO usuarios_admin (nome, usuario, email, senha_hash, papel, estacao_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nome, usuario, email, papel, estacao_id, ativo, criado_em;
    `;

    const { rows } = await db.query(sql, [
      nome.trim(),
      usuario.toLowerCase().trim(),
      email.toLowerCase().trim(),
      senhaHash,
      papel === 'operador' ? 'operador' : 'admin',
      papel === 'operador' ? estacaoValidaId : null
    ]);

    res.status(201).json({
      success: true,
      message: papel === 'operador' 
        ? 'Operador por estação cadastrado com sucesso!' 
        : 'Administrador geral cadastrado com sucesso!',
      data: rows[0]
    });
  } catch (err) {
    if (err.code === '23505') { // Violação de unicidade (e-mail ou usuário já existem)
      return res.status(400).json({
        success: false,
        error: 'Já existe um usuário cadastrado com este e-mail ou nome de usuário.'
      });
    }
    console.error('Erro ao cadastrar usuário:', err);
    res.status(500).json({ success: false, error: 'Erro ao cadastrar usuário.' });
  }
});

/**
 * PUT /api/auth/usuarios/:id/status
 * Ativa ou desativa um usuário (admin geral: qualquer um; operador: apenas da própria estação)
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

    const permissao = await obterUsuarioGerenciavel(req, id);
    if (permissao.error) {
      return res.status(permissao.status).json({ success: false, error: permissao.error });
    }

    const { rows } = await db.query(
      'UPDATE usuarios_admin SET ativo = $1 WHERE id = $2 RETURNING id, nome, ativo, papel',
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
 * DELETE /api/auth/usuarios/:id
 * Remove um usuário (admin geral: qualquer um; operador: apenas da própria estação)
 */
router.delete('/usuarios/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.usuario.id) {
      return res.status(400).json({
        success: false,
        error: 'Você não pode excluir sua própria conta enquanto estiver logado.'
      });
    }

    const permissao = await obterUsuarioGerenciavel(req, id);
    if (permissao.error) {
      return res.status(permissao.status).json({ success: false, error: permissao.error });
    }

    const { rowCount } = await db.query('DELETE FROM usuarios_admin WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    }

    res.json({ success: true, message: 'Usuário excluído com sucesso!' });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ success: false, error: 'Erro ao excluir usuário.' });
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
