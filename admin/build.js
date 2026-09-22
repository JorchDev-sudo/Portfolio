#!/usr/bin/env node
/* build.js — regenerates the portfolio HTML/CSS from content/*.json.
   Run standalone (`node admin/build.js`) or through admin/server.js. No dependencies.
   It rewrites ONLY the regions between BUILD markers in work.html, notes.html and style.css,
   and (re)creates notes/<id>.html, one page per note. Everything else is hand-written. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), CONTENT = path.join(ROOT, 'content');
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TYPES = { note: 'Note', deep: 'Deep dive', build: 'Build log', lab: 'Lab' };   // add a type here + <option> in admin/index.html
const FONTS = 'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=JetBrains+Mono:wght@400;700&display=swap';

const read = f => JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8'));
const write = (f, d) => fs.writeFileSync(path.join(CONTENT, f), JSON.stringify(d, null, 2) + '\n');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';

// Replace what is between <!-- BUILD:name --> … <!-- /BUILD:name --> (or the CSS comment equivalent).
function inject(file, name, text, css) {
  const p = path.join(ROOT, file), t = fs.readFileSync(p, 'utf8');
  const [a, b] = css ? [`/* BUILD:${name} */`, `/* /BUILD:${name} */`] : [`<!-- BUILD:${name} -->`, `<!-- /BUILD:${name} -->`];
  const i = t.indexOf(a), j = t.indexOf(b);
  if (i < 0 || j < 0) throw new Error(`Marker "${name}" not found in ${file}`);
  fs.writeFileSync(p, t.slice(0, i + a.length) + '\n' + text + '\n' + t.slice(j));
}

/* ---------- WORK: slides, 3D drum and its Firefox fallback ---------- */
function buildWork(list) {
  const slides = list.map((p, i) => {
    const color = /^#[0-9a-f]{3,8}$/i.test(p.color) ? p.color : '#2b44ff';
    const status = Math.max(0, Math.min(100, Number(p.status) || 0));
    const img = p.image ? `<img class="diagram" src="${esc(p.image)}" alt="${esc(p.title)} diagram">` : '';          // optional; always first
    const sum = (p.summary || '').trim() ? `<div class="sum">${md(p.summary)}</div>` : '';                            // optional Markdown; after the image
    const rows = [['Stack', esc(p.stack)], ['Role', esc(p.role)]].filter(r => r[1]).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('') +
      (status ? `<div><dt>Status</dt><dd><span class="bar" style="--w:${status}%"></span></dd></div>` : '');
    return `<section class="slide" id="p${i + 1}" style="--bg:${color}"><div class="in">
<div class="l"><h2 class="giant">Work</h2><p class="pname">"${esc(p.title)}"</p></div>
<div class="r">${img}${sum}${rows ? `<dl class="meta">${rows}</dl>` : ''}</div>
</div></section>`;
  }).join('\n');
  const drum = `<div class="drum" style="--n:${Math.max(list.length, 2)}">` + list.map((_, i) => `<a href="#p${i + 1}" style="--i:${i}"><small>Project</small><b>${String(i + 1).padStart(2, '0')}</b></a>`).join('') + '</div>';
  let fb = '';
  for (let i = 1; i < list.length; i++) fb += `body:has(#p${i + 1}:target) .drum{transform:translateY(calc(var(--R)*-.156)) translateZ(calc(var(--R)*-1)) rotateX(-9deg) rotateY(${-26 * i}deg)}\n`;
  fb += ['body:not(:has(:target)) .drum a:nth-child(1)', ...list.map((_, i) => `body:has(#p${i + 1}:target) .drum a:nth-child(${i + 1})`)].join(',') + '{background:#fff;color:#000;translate:0 -.5rem 2.5rem}';
  inject('work.html', 'slides', slides); inject('work.html', 'drum', drum); inject('style.css', 'drum-fallback', fb, true);
}

