const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal'); // Já está instalado
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= VERIFICAÇÃO DE AMBIENTE =================
console.log('🔍 Verificando variáveis de ambiente...');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Verificar se as variáveis de ambiente existem
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas!');
  console.error('📋 Configure no Railway:');
  console.error('   - SUPABASE_URL: Sua URL do Supabase');
  console.error('   - SUPABASE_ANON_KEY: Sua chave anônima do Supabase');
  console.error('💡 Obtenha essas informações no dashboard do Supabase > Settings > API');
  process.exit(1);
}

console.log('✅ Variáveis de ambiente validadas');
console.log('✅ Node.js version:', process.version);

// ================= CONFIGURAÇÃO SUPABASE =================
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

// Testar conexão com Supabase
async function testSupabaseConnection() {
  try {
    console.log('🔗 Testando conexão com Supabase...');
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('count')
      .limit(1);

    if (error) {
      throw error;
    }

    console.log('✅ Conexão com Supabase estabelecida com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Falha na conexão com Supabase:', error.message);
    console.error('💡 Verifique:');
    console.error('   - URL do Supabase está correta');
    console.error('   - Chave anônima está válida');
    console.error('   - Tabela whatsapp_sessions existe');
    return false;
  }
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

  // QR Code - usando qrcode-terminal
  whatsappClient.on('qr', async (qr) => {
    console.log('📱 QR Code recebido!');
    console.log('🔒 Escaneie o QR Code abaixo com seu WhatsApp:');
    qrcode.generate(qr, { small: true });
    
    currentQrCode = qr;
    
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
      console.error('❌ Erro ao salvar QR:', error.message);
    }
  });

  // Conectado
  whatsappClient.on('ready', async () => {
    console.log('✅ WHATSAPP CONECTADO NA NUVEM!');
    isConnected = true;
    currentQrCode = '';
    
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
  });

  // Erros
  whatsappClient.on('auth_failure', (msg) => {
    console.log('❌ Falha na autenticação:', msg);
    isConnected = false;
    updateStatus('auth_failure');
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('❌ Desconectado:', reason);
    isConnected = false;
    updateStatus('disconnected');
    
    // Tentar reconectar após 5 segundos
    setTimeout(() => {
      console.log('🔄 Tentando reconectar...');
      initializeWhatsApp();
    }, 5000);
  });

  whatsappClient.initialize();
}

// Função para atualizar status
async function updateStatus(status) {
  try {
    await supabase
      .from('whatsapp_sessions')
      .upsert({
        id: 1,
        status: status,
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error.message);
  }
}

// ================= MIDDLEWARES =================
app.use(cors());
app.use(express.json());

// ================= ROTAS =================

// Health Check com informações do sistema
app.get('/health', async (req, res) => {
  const healthInfo = {
    status: 'OK',
    message: 'Servidor WhatsApp Online!',
    whatsapp_connected: isConnected,
    supabase_connected: await testSupabaseConnection(),
    timestamp: new Date().toISOString(),
    server: 'Railway Cloud',
    node_version: process.version,
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.json(healthInfo);
});

// Status WhatsApp
app.get('/api/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw error;

    res.json({
      connected: isConnected,
      status: data?.status || 'disconnected',
      qr_code: currentQrCode || data?.qr_code,
      has_qr: !!(currentQrCode || data?.qr_code),
      updated_at: data?.updated_at,
      server: 'railway',
      environment_ok: !!(supabaseUrl && supabaseKey)
    });
  } catch (error) {
    res.status(500).json({ 
      connected: false,
      status: 'error',
      error: 'Erro ao conectar com o banco',
      details: error.message
    });
  }
});

// Enviar mensagem de teste
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
        status: ' Aguarde a conexão do WhatsApp'
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
    console.error('❌ Erro ao enviar mensagem:', error);
    
    res.status(500).json({ 
      error: 'Erro ao enviar mensagem', 
      details: error.message 
    });
  }
});

// Rota para verificar variáveis de ambiente (apenas desenvolvimento)
app.get('/debug/env', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Acesso negado em produção' });
  }
  
  res.json({
    supabase_url: supabaseUrl ? '✅ Configurada' : '❌ Faltando',
    supabase_key: supabaseKey ? '✅ Configurada' : '❌ Faltando',
    port: PORT,
    node_env: process.env.NODE_ENV
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp Cloud Server',
    version: '1.0.0',
    status: 'running',
    whatsapp: isConnected ? 'connected' : 'disconnected',
    environment: 'railway',
    endpoints: {
      health: '/health',
      status: '/api/status',
      send_message: 'POST /api/send-message'
    },
    documentation: 'Verifique /health para status completo do sistema'
  });
});

// ================= INICIALIZAÇÃO DO SERVIDOR =================
async function startServer() {
  console.log('=====================================');
  console.log('🚀 INICIANDO SERVIDOR WHATSAPP NA NUVEM');
  console.log('📍 Porta:', PORT);
  console.log('☁️  Ambiente: Railway');
  console.log('🔧 Node.js:', process.version);
  console.log('=====================================');
  
  // Testar conexão com Supabase antes de iniciar
  const supabaseConnected = await testSupabaseConnection();
  if (!supabaseConnected) {
    console.error('❌ Não foi possível conectar com Supabase. Encerrando...');
    process.exit(1);
  }
  
  // Iniciar WhatsApp
  initializeWhatsApp();
}

app.listen(PORT, '0.0.0.0', startServer);

// ================= MANIPULAÇÃO DE ERROS =================
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rejeição não tratada em:', promise, 'motivo:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não capturada:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('🛑 Desligando servidor gracefulmente...');
  if (whatsappClient) {
    whatsappClient.destroy();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, desligando...');
  if (whatsappClient) {
    whatsappClient.destroy();
  }
  process.exit(0);
});
