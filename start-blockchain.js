const { spawn } = require('child_process');

// Simple local blockchain using ganache-like approach
const ganache = spawn('npx', ['ganache', '--deterministic', '--accounts', '10', '--host', '0.0.0.0', '--port', '8545'], {
  stdio: 'inherit',
  shell: true
});

ganache.on('error', (err) => {
  console.error('Failed to start ganache:', err);
  // Fallback to hardhat with minimal config
  const hardhat = spawn('npx', ['hardhat', 'node', '--hostname', '0.0.0.0'], {
    stdio: 'inherit',
    shell: true
  });
});