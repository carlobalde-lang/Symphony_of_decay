// Serve soltanto i file pubblici del gioco, sull'interfaccia locale.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = new Set(['Symphony_of_decay.html','style.css','studio.css','languages.js','storage.js','audio.js','physics-world.js','objects.js','scenes.js','background.js','studio-ui.js','main.js','vendor/planck-1.3.0.min.js']);
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8' };
http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const file = url.pathname === '/' ? 'Symphony_of_decay.html' : url.pathname.slice(1);
    if (!files.has(file)) { res.writeHead(404); res.end('Not found'); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(path.join(root, file)).on('error', () => { res.statusCode=500; res.end(); }).pipe(res);
}).listen(5173, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:5173'));
