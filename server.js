const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Supabase
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// WhatsApp
let whatsappClient = null;
let isConnected = false;

function initializeWhatsApp() {
  console.log('🔄 Iniciando WhatsApp...');
  
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
    try {
      const qrImage = await qrcode.toDataURL(qr);
      
      await supabase
        .from('whatsapp_sessions')
        .upsert({
          id: 1,
          qr_code: qr,
          qr_image: qrImage,
          status: 'waiting_qr',
          updated_at: new Date().toISOString()
        });
      
      console.log('✅ QR Code salvo no Supabase');
    } catch (error) {
      console.error('❌ Erro ao salvar QR:', error.message);
    }
  });

  // Conectado
  whatsappClient.on('ready', async () => {
    console.log('✅ WHATSAPP CONECTADO NA NUVEM!');
    isConnected = true;
    
    await supabase
      .from('whatsapp_sessions')
      .upsert({
        id: 1,
        status: 'connected',
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
  });

  // Erros
  whatsappClient.on('auth_failure', (msg) => {
    console.log('❌ Falha na autenticação:', msg);
    isConnected = false;
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('❌ Desconectado:', reason);
    isConnected = false;
  });

  whatsappClient.initialize();
}

// ================= ROTAS =================

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Servidor WhatsApp Online!',
    whatsapp_connected: isConnected,
    timestamp: new Date().toISOString(),
    server: 'Railway Cloud'
  });
});

// Status WhatsApp
app.get('/api/status', async (req, res) => {
  try {
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('id', 1)
      .single();

    res.json({
      connected: isConnected,
      status: data?.status || 'disconnected',
      qr_code: data?.qr_code,
      qr_image: data?.qr_image,
      updated_at: data?.updated_at,
      server: 'railway'
    });
  } catch (error) {
    res.status(500).json({ 
      connected: false,
      status: 'error',
      error: 'Erro ao conectar com o banco'
    });
  }
});

// Enviar mensagem de teste
app.post('/api/send-message', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!isConnected) {
      return res.status(400).json({ error: 'WhatsApp não está conectado' });
    }

    const formattedPhone = phone.replace(/\D/g, '') + '@c.us';
    await whatsappClient.sendMessage(formattedPhone, message);

    res.json({ success: true, message: 'Mensagem enviada da nuvem! 🌩️' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp Cloud Server',
    version: '1.0.0',
    status: 'running',
    whatsapp: isConnected ? 'connected' : 'disconnected',
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
  console.log('=====================================');
  
  // Iniciar WhatsApp
  initializeWhatsApp();
});
