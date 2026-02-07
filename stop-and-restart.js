const { execSync } = require('child_process');

const ports = [3001, 5173, 5174];

ports.forEach(port => {
  try {
    const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8', shell: true });
    const lines = output.trim().split('\n').filter(Boolean);
    const pidSet = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(parseInt(pid)) && parseInt(pid) > 0) {
        pidSet.add(parseInt(pid));
      }
    }
    Array.from(pidSet).forEach(pid => {
      try {
        process.kill(pid, 'SIGKILL');
        console.log(`Killed PID ${pid} on port ${port}`);
      } catch (err) {
        console.log(`Could not kill PID ${pid}: ${err.message}`);
      }
    });
  } catch (e) {
    console.log(`No process on port ${port}`);
  }
});

console.log('All processes stopped.');
