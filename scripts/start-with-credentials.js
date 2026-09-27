const { spawnSync } = require('child_process');
const readline = require('readline');
const { Writable } = require('stream');

let hidden = false;
const output = new Writable({
  write(chunk, encoding, done) {
    if (!hidden) process.stdout.write(chunk, encoding);
    done();
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output,
  terminal: true
});

async function promptCredentials() {
  return new Promise((resolve) => {
    rl.question('Enter Hannaford username: ', (username) => {
      rl.question('Enter Hannaford password: ', (password) => {
        hidden = false;
        process.stdout.write('\n');
        rl.close();
        resolve({ username, password });
      });
      hidden = true;
    });
  });
}

async function main() {
  if (!process.stdin.isTTY) throw new Error('Use an interactive terminal for hidden password entry.');
  rl.on('SIGINT', () => { process.stdout.write('\n'); rl.close(); process.exit(130); });
  const { username, password } = await promptCredentials();
  if (!username || !password) throw new Error('Username and password are required.');
  
  // Keep credentials in the child process environment instead of writing them to disk.
  console.log('Starting local server at http://127.0.0.1:3000');
  const result = spawnSync(process.execPath, [
    require.resolve('next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1'
  ], {
    stdio: 'inherit',
    env: { ...process.env, HANNAFORD_USERNAME: username, HANNAFORD_PASSWORD: password }
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

main().catch((error) => { rl.close(); console.error(error.message); process.exitCode = 1; });
