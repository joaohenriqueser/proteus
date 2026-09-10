const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'proteus_jwt_padrao_dev';

/**
 * Middleware de Autenticação JWT
 * Intercepta as requisições para rotas restritas e valida o token no cabeçalho Authorization
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Acesso negado. Token de autenticação não fornecido.'
    });
  }

  // O formato esperado é: "Bearer <token>"
  const partes = authHeader.split(' ');
  if (partes.length !== 2 || partes[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Formato de token inválido. Esperado: Bearer <token>'
    });
  }

  const token = partes[1];

  try {
    const decodificado = jwt.verify(token, JWT_SECRET);
    // Anexa as informações do administrador autenticado no objeto da requisição
    req.usuario = decodificado;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Sessão expirada. Por favor, faça login novamente.'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Token de autenticação inválido.'
    });
  }
}

module.exports = authMiddleware;