/* ---------- NOTES: calendar (radios + year headings + month ring + feed) and its CSS ---------- */
function buildNotes(site, list) {
  const [sy, sm] = site.calendar.start.split('-').map(Number), [ey, em] = site.calendar.end.split('-').map(Number);
  const total = (ey - sy) * 12 + em - sm + 1;
  const months = Array.from({ length: total }, (_, i) => ({ y: sy + Math.floor((sm - 1 + i) / 12), m: (sm - 1 + i) % 12 }));
  const idxOf = date => months.findIndex(x => `${x.y}-${String(x.m + 1).padStart(2, '0')}` === String(date).slice(0, 7));
  const byMonth = {};
  [...list].sort((a, b) => a.date.localeCompare(b.date)).forEach(n => {
    const i = idxOf(n.date);
    if (i < 0) return console.warn(`! "${n.title}" (${n.date}) is outside the calendar range; it has a page but no calendar entry`);
    (byMonth[i] = byMonth[i] || []).push(n);
  });
  const withNotes = Object.keys(byMonth).map(Number);
  const sel = withNotes.length ? Math.max(...withNotes) : 0;                       // default month = latest one with notes
  const yy = y => String(y).slice(2), years = [...new Set(months.map(x => x.y))];
  const html = months.map((x, i) => `<input class="y${yy(x.y)}" type="radio" name="m" id="m${i}"${i === sel ? ' checked' : ''}>`).join('') + '\n' +
    years.map(y => `<h1 class="giant yr yr${yy(y)}">${y}</h1>`).join('') + '\n' +
    `<nav class="months" aria-label="Months"><span aria-hidden="true">←</span><div class="ring">` + months.map((x, i) => `<label for="m${i}" style="--i:${i}">${MONTHS[x.m]}</label>`).join('') + `</div><span aria-hidden="true">→</span></nav>\n` +
    `<div class="feed">\n<p class="none">Nothing here yet.</p>\n` + withNotes.map(i => `<ol class="f${i}">` + byMonth[i].map(n => `<li><time>${n.date.slice(8, 10)}</time><span class="k">${TYPES[n.type] || 'Note'}</span><a href="notes/${esc(n.id)}.html">"${esc(n.title)}"</a></li>`).join('') + '</ol>').join('\n') + '\n</div>';
  let css = years.map(y => `.y${yy(y)}:checked~.yr${yy(y)}`).join(',') + '{display:block}\n';
  css += months.map((_, i) => `#m${i}:checked~*{--s:${i}}`).join('\n') + '\n';
  if (withNotes.length) css += withNotes.map(i => `#m${i}:checked~.feed .none`).join(',') + '{display:none}\n' + withNotes.map(i => `#m${i}:checked~.feed .f${i}`).join(',') + '{display:block}';
  inject('notes.html', 'calendar', html); inject('style.css', 'calendar-css', css, true);
}

/* ---------- ARTICLES: notes/<id>.html. Body syntax: paragraphs, "## heading", "- list", ``` code fences, `inline code` ---------- */
function md(src) {
  const out = []; let para = [], list = [], code = null;
  const inline = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
  const flush = () => { if (para.length) out.push(`<p>${para.map(inline).join(' ')}</p>`); if (list.length) out.push(`<ul>${list.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`); para = []; list = []; };
  for (const line of String(src || '').replace(/\r/g, '').split('\n')) {
    if (code) { if (line.startsWith('```')) { out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); code = null; } else code.push(line); continue; }
    if (line.startsWith('```')) { flush(); code = []; continue; }
    if (!line.trim()) { flush(); continue; }
    if (line.startsWith('## ')) { flush(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('- ')) { if (para.length) flush(); list.push(line.slice(2)); continue; }
    if (list.length) flush(); para.push(line);
  }
  if (code) out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
  flush(); return out.join('\n');
}
const article = n => `<!doctype html>
<!-- GENERATED by admin/build.js from content/notes.json — edit the note in the admin panel, not this file. -->
<html lang="en" data-page="article"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(n.title)} · Jorge Cotera</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}"><link rel="stylesheet" href="../style.css"><script src="../transitions.js"></script></head>
<body>
<header class="top"><a href="../index.html">jorchdev:~$</a><a href="../work.html">work</a><a href="../notes.html" aria-current="page">notes</a><a href="../about.html">about</a><a href="../contact.html">contact</a></header>
<main class="pad article"><p class="meta">${TYPES[n.type] || 'Note'} · ${esc(n.date)}</p><h1>${esc(n.title)}</h1>
${md(n.body)}
<p><a class="back" href="../notes.html">← All notes</a></p></main>
</body></html>
`;
function buildArticles(list) {
  const dir = path.join(ROOT, 'notes'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  list.forEach(n => fs.writeFileSync(path.join(dir, n.id + '.html'), article(n)));
}

/* ---------- SITE: "currently" status (home + contact) and the About page, from content/site.json ---------- */
function buildSite(site) {
  const s = site.status || {}, off = s.state === 'offline';
  const cur = `<aside class="cur"><span>// currently: <i class="dot${off ? ' off' : ''}"></i>${off ? 'offline' : 'online'}</span>${s.doing ? `<span>// "${esc(s.doing)}"</span>` : ''}</aside>`;
  inject('index.html', 'status', cur); inject('contact.html', 'status', cur);
  const a = site.about || {};
  const rows = [['Location', a.location], ['Focus', a.focus], ['Currently', a.currently]].filter(r => r[1]).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
  const frame = a.image ? `<img src="${esc(a.image)}" alt="Portrait of Jorge Cotera">` : (a.portraitText ? `<figcaption>${esc(a.portraitText)}</figcaption>` : '');
  const resume = a.resumeUrl ? `<a class="tag" href="${esc(a.resumeUrl)}" target="_blank" rel="noopener">Résumé ↗</a>` : '';
  inject('about.html', 'about', `<figure class="frame" role="img" aria-label="${a.image ? 'Portrait' : (a.portraitText || 'Portrait placeholder')}">${frame}</figure>
<div class="bio"><p class="big">Software<br>engineer</p>
${md(a.description)}
${rows ? `<dl>${rows}</dl>` : ''}${resume}</div>`);
}

function build() { const notes = read('notes.json'), site = read('site.json'); buildWork(read('projects.json')); buildNotes(site, notes); buildArticles(notes); buildSite(site); }
module.exports = { build, read, write, slug, TYPES };
if (require.main === module) { build(); console.log('Portfolio rebuilt.'); }
