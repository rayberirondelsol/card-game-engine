const { execSync } = require('child_process');
const http = require('http');

// Use Windows 'netstat' via cmd to find PID on port 3001
function findAndKill() {
  try {
    const output = execSync('cmd /c "netstat -ano | findstr :3001 | findstr LISTENING"', { encoding: 'utf8' });
    console.log('Netstat output:', output);
    const lines = output.trim().split('\n');
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(parseInt(pid))) {
        pids.add(parseInt(pid));
      }
    }
    for (const pid of pids) {
      try {
        execSync(`cmd /c "taskkill /F /PID ${pid}"`, { encoding: 'utf8' });
        console.log('Killed PID:', pid);
      } catch (err) {
        console.log('taskkill failed for PID', pid, ':', err.message);
      }
    }
    if (pids.size === 0) {
      console.log('No process found listening on port 3001');
    }
  } catch (e) {
    console.log('netstat failed:', e.message);
  }
}

findAndKill();
