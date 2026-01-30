import crypto from 'crypto';

// Generate a new RSA key pair
const { privateKey } = crypto.generateKeyPairSync('rsa', {
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

console.log("Copy the following key (including BEGIN and END lines) to your JWT_PRIVATE_KEY variable:");
console.log("");
console.log(privateKey);
console.log("");
