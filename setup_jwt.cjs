const { generateKeyPairSync } = require('crypto');
const { execSync } = require('child_process');

console.log("Generating RSA Key Pair...");

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

console.log("Key generated successfully.");
console.log("\n----------------------------------------------------------------");
console.log(privateKey);
console.log("----------------------------------------------------------------\n");

try {
  console.log("Attempting to set JWT_PRIVATE_KEY in Convex...");
  // Use a safer way to pass the variable if possible, but for now we try direct command
  // We replace newlines with \n literal for the command line if needed, or keep them if the shell supports it.
  // However, passing multiline strings to execSync is fragile.
  // Let's try to set it.
  
  // Note: If this fails, the user has the key printed above.
  execSync(`npx convex env set JWT_PRIVATE_KEY "${privateKey}"`, { stdio: 'inherit' });
  console.log("Successfully set JWT_PRIVATE_KEY!");
} catch (error) {
  console.error("Could not automatically set the environment variable.");
  console.error("Please copy the key between the dashed lines above and paste it into your Convex Dashboard Environment Variables as 'JWT_PRIVATE_KEY'.");
}
