import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simulate what cards.js does
const routesDir = path.join(__dirname, 'server', 'src', 'routes');
console.log('routes dir: ' + routesDir);
console.log('.. from routes: ' + path.join(routesDir, '..'));
console.log('../.. from routes: ' + path.join(routesDir, '..', '..'));
console.log('../../uploads from routes: ' + path.join(routesDir, '..', '..', 'uploads'));

// What index.js does
const srcDir = path.join(__dirname, 'server', 'src');
console.log('src dir: ' + srcDir);
console.log('../uploads from src: ' + path.join(srcDir, '..', 'uploads'));
