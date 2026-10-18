const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
require('dotenv').config();

const path = require('path');
const estacoesRoutes = require('./routes/estacoes');
const telemetriaRoutes = require('./routes/telemetria');

const equipamentosRoutes = require('./routes/equipamentos');
const alertasRoutes = require('./routes/alertas');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Habilita CORS para o Front-end acessar a API
app.use(express.json()); // Suporte a payload JSON nas requisições

// Rotas da API
app.use('/api/estacoes', estacoesRoutes);
app.use('/api/telemetria', telemetriaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/equipamentos', equipamentosRoutes);
app.use('/api/alertas', alertasRoutes);


// Rota de Healthcheck / Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'P.R.O.T.E.U.S. Telemetry API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Servir arquivos estáticos do front-end
app.use(express.static(path.join(__dirname, '../frontend')));

// Iniciar o Servidor HTTP
app.listen(PORT, () => {
  console.log('===================================================');
  console.log(`🔱 P.R.O.T.E.U.S. Backend API rodando com sucesso!`);
  console.log(`📡 Servidor ativo em: http://localhost:${PORT}`);
  console.log(`📊 Healthcheck: http://localhost:${PORT}/api/health`);
  console.log(`🌊 Estações API: http://localhost:${PORT}/api/estacoes`);
  console.log(`📈 Telemetria API: http://localhost:${PORT}/api/telemetria/historico`);
  console.log('===================================================');
});
