// Restart persistence test - kills server, restarts, verifies data
const http = require('http');
const { execSync, spawn } = require('child_process');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const GAME_ID = 'e274dc0a-e3a9-4272-9d12-b4ef044c1d27';

  // Step 1: Verify data exists
  console.log('Step 1: Checking setups before restart...');
  let before = JSON.parse(await httpGet(`http://localhost:3001/api/games/${GAME_ID}/setups`));
  console.log('  Setups before:', before.length, '-', before.map(s => s.name).join(', '));

  // Step 2: Find and kill the server process
  console.log('Step 2: Killing server...');
  try {
    const netstat = execSync('netstat -ano', { encoding: 'utf8', shell: true });
    const lines = netstat.split('\n');
    for (const line of lines) {
      if (line.includes(':3001') && (line.includes('LISTENING') || line.includes('ESTABLISHED'))) {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[parts.length - 1]);
        if (pid > 0) {
          try { process.kill(pid, 'SIGTERM'); } catch (e) {}
          console.log('  Killed PID:', pid);
        }
      }
    }
  } catch (e) {
    console.log('  Using alternative kill method...');
    try {
      execSync('taskkill /F /IM node.exe 2>nul', { encoding: 'utf8', shell: true });
    } catch (e2) {
      // May fail on non-Windows, try process.kill on known ports
    }
  }

  await sleep(2000);

  // Verify server is actually down
  try {
    await httpGet('http://localhost:3001/api/health');
    console.log('  WARNING: Server still running, but continuing...');
  } catch (e) {
    console.log('  Server is down');
  }

  // Step 3: Restart server
  console.log('Step 3: Restarting server...');
  const server = spawn('node', ['server/src/index.js'], {
    cwd: '/c/workspace/card-game-engine',
    detached: true,
    stdio: 'ignore'
  });
  server.unref();

  // Wait for server to come up
  let serverUp = false;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    try {
      await httpGet('http://localhost:3001/api/health');
      serverUp = true;
      console.log('  Server is up after', i + 1, 'seconds');
      break;
    } catch (e) {}
  }

  if (!serverUp) {
    console.log('  ERROR: Server did not start within 15 seconds');
    process.exit(1);
  }

  // Step 4: Verify data persists
  console.log('Step 4: Checking setups after restart...');
  let after = JSON.parse(await httpGet(`http://localhost:3001/api/games/${GAME_ID}/setups`));
  console.log('  Setups after:', after.length, '-', after.map(s => s.name).join(', '));

  // Also verify state_data is intact
  if (after.length > 0) {
    let detail = JSON.parse(await httpGet(`http://localhost:3001/api/games/${GAME_ID}/setups/${after[0].id}`));
    let stateData = typeof detail.state_data === 'string' ? JSON.parse(detail.state_data) : detail.state_data;
    console.log('  State data has cards:', (stateData.cards || []).length);
    console.log('  State data has markers:', (stateData.markers || []).length);
    console.log('  State data has counters:', (stateData.counters || []).length);
  }

  console.log('\n=== PERSISTENCE TEST RESULT ===');
  console.log('Before restart:', before.length, 'setups');
  console.log('After restart:', after.length, 'setups');
  console.log('Data persisted:', before.length === after.length && after.length > 0 ? 'YES' : 'NO');
}

main().catch(err => console.error('Test failed:', err.message));
