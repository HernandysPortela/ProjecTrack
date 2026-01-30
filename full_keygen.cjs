
const crypto = require('crypto');
const fs = require('fs');

// Generate RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
});

// Export private key in PKCS8 PEM format
const privateKeyPem = privateKey.export({
    type: 'pkcs8',
    format: 'pem'
});

// Export public key in JWK format
const publicKeyJwk = publicKey.export({
    format: 'jwk'
});

// Format JWKS
const jwks = {
    keys: [{
        use: 'sig',
        kty: publicKeyJwk.kty,
        n: publicKeyJwk.n,
        e: publicKeyJwk.e,
        // kid: crypto.randomBytes(16).toString('hex') // Optional
    }]
};

const result = {
    JWT_PRIVATE_KEY: privateKeyPem.trim(),
    JWKS: JSON.stringify(jwks)
};

fs.writeFileSync('keys.json', JSON.stringify(result, null, 2));
console.log('Keys written to keys.json');

