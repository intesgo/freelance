# WEB-01 · Un solo título por pantalla

ESTADO: publicado (Sistema Web b168)
APPS: `sistema-web.html` únicamente.
BASE: no toca la base.

## Qué se cambió y por qué

Cada pantalla del Sistema Web mostraba su nombre DOS veces: una en la cabecera (`Header`)
y otra con un `<h1>` interno del módulo. En cuatro módulos se repetía además la campanita
de ayuda, con textos distintos. Se dejó **un solo título y una sola ayuda**.

- Se quitaron los **11 `<h1>` internos** (quedan solo 3 legítimos: la cabecera, el ingreso
  y el historial de cliente).
- La **cabecera ahora pinta el icono** de la sección antes del título (prop `icon` en
  `Header`, alimentado por `actualOk.icon`).
- Las **4 campanas internas** (recepcion, comunicacion, comisiones y «Resumen del día» →
  `dashboard`) se **fusionaron en `AYUDA_SECCION`**; la de `recepcion` conservó su video
  pasando al formato `{ video:"recepcion", lineas:[…] }`.
- El matiz «Cartera» del título interno de Cobranza pasó al **`sub`** de esa sección (no se
  alargó el `label`, que se usa en la barra lateral y las pestañas).

## Qué NO se tocó

- Nada de lógica: solo presentación. Ni base, ni permisos, ni roles, ni camino demo, ni
  otras apps. El `label` de `SECCIONES` quedó igual. Los 3 `<h1>` legítimos, intactos.

## Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Arnés `test_web01_titulos.js`: quedan **3** `<h1>` (no 14), la cabecera recibe y pinta el
  icono, y la ayuda de recepcion conserva su video.
- En la web: entrar a las once pantallas y ver que cada una muestra su nombre una sola vez,
  con su icono, y una sola campana de ayuda.

## Trampas conocidas / decisiones

- El separador de cada título interno se conservó como un `<div>` espaciador para no pegar
  el contenido a la cabecera.
- En `dashboard` no se duplicó la línea casi idéntica de «Resumen del día»; solo se agregó
  la nueva («Cada línea y tarjeta es un atajo…»).
- Los títulos internos eran más largos que el `label` del menú («Logística y despacho» vs
  «Logística»); ese matiz ya vive en el `sub` de cada sección, salvo «Cartera» que se
  agregó.
