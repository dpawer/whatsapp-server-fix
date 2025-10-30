const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= CONFIGURAÇÃO SUPABASE =================
console.log('🔍 Verificando variáveis de ambiente...');

// CORREÇÃO: Usar os nomes corretos das variáveis do Railway
const supabaseUrl = process.env.URL_SUPABASE; // Corrigido para URL_SUPABASE
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('📋 Variáveis de ambiente:', {
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseKey: !!supabaseKey,
  nodeEnv: process.env.NODE_ENV
});

let supabase = null;
let supabaseConnected = false;

if (supabaseUrl && supabaseKey) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseKey);
    supabaseConnected = true;
    console.log('✅ Supabase configurado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao configurar Supabase:', error.message);
  }
} else {
  console.warn('⚠️  Supabase não configurado - funcionando em modo offline');
}

// ================= CONFIGURAÇÃO WHATSAPP =================
let whatsappClient = null;
let isConnected = false;
let currentQrCode = '';
let qrGenerated = false;

async function getBrowserConfig() {
  // Configuração otimizada para Railway
  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--single-process',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--window-size=1920,1080',
      '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ],
    // CORREÇÃO: Usar chromium do NixPacks
    executablePath: process.env.CHROME_PATH || '/usr/bin/chromium'
  };
}

async function initializeWhatsApp() {
  console.log('🔄 Iniciando cliente WhatsApp...');
  
  try {
    const browserConfig = await getBrowserConfig();
    console.log('🔧 Configuração do navegador:', browserConfig.executablePath);
    
    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        clientId: "whatsapp-railway"
      }),
      puppeteer: browserConfig,
      webVersionCache: {
        type: "remote",
        remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html"
      }
    });

    // QR Code
    whatsappClient.on('qr', async (qr) => {
      if (!qrGenerated) {
        console.log('📱 QR Code recebido!');
        console.log('🔒 Escaneie o QR Code abaixo com seu WhatsApp:');
        qrcode.generate(qr, { small: true });
        
        currentQrCode = qr;
        qrGenerated = true;
        
        if (supabaseConnected) {
          try {
            await supabase
              .from('whatsapp_sessions')
              .upsert({
                id: 1,
                qr_code: qr,
                status: 'waiting_qr',
                updated_at: new Date().toISOString()
              });
            console.log('✅ QR Code salvo no Supabase');
          } catch (error) {
            console.error('❌ Erro ao salvar QR no Supabase:', error.message);
          }
        }
      }
    });

    // Conectado
    whatsappClient.on('ready', async () => {
      console.log('🎉 WHATSAPP CONECTADO NA NUVEM!');
      isConnected = true;
      currentQrCode = '';
      qrGenerated = false;
      
      if (supabaseConnected) {
        try {
          await supabase
            .from('whatsapp_sessions')
            .upsert({
              id: 1,
              status: 'connected',
              connected_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          console.log('✅ Status atualizado no Supabase');
        } catch (error) {
          console.error('❌ Erro ao atualizar status:', error.message);
        }
      }
    });

    // Erros
    whatsappClient.on('auth_failure', (msg) => {
      console.log('❌ Falha na autenticação:', msg);
      isConnected = false;
      qrGenerated = false;
    });

    whatsappClient.on('disconnected', (reason) => {
      console.log('🔌 Desconectado:', reason);
      isConnected = false;
      qrGenerated = false;
      
      console.log('🔄 Tentando reconectar em 10 segundos...');
      setTimeout(() => {
        initializeWhatsApp();
      }, 10000);
    });

    whatsappClient.on('loading_screen', (percent, message) => {
      console.log(`🔄 Carregando: ${percent}% - ${message}`);
    });

    // Inicializar cliente
    await whatsappClient.initialize();
    console.log('✅ Cliente WhatsApp inicializado');
    
  } catch (error) {
    console.error('❌ Erro crítico ao inicializar WhatsApp:', error);
    console.log('🔄 Tentando novamente em 30 segundos...');
    
    // Tentar novamente com delay maior
    setTimeout(() => {
      initializeWhatsApp();
    }, 30000);
  }
}

