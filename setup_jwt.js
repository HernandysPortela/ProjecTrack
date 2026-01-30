const { generateKeyPairSync } = require('crypto');
const { spawn } = require('child_process');

// Generate the key
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

console.log("Gerando chave RSA PKCS#8...");

// Set the env var using spawn to avoid shell escaping issues
const child = spawn('npx', ['convex', 'env', 'set', 'JWT_PRIVATE_KEY', privateKey], { stdio: 'inherit', shell: true });

child.on('close', (code) => {
  if (code === 0) {
    console.log("\n✅ Sucesso! JWT_PRIVATE_KEY configurada no Convex.");
    console.log("Agora reinicie o backend com: npx convex dev");
  } else {
    console.log("\n❌ Falha ao configurar automaticamente. Por favor, copie a chave abaixo e adicione manualmente no Dashboard do Convex (Settings -> Environment Variables):");
    console.log("\n" + privateKey + "\n");
  }
});
