const crypto = require('crypto');
const fs = require('fs');
console.log('Testing internal key generation...');

const { privateKey: testPriv } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const testPrivPem = testPriv.export({ type: 'pkcs8', format: 'pem' });
const testPrivObj = crypto.createPrivateKey(testPrivPem);
console.log('✅ Internal key generation and object creation successful.');


// Read current .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');

const getEnvVar = (name) => {
    const lines = envFile.split('\n');
    for (const line of lines) {
        if (line.trim().startsWith(name)) {
            const parts = line.split('=');
            parts.shift();
            let val = parts.join('=').trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            return val;
        }
    }
    return null;
};

const privateKeyRaw = getEnvVar('JWT_PRIVATE_KEY');
if (!privateKeyRaw) {
    console.error('JWT_PRIVATE_KEY not found in .env.local');
    process.exit(1);
}
const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
console.log('Private Key Start:', privateKey.substring(0, 50));
console.log('Private Key End:', privateKey.substring(privateKey.length - 50));


const jwksRaw = getEnvVar('JWKS');
if (!jwksRaw) {
    console.error('JWKS not found in .env.local');
    process.exit(1);
}

// Handle double-escaped or escaped quotes
let jwksStr = jwksRaw;
if (jwksStr.includes('\\"')) {
    jwksStr = jwksStr.replace(/\\"/g, '"');
}

const jwks = JSON.parse(jwksStr);


console.log('Validating Keys...');

try {
    const message = Buffer.from("test-message");

    // 2. Sign with private key
    const privateKeyObj = crypto.createPrivateKey(privateKey);
    const signature = crypto.sign("sha256", message, privateKeyObj);
    console.log('✅ Signing successful.');

    // 3. Verify with public key from JWKS
    const key = jwks.keys[0];
    console.log('JWK:', JSON.stringify(key));

    const publicKey = crypto.createPublicKey({
        key: key,
        format: 'jwk'
    });

    const isValid = crypto.verify("sha256", message, publicKey, signature);

    if (isValid) {
        console.log('✅ Verification successful! Keys match.');
    } else {
        console.error('❌ Verification failed! Keys do NOT match.');
    }
} catch (e) {
    console.error('❌ Error during validation:', e.message);
    if (e.stack) console.error(e.stack);
}


