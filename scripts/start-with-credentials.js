const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function promptCredentials() {
  return new Promise((resolve) => {
    rl.question('Enter Hannaford username: ', (username) => {
      rl.question('Enter Hannaford password: ', (password) => {
        rl.close();
        resolve({ username, password });
      });
    });
  });
}

async function main() {
  const { username, password } = await promptCredentials();
  
  // Create or update .env.local file
  const envContent = `HANNAFORD_USERNAME=${username}\nHANNAFORD_PASSWORD=${password}`;
  fs.writeFileSync(path.join(process.cwd(), '.env.local'), envContent);
  
  // Start the Next.js server
  console.log('Starting server with Hannaford credentials...');
  execSync('npm run dev', { stdio: 'inherit' });
}

main().catch(console.error);
