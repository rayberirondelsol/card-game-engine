const { execSync } = require('child_process');

// Find and kill processes on ports 3001 and 5173
[3001, 5173].forEach(port => {
  try {
    const output = execSync(
      `cmd /c "netstat -ano | findstr :${port} | findstr LISTENING"`,
      { encoding: 'utf8' }
    );
    const lines = output.trim().split('\n');
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(parseInt(pid)) && parseInt(pid) > 0) {
        pids.add(parseInt(pid));
      }
    }
    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGKILL');
        console.log(`Killed PID ${pid} on port ${port}`);
      } catch (err) {
        console.log(`Could not kill PID ${pid}: ${err.message}`);
      }
    }
  } catch (e) {
    console.log(`No process on port ${port}`);
  }
});

console.log('Done stopping servers');
