const { execSync } = require('child_process');
const port = process.argv[2] || '3001';

try {
  // Try Windows-style kill
  const output = execSync('netstat -ano', { encoding: 'utf8', shell: true });
  const lines = output.split('\n').filter(line => line.includes(':' + port) && line.includes('LISTENING'));
  const pidSet = new Set();
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && !isNaN(parseInt(pid)) && parseInt(pid) > 0) {
      pidSet.add(pid);
    }
  }
  if (pidSet.size === 0) {
    console.log('No process found on port ' + port);
    process.exit(0);
  }
  for (const pid of pidSet) {
    console.log('Killing PID ' + pid + ' on port ' + port);
    try {
      execSync('taskkill /f /pid ' + pid, { encoding: 'utf8', shell: true });
      console.log('Killed PID ' + pid);
    } catch (e) {
      // try SIGKILL as fallback
      try {
        process.kill(parseInt(pid), 'SIGKILL');
        console.log('Killed PID ' + pid + ' via SIGKILL');
      } catch (e2) {
        console.log('Failed to kill PID ' + pid);
      }
    }
  }
} catch (e) {
  console.log('Error:', e.message);
}