// ================= MIDDLEWARES =================
app.use(cors());
app.use(express.json());

// ================= ROTAS =================

// Health Check melhorado
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Servidor WhatsApp Online!',
    whatsapp_connected: isConnected,
    supabase_connected: supabaseConnected,
    has_qr: !!currentQrCode,
    timestamp: new Date().toISOString(),
    server: 'Railway Cloud',
    node_version: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Status WhatsApp
app.get('/api/status', async (req, res) => {
  try {
    let supabaseData = null;
    
    if (supabaseConnected) {
      const { data } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('id', 1)
        .single();
      supabaseData = data;
    }

    res.json({
      connected: isConnected,
      status: isConnected ? 'connected' : (currentQrCode ? 'waiting_qr' : 'disconnected'),
      qr_code: currentQrCode,
      has_qr: !!currentQrCode,
      updated_at: supabaseData?.updated_at,
      server: 'railway',
      supabase_connected: supabaseConnected
    });
  } catch (error) {
    res.status(500).json({ 
      connected: false,
      status: 'error',
      error: error.message
    });
  }
});

// Enviar mensagem
app.post('/api/send-message', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ 
        error: 'Phone e message são obrigatórios' 
      });
    }

    if (!isConnected) {
      return res.status(400).json({ 
        error: 'WhatsApp não está conectado',
        has_qr: !!currentQrCode,
        message: currentQrCode ? 'Escaneie o QR Code primeiro' : 'Aguardando conexão...'
      });
    }

    const formattedPhone = phone.replace(/\D/g, '') + '@c.us';
    await whatsappClient.sendMessage(formattedPhone, message);

    res.json({ 
      success: true, 
      message: 'Mensagem enviada com sucesso! ✅',
      phone: phone
    });
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    res.status(500).json({ 
      error: 'Erro ao enviar mensagem', 
      details: error.message 
    });
  }
});

// Reinicializar WhatsApp
app.post('/api/restart', async (req, res) => {
  try {
    if (whatsappClient) {
      await whatsappClient.destroy();
    }
    
    isConnected = false;
    currentQrCode = '';
    qrGenerated = false;
    
    initializeWhatsApp();
    
    res.json({ 
      success: true, 
      message: 'WhatsApp reiniciando...' 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao reiniciar',
      details: error.message 
    });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp Cloud Server',
    version: '2.0.0',
    status: 'running',
    whatsapp: isConnected ? 'connected' : (currentQrCode ? 'waiting_qr' : 'disconnected'),
    supabase: supabaseConnected ? 'connected' : 'not_configured',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      status: '/api/status',
      send_message: 'POST /api/send-message',
      restart: 'POST /api/restart'
    },
    documentation: 'Use /health para status completo do sistema'
  });
});

// ================= INICIALIZAÇÃO =================
app.listen(PORT, '0.0.0.0', () => {
  console.log('=====================================');
  console.log('🚀 WHATSAPP SERVER - RAILWAY EDITION');
  console.log('📍 Porta:', PORT);
  console.log('☁️  Ambiente:', process.env.NODE_ENV || 'development');
  console.log('🔧 Node.js:', process.version);
  console.log('💾 Supabase:', supabaseConnected ? '✅ Conectado' : '❌ Não configurado');
  console.log('=====================================');
  
  // Iniciar WhatsApp após um delay
  setTimeout(() => {
    initializeWhatsApp();
  }, 3000);
});

// Manipulação de erros globais
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rejeição não tratada em:', promise, 'motivo:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não capturada:', error);
});

process.on('SIGINT', async () => {
  console.log('🛑 Desligando servidor gracefulmente...');
  if (whatsappClient) {
    await whatsappClient.destroy();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Recebido SIGTERM, desligando...');
  if (whatsappClient) {
    await whatsappClient.destroy();
  }
  process.exit(0);
});
