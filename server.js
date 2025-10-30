const express = require('express');
const puppeteer = require('puppeteer-core');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuração robusta do Chromium
async function getBrowser() {
  const chromiumExecutable = process.env.CHROMIUM_PATH || 
                            '/usr/bin/chromium' || 
                            '/nix/store/*chromium*/bin/chromium';

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
      '--max-old-space-size=4096',
      '--single-process'
    ],
    ignoreHTTPSErrors: true,
    dumpio: false
  });
}

// Rota de saúde para testar o Chromium
app.get('/health', async (req, res) => {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.goto('about:blank', { waitUntil: 'networkidle0', timeout: 30000 });
    await browser.close();
    
    res.json({ 
      status: 'healthy',
      chromium: 'working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message,
      chromium: 'failed'
    });
  }
});

// Sua rota principal
app.get('/', async (req, res) => {
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('https://example.com', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    const title = await page.title();
    const screenshot = await page.screenshot({ encoding: 'base64' });
    
    await browser.close();
    
    res.json({
      success: true,
      title: title,
      screenshot: `data:image/png;base64,${screenshot}`,
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
  console.log(`📊 Health check disponível em: http://0.0.0.0:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  process.exit(0);
});
