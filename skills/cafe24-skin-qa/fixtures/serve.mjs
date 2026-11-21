// 시험용 정적 서버: node serve.mjs <dir> <port>. glb/usdz/mp4 MIME 지정, 파일명이 bad로 시작하면 octet-stream으로 응답(MIME 오류 재현)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [dir = '.', port = 8765] = process.argv.slice(2);
const T = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', png: 'image/png', gif: 'image/gif', mp4: 'video/mp4', glb: 'model/gltf-binary', usdz: 'model/vnd.usdz+zip', json: 'application/json' };
http.createServer((q, r) => {
  const p = path.join(dir, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (q.method !== 'GET' && q.method !== 'HEAD') { r.writeHead(405); return r.end(); }
  fs.readFile(p, (e, b) => { if (e || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end('nf'); }
    const n = path.basename(p), ext = n.split('.').pop();
    r.writeHead(200, { 'content-type': n.startsWith('bad') ? 'application/octet-stream' : T[ext] || 'application/octet-stream', 'content-length': b.length }); r.end(q.method === 'HEAD' ? undefined : b); });
}).listen(Number(port), () => console.log('serving', dir, port));
