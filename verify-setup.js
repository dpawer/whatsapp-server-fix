const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 Verificando configuração do sistema...');

// Verificar Node.js
console.log(`✅ Node.js: ${process.version}`);

// Verificar Chromium
const paths = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome'
];

let found = false;
paths.forEach(path => {
  if (fs.existsSync(path)) {
    console.log(`✅ Chromium encontrado: ${path}`);
    found = true;
    
    try {
      // Verificar versão
      const version = execSync(`${path} --version`).toString().trim();
      console.log(`📋 Versão: ${version}`);
    } catch (e) {
      console.log(`⚠️  Não foi possível verificar versão: ${e.message}`);
    }
  }
});

if (!found) {
  console.log('❌ Chromium não encontrado em nenhum caminho conhecido');
  console.log('📍 Caminhos verificados:', paths);
}

// Verificar dependências
console.log('📦 Verificando dependências npm...');
try {
  const deps = require('./package.json').dependencies;
  console.log('✅ Dependências configuradas:', Object.keys(deps));
} catch (e) {
  console.log('❌ Erro ao verificar package.json:', e.message);
}

console.log('🎉 Verificação completa!');
