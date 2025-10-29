const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rota Health Check - SIMPLES E FUNCIONAL
app.get('/health', (req, res) => {
  console.log('✅ Health check recebido');
  res.json({ 
    status: 'OK',
    message: 'Servidor WhatsApp Online!',
    timestamp: new Date().toISOString(),
    server: 'Railway'
  });
});

// Rota Status - SIMPLES
app.get('/api/status', (req, res) => {
  res.json({
    connected: false,
    status: 'waiting_setup',
    message: 'Servidor pronto para configuração do WhatsApp'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      status: '/api/status'
    }
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('=====================================');
  console.log('🚀 SERVIDOR WHATSAPP INICIADO!');
  console.log('📍 Porta:', PORT);
  console.log('❤️  Health Check: /health');
  console.log('📊 Status WhatsApp: /api/status');
  console.log('=====================================');
});
