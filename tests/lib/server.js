// A tiny static file server for the repo root, so the rig needs nothing but Node.
// Run on its own with `npm run serve` (then open http://localhost:8810/), or let check.js start it.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
  '.txt': 'text/plain', '.md': 'text/plain; charset=utf-8',
};

function start(port = 8810) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
      const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
      // Byte ranges, so videos can seek and play as they would on GitHub Pages.
      const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
      if (range) {
        const a = range[1] ? +range[1] : 0, b = range[2] ? +range[2] : st.size - 1;
        res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1 });
        return fs.createReadStream(file, { start: a, end: b }).pipe(res);
      }
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
  });
  return new Promise(resolve => server.listen(port, () => resolve(server)));
}

module.exports = { start, ROOT };

if (require.main === module) {
  const port = +(process.env.PORT || 8810);
  start(port).then(() => console.log(`Serving ${ROOT} at http://localhost:${port}/  (Ctrl+C to stop)`));
}
