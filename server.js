import express from 'express';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware básico
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check melhorado
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: '🚀 Servidor funcionando perfeitamente!',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Rota principal
app.get('/', (req, res) => {
  res.json({
    message: '✅ Servidor online e operacional!',
    status: 'success',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      info: '/info'
    }
  });
});

// Rota de informações do sistema
app.get('/info', (req, res) => {
  res.json({
    server: {
      name: 'Servidor App',
      version: '1.0.0',
      port: PORT,
      environment: process.env.NODE_ENV || 'production'
    },
    system: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: Math.floor(process.uptime()) + ' segundos'
    },
    timestamp: new Date().toISOString()
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    message: `A rota ${req.originalUrl} não existe`,
    availableRoutes: ['/', '/health', '/info'],
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Erro no servidor:', error);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Inicializar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
  console.log(`📊 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`⚡ Node.js: ${process.version}`);
});
