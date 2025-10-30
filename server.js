const express = require('express');
const puppeteer = require('puppeteer-core');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuração robusta do Chromium
async function getBrowser() {
  const chromiumExecutable = process.env.CHROMIUM_PATH || 
                            '/usr/bin/chromium' ||
                            '/usr/bin/chromium-browser' ||
                            '/nix/store/*chromium*/bin/chromium';

  console.log('🔍 Procurando Chromium em:', chromiumExecutable);

  return await puppeteer.launch({
    executablePath: chromiumExecutable,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-ipc-flooding-protection',
      '--max-old-space-size=4096'
    ],
    ignoreHTTPSErrors: true
  });
}

// Middleware básico
app.use(express.json());

// Rota de saúde MELHORADA
app.get('/health', async (req, res) => {
  try {
    console.log('🏥 Health check iniciado...');
    
    // Verificar se o Chromium existe
    const fs = require('fs');
    const chromiumPaths = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/nix/store/*/bin/chromium'
    ];
    
    let chromiumPath = null;
    for (const path of chromiumPaths) {
      if (fs.existsSync(path)) {
        chromiumPath = path;
        break;
      }
    }
    
    if (!chromiumPath) {
      return res.status(500).json({
        status: 'error',
        message: 'Chromium não encontrado',
        availablePaths: chromiumPaths
      });
    }
    
    // Testar o Chromium
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.goto('about:blank', { waitUntil: 'load', timeout: 15000 });
    await browser.close();
    
    res.json({
      status: 'healthy',
      chromium: {
        path: chromiumPath,
        working: true
      },
      timestamp: new Date().toISOString(),
      nodeVersion: process.version
    });
    
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      chromium: {
        working: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Rota principal SIMPLIFICADA
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Servidor funcionando!',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      test: '/test'
    }
  });
});

// Rota de teste
app.get('/test', async (req, res) => {
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    
    await page.goto('https://httpbin.org/json', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    const content = await page.content();
    await browser.close();
    
    res.json({
      success: true,
      message: 'Teste com Chromium realizado com sucesso!',
      contentLength: content.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 URL: http://0.0.0.0:${PORT}`);
  console.log(`📊 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`🧪 Test: http://0.0.0.0:${PORT}/test`);
});
