# Portfolio — cómo está construido

> Nota: partes de `work.html`, `notes.html` y `style.css` (entre marcadores `BUILD:`) y la carpeta `notes/` las genera `admin/build.js`. Ver `ADMIN.md` (en inglés).

Cinco páginas HTML (`index`, `work`, `notes`, `about`, `contact`) y una sola hoja, `style.css`. Todo el movimiento es CSS; no hay JavaScript.

## 1. Transiciones entre páginas

- `@view-transition{navigation:auto}` (en `style.css`) activa las transiciones entre documentos (Chrome, Edge y Safari recientes; Firefox no las soporta).
- **Mapa espacial**: home al centro · work a la izquierda · about a la derecha · contact arriba · notes abajo · cada nota (`data-page="article"`) debajo de notes.
- **`transitions.js`** (el único JS del sitio público): en el evento `pagereveal` calcula de qué página vienes y a cuál vas, y escribe `--mx` / `--my` en `<html>`: hacia dónde se mueve el contenido (1 = derecha/abajo, -1 = izquierda/arriba). Funciona para cualquier par de páginas. Ejemplos: notes → nota: la nota entra desde abajo y notes sube; nota → notes: notes entra desde arriba y la nota baja; work → home: work sale por la izquierda y el home entra por la derecha.
- **CSS**: `::view-transition-old(root)` usa `pg-out` (se desplaza `mx·100%` / `my·100%` y se oscurece) y `::view-transition-new(root)` usa `pg-in` (parte de `-mx·100%` / `-my·100%`, inclinada `--sx`, distinta por página). El easing `cubic-bezier(.85,0,.1,1)` da el arranque seco.
- **Respaldo sin JS**: `html[data-page=…]{--mx;--my}` fija la dirección de llegada de cada página. Sin JS, volver al home solo oscurece la página que sale.
- **Cambiar el mapa o una dirección**: edita `POS` en `transitions.js`.

**Carga.** Cada `<head>` incluye `rel="expect"` (no revela la página hasta leer `#end`), `speculationrules` (precarga las demás páginas, es JSON) y las fuentes por `<link>`. Sin esto Chrome puede saltarse la transición en la primera visita. Lo más fiable es alojar las fuentes tú mismo.

## 2. Home
- `.name span`: entrada con `clip-path` + `animation-delay` escalonado (slam). Solo se reproduce en carga directa o recarga: `transitions.js` pone `html.no-intro` cuando llegas desde otra página del sitio (o con atrás/adelante) y el CSS apaga la animación.
- `.cmd` / `.tN` / `.lN`: cada enlace tiene su comando. `.home:has(.l1:hover) .t1{display:inline-block}` lo muestra, y la animación `type` (`max-width` + `steps()`) lo «teclea».
- `.home .rel{position:fixed;inset:0}` con el nombre limitado por `vh`: el pie nunca se sale de la pantalla, sea cual sea el zoom.

## 3. Work
- `.rail`: `overflow-x:auto` + `scroll-snap-type:x mandatory`. Los enlaces `#p1…#p4` mueven el scroll (`scroll-behavior:smooth`).
- `.slide::before`: diagonal con `clip-path`. `--bg` (inline) da el color de cada proyecto.
- `.in` se inclina en 3D con `animation-timeline:view(inline)` y `perspective` en `.slide`.
- **Menú `.pn > .drum`**: `perspective` en `.pn`, `transform-style:preserve-3d` en `.drum`. Cada `a` va en `rotateY(--i·26deg) translateZ(--R)`. `body{timeline-scope:--rail}` + `.rail{scroll-timeline:--rail x}` permiten que el tambor (`spin`) y la placa activa (`lit`, con `animation-range` por índice) sigan el scroll.

**Firefox:** no soporta `animation-timeline`, así que el tambor de work gira al pulsar (`:target` de `#pN`) y no con el scroll manual; los slides tampoco se inclinan. Las transiciones entre páginas tampoco existen en Firefox.

## 4. Notes (calendario sin JS)
- Radios `#m0…#m29` (jul 2026 → dic 2028) antes de `.yr`, `.months` y `.feed`.
- `#mN:checked~*{--s:N}` pone el índice elegido en todos los hermanos siguientes. Cada `label` tiene su `--i`.
- `--k = --i − --s` (0 = mes elegido). Cada etiqueta se coloca con `translateX(--k)`, `translateZ(--d)` y `rotateY` hacia el centro (coverflow); al cambiar `--s`, `transition` re-centra todo. `--a` (1 solo en el activo) lo pinta de azul y muestra el `^`. `.ring{pointer-events:none}` es imprescindible: sin eso el plano de `.ring` tapa las etiquetas en 3D y no se pueden pulsar.
- El año lo controlan las clases `y26/y27/y28` de los radios y los `h1.yr26/27/28`.
- Rango real: no existen meses previos a julio 2026. **Un calendario infinito necesitaría JS**; en CSS puro hay que generar más radios, labels y reglas `--s`.

**Ampliar el calendario:** añade radios `#mN` (con su clase de año), su `label style="--i:N"`, su regla `#mN:checked~*{--s:N}` y, si es un año nuevo, un `h1.yrXX` con su regla `.yXX:checked~.yrXX`.
**Ampliar entradas:** crea `<ol class="x">` en `.feed` y añade `#mN:checked~.feed .x{display:block}` y `#mN:checked~.feed .none{display:none}`.

## 5. Otras clases
- `.top`: nav fijo; `mix-blend-mode:difference` se adapta a fondos claros y oscuros.
- `.cur` / `.dot`: bloque «currently»; `pulse` anima el punto.
- **Placas estilo Persona** (`.links a`): `::before` = plano negro asimétrico (`clip-path` con `--shape`), `::after` = sombra azul desplazada. Cambia `--shape` para otra silueta.
- `.frame`: hueco para tu retrato (sprite) en about.
- `prefers-reduced-motion`: desactiva animaciones y transiciones.
