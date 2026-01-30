const crypto = require('crypto');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('--- STARTING COMPREHENSIVE AUTH FIX ---');

// 1. Generate fresh keys
console.log('Generating fresh RSA keys...');
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
});

const privateKeyPem = privateKey.export({
    type: 'pkcs8',
    format: 'pem'
}).toString().trim();

const publicKeyJwk = publicKey.export({
    format: 'jwk'
});

const jwks = {
    keys: [{
        use: 'sig',
        kty: publicKeyJwk.kty,
        n: publicKeyJwk.n,
        e: publicKeyJwk.e,
        alg: 'RS256'
    }]
};
const jwksStr = JSON.stringify(jwks);

// 2. Update .env.local
console.log('Updating .env.local...');
let envContent = fs.readFileSync('.env.local', 'utf8');

function updateEnvVar(content, name, value) {
    const lines = content.split('\n');
    let found = false;
    const newLines = lines.map(line => {
        if (line.trim().startsWith(name + ' =') || line.trim().startsWith(name + '=')) {
            found = true;
            // For .env.local, we'll store the private key with literal \n to keep it on one line if preferred, 
            // but many tools prefer actual newlines or quoted multi-line.
            // We'll use quoted single line with escapes for simplicity in parsing later, but ensure it's correct.
            const escapedValue = value.replace(/\n/g, '\\n');
            return `${name} = "${escapedValue}"`;
        }
        return line;
    });
    if (!found) {
        const escapedValue = value.replace(/\n/g, '\\n');
        newLines.push(`${name} = "${escapedValue}"`);
    }
    return newLines.join('\n');
}

envContent = updateEnvVar(envContent, 'JWT_PRIVATE_KEY', privateKeyPem);
envContent = updateEnvVar(envContent, 'JWKS', jwksStr);
fs.writeFileSync('.env.local', envContent);
console.log('✅ .env.local updated.');

// 3. Update Convex Environment Variables
console.log('Updating Convex environment variables...');

function setConvexEnv(name, value) {
    console.log(`Setting ${name} in Convex...`);
    try {
        // We pass the RAW value (with actual newlines) to stdin
        execSync(`npx convex env set ${name}`, { input: value });
        console.log(`✅ ${name} set successfully.`);
    } catch (e) {
        console.error(`❌ Failed to set ${name}:`, e.message);
    }
}

setConvexEnv('JWT_PRIVATE_KEY', privateKeyPem);
setConvexEnv('JWKS', jwksStr);

// 4. Verify the setup locally
console.log('Verifying setup locally...');
try {
    const message = Buffer.from("test-verification");
    const signature = crypto.sign("sha256", message, privateKey);
    const pubKeyObj = crypto.createPublicKey({
        key: jwks.keys[0],
        format: 'jwk'
    });
    const isValid = crypto.verify("sha256", message, pubKeyObj, signature);
    if (isValid) {
        console.log('✅ Local verification successful! Keys are consistent.');
    } else {
        throw new Error('Local verification failed! Keys are not consistent.');
    }
} catch (e) {
    console.error('❌ Local verification error:', e.message);
    process.exit(1);
}

console.log('--- AUTH FIX COMPLETED SUCCESSFULLY ---');
console.log('Please restart your dev server and clear browser site data (cookies/local storage) before trying to login again.');
