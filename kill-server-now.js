const http = require('http');

// Send a request to the server to shut itself down, or find and kill the PID
const { execSync } = require('child_process');

try {
  // On Windows, use netstat to find PIDs
  const output = execSync('netstat -ano', { encoding: 'utf8', shell: true });
  const lines = output.split('\n');
  const pidsToKill = new Set();

  for (const line of lines) {
    if (line.includes(':3001') && line.includes('LISTENING')) {
      const parts = line.trim().split(/\s+/);
      const pid = parseInt(parts[parts.length - 1]);
      if (pid > 0) pidsToKill.add(pid);
    }
    if (line.includes(':5173') && line.includes('LISTENING')) {
      const parts = line.trim().split(/\s+/);
      const pid = parseInt(parts[parts.length - 1]);
      if (pid > 0) pidsToKill.add(pid);
    }
  }

  console.log('PIDs to kill:', Array.from(pidsToKill));

  for (const pid of pidsToKill) {
    try {
      process.kill(pid, 'SIGTERM');
      console.log('Sent SIGTERM to', pid);
    } catch (e) {
      console.log('Failed to kill', pid, e.message);
      try {
        execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf8', shell: true });
        console.log('taskkill succeeded for', pid);
      } catch (e2) {
        console.log('taskkill also failed for', pid, e2.message);
      }
    }
  }
} catch (e) {
  console.log('Error:', e.message);
}
