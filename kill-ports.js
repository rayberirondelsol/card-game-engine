const { execSync } = require('child_process');

const ports = [3001, 5173, 5174, 5175, 5176, 5177, 5178];
const isWin = process.platform === 'win32';

ports.forEach(port => {
  try {
    let pids = [];
    if (isWin) {
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
      pids = Array.from(pidSet);
    } else {
      const output = execSync(`lsof -ti:${port}`, { encoding: 'utf8' });
      pids = output.trim().split('\n').filter(Boolean).map(Number);
    }
    pids.forEach(pid => {
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
console.log('Done');
