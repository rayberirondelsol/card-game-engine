const { execSync, spawnSync } = require('child_process');
const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      resolve(err.code === 'EADDRINUSE');
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port, '0.0.0.0');
  });
}

async function main() {
  const inUse = await checkPort(3001);
  console.log('Port 3001 in use:', inUse);

  if (!inUse) {
    console.log('Port 3001 is free');
    return;
  }

  // Try to find all node processes
  try {
    const result = spawnSync('tasklist', ['/FI', 'IMAGENAME eq node.exe', '/FO', 'CSV'], { encoding: 'utf8', shell: true });
    console.log('Node processes:', result.stdout);

    // Kill all node.exe processes
    const killResult = spawnSync('taskkill', ['/f', '/IM', 'node.exe'], { encoding: 'utf8', shell: true });
    console.log('Kill result:', killResult.stdout, killResult.stderr);
  } catch (e) {
    console.log('Error:', e.message);
  }

  // Verify
  setTimeout(async () => {
    const stillInUse = await checkPort(3001);
    console.log('Port 3001 still in use after kill:', stillInUse);
  }, 2000);
}

main();
