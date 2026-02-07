const { execSync } = require('child_process');

const ports = [3001, 5173, 5174, 5175, 5176, 5177, 5178];

ports.forEach(port => {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8', shell: true });
    const lines = out.split('\n').filter(l => l.includes(':' + port) && l.includes('LISTENING'));
    const pidSet = new Set();
    lines.forEach(l => {
      const parts = l.trim().split(/\s+/);
      const pid = parseInt(parts[parts.length - 1]);
      if (pid > 0) pidSet.add(pid);
    });
    pidSet.forEach(pid => {
      try {
        process.kill(pid, 'SIGKILL');
        console.log('Killed PID ' + pid + ' on port ' + port);
      } catch (e) {
        console.log('Could not kill PID ' + pid + ': ' + e.message);
      }
    });
    if (pidSet.size === 0) console.log('No process on port ' + port);
  } catch (e) {
    console.log('No process on port ' + port);
  }
});

console.log('Done');
