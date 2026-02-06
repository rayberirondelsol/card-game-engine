import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const clientDir = path.join(process.cwd(), 'client');
console.log('Starting Vite dev server from:', clientDir);

execSync('npx vite --port 5173 --host', {
  cwd: clientDir,
  stdio: 'inherit'
});
