/* transitions.js — dirección de las transiciones entre páginas (ver DOCS.md §1).
   Mapa: home al centro · work izquierda · about derecha · contact arriba · notes abajo · cada nota bajo notes.
   En "pagereveal" (antes del primer frame de la página nueva) calcula el desplazamiento entre la página de origen y la de destino
   y guarda en <html> --mx/--my = hacia dónde se mueve el contenido. Sin este script, o en navegadores sin view transitions, el sitio funciona igual. */
(() => {
  // Intro del nombre en el home (animación "slam"): solo en carga directa o recarga. Si vienes de otra página del sitio, o con atrás/adelante, se apaga.
  const nav = performance.getEntriesByType('navigation')[0];
  let internal = false; try { internal = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch {}
  if (nav && nav.type !== 'reload' && (nav.type === 'back_forward' || internal)) document.documentElement.classList.add('no-intro');
  const POS = { home: [0, 0], work: [-1, 0], about: [1, 0], contact: [0, -1], notes: [0, 1], article: [0, 2] };   // edita el mapa aquí
  const pageOf = u => {
    try {
      const p = new URL(u, location.href).pathname;
      if (/\/notes\/[^/]+$/.test(p)) return 'article';
      const m = p.match(/\/(work|notes|about|contact)\.html$/); return m ? m[1] : 'home';
    } catch { return null; }
  };
  addEventListener('pagereveal', e => {
    if (!e.viewTransition) return;
    const from = pageOf((window.navigation && navigation.activation && navigation.activation.from && navigation.activation.from.url) || document.referrer), to = pageOf(location.href);
    if (!POS[from] || !POS[to] || from === to) return;
    const s = document.documentElement.style;
    s.setProperty('--mx', -Math.sign(POS[to][0] - POS[from][0]));   // Math.sign: la velocidad es igual aunque las páginas no sean vecinas
    s.setProperty('--my', -Math.sign(POS[to][1] - POS[from][1]));
  });
})();
