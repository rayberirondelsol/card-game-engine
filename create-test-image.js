const fs = require('fs');

// Minimal valid PNG (100x140 pixels, blue-ish card)
const buf = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAABhGlDQ1BJQ0MgcHJvZmlsZQAAeJx9kT1Iw0AYht+mSkUqDnYQcchQnSyIijhKFYtgobQVWnUwufRHaNKQpLg4Cq4FB3+LVQcXZ10dXAVB8AfE1cVJ0UVK/C4ptIjxjgNXfO97X/fdc4ArFRMtm2IAjbptpuIxMZtbFQIvCCGCAPoQ1ZipF4+l0nB8x9c9/Xh+i8c93/On6tfMcAnEE+w0rBJN4gnNzed4733kKVYSZ4nHjNoQOIHpsutvnIuOCzwzJCRTc4Ri8RSYQ3HNlgWuEo8RRxNKpo35B1WeG8xVktV1jznvyF4by2kuY6zRHkMCaxBAgiSNRQRgU24rTqpFin0XzYxZ/0PJn0KuQqg5xjABVokF0/+B/93ahckJNykYAxoOdP2xhEQp0gWbXx72MaZ+AvisAV3q2N+PASmlp4i3agIIbIGh1G2Fg4C7EWnPlt/Wk+TP4J42mbkBHBwCo8XKs3e4e3d3bv/ba8/vA/lxyqsPSH5HgAAAAlwSFlzAAAuIwAALiMBeKU/dgAAAAd0SU1FB+oBAQ0hBR0lSKAAAAAdSURBVHja7cEBDQAAAMKg909tDjegAAAAAADcagYvAAH/FKEtAAAAAElFTkSuQmCC',
  'base64'
);

fs.writeFileSync('test-card.png', buf);
console.log('Created test-card.png:', buf.length, 'bytes');
