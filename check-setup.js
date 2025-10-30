const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 Verificando configuração do servidor...');

// Verificar se Chromium existe
const chromiumPaths = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/nix/store/*chromium*/bin/chromium'
];

let chromiumFound = false;
for (const path of chromiumPaths) {
  try {
    if (fs.existsSync(path)) {
      console.log(`✅ Chromium encontrado em: ${path}`);
      chromiumFound = true;
      break;
    }
  } catch (e) {}
}

if (!chromiumFound) {
  console.log('❌ Chromium não encontrado!');
  process.exit(1);
}

// Verificar dependências do sistema
try {
  console.log('📦 Verificando dependências do sistema...');
  execSync('ldd /usr/bin/chromium | grep -i "not found"', { stdio: 'pipe' });
  console.log('✅ Todas as dependências do Chromium estão presentes');
} catch (e) {
  console.log('❌ Faltando dependências do Chromium');
}

console.log('🎉 Verificação concluída!');
