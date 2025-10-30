const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Health check básico
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Servidor funcionando!',
    timestamp: new Date().toISOString(),
    node: process.version
  });
});

// Rota principal
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Servidor online!',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// Rota para testar Chromium (opcional)
app.get('/test-chromium', async (req, res) => {
  try {
    // Verificar se Chromium existe
    const fs = require('fs');
    const paths = ['/usr/bin/chromium', '/usr/bin/chromium-browser'];
    const chromiumPath = paths.find(path => fs.existsSync(path));
    
    if (chromiumPath) {
      res.json({
        success: true,
        message: 'Chromium encontrado!',
        path: chromiumPath,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Chromium não encontrado',
        checkedPaths: paths,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
