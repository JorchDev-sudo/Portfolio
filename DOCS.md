# Portfolio — cómo está construido

Cinco páginas HTML (`index`, `work`, `notes`, `about`, `contact`) y una sola hoja, `style.css`. Todo el movimiento es CSS; no hay JavaScript.

## 1. Transiciones entre páginas

**Ingredientes**
- `@view-transition{navigation:auto}` en `style.css` activa las transiciones entre documentos (Chrome/Edge/Safari recientes).
- Cada página declara quién es con `<html data-page="…">`. El CSS le da a `html` un `view-transition-name` propio (`pg-home`, `pg-work`…) y una clase común, `pg`.
- Como cada página tiene nombre distinto, el navegador anima la página vieja y la nueva **por separado**, y la página nueva puede saber cuál fue la anterior.

**Dirección.** Las páginas viven en un mapa: work a la izquierda del home, about a la derecha, notes abajo y contact arriba.
`--mx` y `--my` (en `html[data-page=…]`) indican hacia dónde se mueve el contenido al *llegar* a esa página (1 = derecha o abajo, -1 = izquierda o arriba). Dos keyframes lo aprovechan:
- `pg-out`: la página vieja se desplaza `mx·100%` / `my·100%` y se oscurece.
- `pg-in`: la nueva parte de `-mx·100%` / `-my·100%`, inclinada `--sx` (distinta por página).

Entre páginas que no son home manda la dirección del destino.

**Volver al home (`jorchdev:~$`).** El home no sabe de dónde vienes, y lo resuelve así (sin JS ni `:target`):
1. La página que sale usa su propio nombre (`pg-work`, `pg-notes`…) y `style.css` le da el sentido contrario al de su ida: `html[data-page=home]::view-transition-old(pg-work){…}`.
2. Todas las páginas tienen un elemento con `view-transition-name:rel` (`.rel`). En el home es **todo el contenido**. En las otras es un marcador invisible a pantalla completa, colocado fuera de la ventana hacia donde queda el home (`translate: --mx·100vw --my·100vh`).
3. Como el nombre coincide en ambas páginas, el navegador anima ese grupo del rectángulo viejo al nuevo. Volviendo de work, el marcador está a la derecha y el contenido del home entra desde ahí; yendo del home a work, sale hacia la derecha.
4. Se anulan los fundidos de `rel` para que el contenido viaje opaco. El fondo del home (`root`) no se mueve.

Si el navegador no captura el marcador fuera de pantalla, el contenido del home aparece quieto mientras la otra página se va.

**Para cambiar una dirección**, edita `--mx` / `--my` de esa página y las reglas `home … old(pg-x)` / `:has(#from-x:target)`.

**Carga.** Cada `<head>` incluye `rel="expect"` (no revela la página hasta leer `#end`), `speculationrules` (precarga las demás páginas, es JSON) y las fuentes por `<link>`. Sin esto Chrome puede saltarse la transición en la primera visita. Lo más fiable es alojar las fuentes tú mismo.

## 2. Home
- `.name span`: entrada con `clip-path` + `animation-delay` escalonado. Se anula con `html:active-view-transition` para no competir con la transición de página.
- `.cmd` / `.tN` / `.lN`: cada enlace tiene su comando. `.home:has(.l1:hover) .t1{display:inline-block}` lo muestra, y la animación `type` (`max-width` + `steps()`) lo «teclea».
- `.home .rel{position:fixed;inset:0}` con el nombre limitado por `vh`: el pie nunca se sale de la pantalla, sea cual sea el zoom.

## 3. Work
- `.rail`: `overflow-x:auto` + `scroll-snap-type:x mandatory`. Los enlaces `#p1…#p4` mueven el scroll (`scroll-behavior:smooth`).
- `.slide::before`: diagonal con `clip-path`. `--bg` (inline) da el color de cada proyecto.
- `.in` se inclina en 3D con `animation-timeline:view(inline)` y `perspective` en `.slide`.
- **Menú `.pn > .drum`**: `perspective` en `.pn`, `transform-style:preserve-3d` en `.drum`. Cada `a` va en `rotateY(--i·26deg) translateZ(--R)`. `body{timeline-scope:--rail}` + `.rail{scroll-timeline:--rail x}` permiten que el tambor (`spin`) y la placa activa (`lit`, con `animation-range` por índice) sigan el scroll.

## 4. Notes (calendario sin JS)
- Radios `#m0…#m29` (jul 2026 → dic 2028) antes de `.yr`, `.months` y `.feed`.
- `#mN:checked~*{--s:N}` pone el índice elegido en todos los hermanos siguientes. Cada `label` tiene su `--i`.
- `--k = --i − --s` (0 = mes elegido). Cada placa se coloca con `translateX(--k)`, `translateZ(--d)` y `rotateY` hacia el centro (efecto coverflow); al cambiar `--s`, `transition` re-centra todo (entra un mes por la derecha, sale otro por la izquierda). `--a` (1 solo en el activo) agranda la placa y enciende la sombra azul.
- El año lo controlan las clases `y26/y27/y28` de los radios y los `h1.yr26/27/28`.
- Rango real: no existen meses previos a julio 2026. **Un calendario infinito necesitaría JS**; en CSS puro hay que generar más radios, labels y reglas `--s`.

**Ampliar el calendario:** añade radios `#mN` (con su clase de año), su `label style="--i:N"`, su regla `#mN:checked~*{--s:N}` y, si es un año nuevo, un `h1.yrXX` con su regla `.yXX:checked~.yrXX`.
**Ampliar entradas:** crea `<ol class="x">` en `.feed` y añade `#mN:checked~.feed .x{display:block}` y `#mN:checked~.feed .none{display:none}`.

## 5. Otras clases
- `.top`: nav fijo; `mix-blend-mode:difference` se adapta a fondos claros y oscuros.
- `.cur` / `.dot`: bloque «currently»; `pulse` anima el punto.
- **Placas estilo Persona** (`.links a`, `.ring label`): `::before` = plano negro asimétrico (`clip-path` con `--shape`), `::after` = sombra azul desplazada. Cambia `--shape` para otra silueta.
- `.blank`, `.frame`: huecos para tus sprites e ilustraciones.
- `prefers-reduced-motion`: desactiva animaciones y transiciones.
