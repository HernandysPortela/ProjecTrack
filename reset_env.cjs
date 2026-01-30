
const { execSync } = require('child_process');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');

const getEnvVar = (name) => {
    const lines = envFile.split('\n');
    for (const line of lines) {
        if (line.trim().startsWith(name)) {
            const parts = line.split('=');
            parts.shift();
            let val = parts.join('=').trim();
            // Remove surrounding quotes if present
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            return val;
        }
    }
    return null;
};

const varsToSet = {
    'JWKS': getEnvVar('JWKS'),
    'JWT_PRIVATE_KEY': getEnvVar('JWT_PRIVATE_KEY'),
    'SITE_URL': getEnvVar('SITE_URL'),
    'GMAIL_USER': getEnvVar('GMAIL_USER'),
    'GMAIL_PASS': getEnvVar('GMAIL_PASS'),
    'VLY_APP_NAME': getEnvVar('VLY_APP_NAME'),
};

for (const [name, value] of Object.entries(varsToSet)) {
    if (value) {
        console.log(`Setting ${name}...`);
        try {
            execSync(`npx convex env set ${name}`, { input: value });
            console.log(`✅ ${name} set successfully.`);
        } catch (e) {
            console.error(`❌ Failed to set ${name}:`, e.message);
        }
    }
}

if (fs.existsSync('temp_val.txt')) fs.unlinkSync('temp_val.txt');
console.log('Done resetting environment variables.');
