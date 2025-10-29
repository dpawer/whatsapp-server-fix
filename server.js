const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= VERIFICAÇÃO DE AMBIENTE =================
console.log('🔍 Verificando variáveis de ambiente...');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
let supabaseConnected = false;

// Configuração do Supabase (com fallback)
if (supabaseUrl && supabaseKey) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(supabaseUrl, supabaseKey);
  supabaseConnected = true;
  console.log('✅ Supabase configurado com sucesso');
} else {
  console.warn('⚠️  Supabase não configurado - funcionando em modo offline');
  console.warn('💡 Configure SUPABASE_URL e SUPABASE_ANON_KEY no Railway');
}

// ================= CONFIGURAÇÃO WHATSAPP =================
let whatsappClient = null;
let isConnected = false;
let currentQrCode = '';

function initializeWhatsApp() {
  console.log('🔄 Iniciando cliente WhatsApp...');
  
  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      clientId: "whatsapp-railway"
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    }
  });

  // QR Code
  whatsappClient.on('qr', async (qr) => {
    console.log('📱 QR Code recebido!');
    console.log('🔒 Escaneie o QR Code abaixo com seu WhatsApp:');
    qrcode.generate(qr, { small: true });
    
    currentQrCode = qr;
    
    // Salvar no Supabase se disponível
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
  });

  // Conectado
  whatsappClient.on('ready', async () => {
    console.log('✅ WHATSAPP CONECTADO NA NUVEM!');
    isConnected = true;
    currentQrCode = '';
    
    // Atualizar status no Supabase se disponível
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
        console.error('❌ Erro ao atualizar status no Supabase:', error.message);
      }
    }
  });

  // Erros
  whatsappClient.on('auth_failure', (msg) => {
    console.log('❌ Falha na autenticação:', msg);
    isConnected = false;
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('❌ Desconectado:', reason);
    isConnected = false;
    
    // Tentar reconectar após 5 segundos
    setTimeout(() => {
      console.log('🔄 Tentando reconectar...');
      initializeWhatsApp();
    }, 5000);
  });

  whatsappClient.initialize();
}

// ================= MIDDLEWARES =================
app.use(cors());
app.use(express.json());

// ================= ROTAS =================

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Servidor WhatsApp Online!',
    whatsapp_connected: isConnected,
    supabase_connected: supabaseConnected,
    timestamp: new Date().toISOString(),
    server: 'Railway Cloud',
    node_version: process.version
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
      status: supabaseData?.status || (isConnected ? 'connected' : 'disconnected'),
      qr_code: currentQrCode || supabaseData?.qr_code,
      has_qr: !!(currentQrCode || supabaseData?.qr_code),
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
        error: 'WhatsApp não está conectado' 
      });
    }

    const formattedPhone = phone.replace(/\D/g, '') + '@c.us';
    await whatsappClient.sendMessage(formattedPhone, message);

    res.json({ 
      success: true, 
      message: 'Mensagem enviada da nuvem! 🌩️',
      phone: phone
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao enviar mensagem', 
      details: error.message 
    });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp Cloud Server',
    version: '1.0.0',
    status: 'running',
    whatsapp: isConnected ? 'connected' : 'disconnected',
    supabase: supabaseConnected ? 'connected' : 'not_configured',
    environment: 'railway',
    endpoints: {
      health: '/health',
      status: '/api/status',
      send_message: 'POST /api/send-message'
    }
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('=====================================');
  console.log('🚀 SERVIDOR WHATSAPP NA NUVEM!');
  console.log('📍 Porta:', PORT);
  console.log('☁️  Ambiente: Railway');
  console.log('🔧 Node.js:', process.version);
  console.log('💾 Supabase:', supabaseConnected ? '✅ Conectado' : '❌ Não configurado');
  console.log('=====================================');
  
  // Iniciar WhatsApp
  initializeWhatsApp();
});
