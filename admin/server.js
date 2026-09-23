#!/usr/bin/env node
/* server.js — local admin for the portfolio. `node admin/server.js` → http://localhost:3000
   · GET  /                     admin panel (admin/index.html)
   · GET  /site/                live preview of the generated site (needs http:// for page transitions)
   · GET  /api/content          { projects, notes, site }
   · POST /api/projects|notes   create or update (send "id" to update)
   · DELETE /api/projects|notes/:id
   · POST /api/site             update the online/offline status and the About page
   · POST /api/upload           { name, data(base64), kind?:"resume" } → img/ or files/<file>, returns { path }
   · POST /api/rebuild          regenerate everything from content/*.json
   Every change writes content/*.json and runs build(). Listens on 127.0.0.1 only and has NO authentication. */
const http = require('http'), fs = require('fs'), path = require('path');
const { build, read, write, slug, TYPES } = require('./build');
const PORT = process.env.PORT || 3000, ROOT = path.join(__dirname, '..');
const FILES = { projects: 'projects.json', notes: 'notes.json' };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.pdf': 'application/pdf', '.gif': 'image/gif', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type }); res.end(Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body)); };
const body = (req, max = 1e6) => new Promise((ok, no) => { let s = ''; req.on('data', c => { s += c; if (s.length > max) { no(new Error('Body too large')); req.destroy(); } }); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch { no(new Error('Invalid JSON')); } }); });
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);

/* Validate + normalise what the form sends. Anything unexpected is dropped. */
function clean(kind, d) {
  const title = str(d.title, 120); if (!title) throw new Error('Title is required');
  if (kind === 'projects') {
    const image = str(d.image, 300); if (image && !/^(img\/[\w.-]+|https?:\/\/\S+)$/.test(image)) throw new Error('Invalid image path');
    return { id: str(d.id), title, color: str(d.color, 9), summary: String(d.summary ?? '').slice(0, 20000), stack: str(d.stack), role: str(d.role), status: Math.max(0, Math.min(100, Number(d.status) || 0)), image };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date || '')) throw new Error('Date must be YYYY-MM-DD');
  return { id: str(d.id), type: TYPES[d.type] ? d.type : 'note', date: d.date, title, body: String(d.body ?? '').slice(0, 200000) };
}
function uniqueId(base, list) { let id = base, n = 2; while (list.some(x => x.id === id)) id = `${base}-${n++}`; return id; }

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost'), parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'api') {
      const [, kind, id] = parts;
      if (req.method === 'GET' && kind === 'content') return send(res, 200, { projects: read('projects.json'), notes: read('notes.json'), site: read('site.json'), types: TYPES });
      if (req.method === 'POST' && kind === 'site') {             // { status: { state, doing } } and/or { about: { description, location, focus, currently, portraitText } }
        const d = await body(req), site = read('site.json');
        if (d.status) site.status = { state: d.status.state === 'offline' ? 'offline' : 'online', doing: str(d.status.doing, 120) };
        if (d.about) {
          const image = str(d.about.image, 300); if (image && !/^(img\/[\w.-]+|https?:\/\/\S+)$/.test(image)) throw new Error('Invalid image path');
          const resumeUrl = str(d.about.resumeUrl, 300); if (resumeUrl && !/^(files\/[\w.-]+|https?:\/\/\S+)$/.test(resumeUrl)) throw new Error('Invalid résumé link');
          site.about = { description: String(d.about.description ?? '').slice(0, 5000), location: str(d.about.location), focus: str(d.about.focus), currently: str(d.about.currently), portraitText: str(d.about.portraitText, 120), image, resumeUrl };
        }
        write('site.json', site); build(); return send(res, 200, site);
      }
      if (req.method === 'POST' && kind === 'upload') {           // { name, data: base64, kind?: "image"|"resume" } → saved in img/ or files/
        const d = await body(req, 14e6), ext = path.extname(str(d.name, 120)).toLowerCase(), isResume = d.kind === 'resume';
        const allowed = isResume ? ['.pdf'] : ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'];
        if (!allowed.includes(ext)) throw new Error(isResume ? 'Résumé must be a PDF' : 'Unsupported image type (png, jpg, webp, gif, avif)');
        const buf = Buffer.from(String(d.data || ''), 'base64'); if (!buf.length || buf.length > 10e6) throw new Error('File must be under 10 MB');
        const dir = isResume ? 'files' : 'img'; fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
        const name = `${slug(path.basename(d.name, ext))}-${Date.now().toString(36)}${ext}`; fs.writeFileSync(path.join(ROOT, dir, name), buf);
        return send(res, 200, { path: `${dir}/${name}` });
      }
      if (req.method === 'POST' && kind === 'rebuild') { build(); return send(res, 200, { ok: true }); }
      if (FILES[kind]) {
        const list = read(FILES[kind]);
        if (req.method === 'POST') {
          const item = clean(kind, await body(req)), i = list.findIndex(x => x.id === item.id);
          if (i < 0) { item.id = uniqueId(slug(item.title), list); list.push(item); } else list[i] = item;
          write(FILES[kind], list); build(); return send(res, 200, item);
        }
        if (req.method === 'DELETE') { write(FILES[kind], list.filter(x => x.id !== id)); build(); return send(res, 200, { ok: true }); }
      }
      return send(res, 404, { error: 'Not found' });
    }
    if (url.pathname === '/') return send(res, 200, fs.readFileSync(path.join(__dirname, 'index.html')), 'text/html');
    if (parts[0] === 'site') {                                      // static preview of the portfolio; admin/ and content/ are never served
      let f = path.normalize(path.join(ROOT, decodeURIComponent(parts.slice(1).join('/')))), rel = path.relative(ROOT, f);
      if (rel.startsWith('..') || /^(admin|content)([\\/]|$)/.test(rel)) return send(res, 403, 'Forbidden', 'text/plain');
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (MIME[path.extname(f)] && fs.existsSync(f)) return send(res, 200, fs.readFileSync(f), MIME[path.extname(f)]);
    }
    send(res, 404, 'Not found', 'text/plain');
  } catch (e) { send(res, 400, { error: e.message }); }
}).listen(PORT, '127.0.0.1', () => console.log(`Admin:   http://localhost:${PORT}\nPreview: http://localhost:${PORT}/site/`));
