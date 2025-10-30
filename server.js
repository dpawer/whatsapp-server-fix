import express from 'express';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy 🚀',
    message: 'Servidor funcionando perfeitamente!',
    timestamp: new Date().toISOString(),
    node: process.version,
    environment: process.env.NODE_ENV || 'production'
  });
});

// Rota Principal
app.get('/', (req, res) => {
  res.json({
    message: '✅ Servidor Online!',
    status: 'success',
    timestamp: new Date().toISOString(),
    endpoints: ['/', '/health', '/info']
  });
});

// Info
app.get('/info', (req, res) => {
  res.json({
    server: 'Servidor App',
    version: '1.0.0',
    port: PORT,
    node: process.version,
    uptime: process.uptime() + 's'
  });
});

// Iniciar Servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 SERVIDOR INICIADO COM SUCESSO!');
  console.log(`📍 Porta: ${PORT}`);
  console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
  console.log(`📊 Health: http://0.0.0.0:${PORT}/health`);
});
