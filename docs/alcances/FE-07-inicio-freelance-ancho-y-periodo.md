# FE-07 · Pantalla de inicio del rol FREELANCE: ancho + período «Total a recibir»

ESTADO: publicado (app Freelance v452)
APPS: `freelance-completo.html` únicamente. BASE: no toca la base (100% front-end).
ORIGEN: reporte con captura del móvil (producción v451).

## Qué se cambió y por qué

**A · La app no ocupaba el ancho de la pantalla.** En teléfonos grandes/plegables
(ancho CSS ≥ 560px) el contenido quedaba en una columna angosta y centrada, con
franjas del fondo verde a los lados.

**B · Período inconsistente en «Total a recibir».** El título decía «junio» y el
corte «31 may» fijos (en agosto), porque eran texto quemado.

## Diagnóstico (causa real, con archivo y línea)

**A** — `freelance-completo.html`:
- `.shell` (base): `max-width:100%` (línea ~93) → full-width en móvil, bien.
- `@media(min-width:560px){ .shell{max-width:480px} }` (línea ~100) → **causa raíz**:
  centraba la app a 480px desde 560px, y el `body{background:var(--field)}` (verde,
  línea ~81) asomaba a los lados. Confirmado en navegador: a 412px full-width; a
  560/600/768px columna de 480 con bandas verdes.
- El `<meta viewport>` (línea 5) existía pero **sin `viewport-fit=cover`** (afecta
  safe-area, no el ancho). Se agregó.
- El bloque blanco vacío bajo el grid es **solo ausencia de contenido** (la home
  tiene header+buscador+tarjeta+grid+barra). No hay sección que falle en silencio;
  no se inventó contenido para rellenar.

**B** — `freelance-completo.html`, componente Inicio:
- Línea ~4820: `Total a recibir · junio` (literal fijo).
- Línea ~4822: `... corte 31 may` (literal fijo).
- Todo el panel es DEMO (`metaMes=850`, `comisionPropia=64.00`, `margenEquipo` de
  `EQUIPO_INI`). Caso confirmado: **valor quemado**, no cálculo ni zona horaria.

## Corrección aplicada

**A** — Ancho en una sola variable CSS `--appw`:
- `:root{--appw:100%}` y `@media(min-width:768px){:root{--appw:480px}}`.
- `.shell` y **todos** sus overlays fijos (`.nav`, `.drawer-ov`, `.fab-zona`,
  `.ov`, `.sheet`) pasan de `max-width:480px` a `max-width:var(--appw)`, así el
  shell y la barra inferior nunca se desalinean.
- Corte de la columna centrada subido de 560px → **768px** (tablet/escritorio):
  ningún teléfono en vertical cae ya en la columna angosta.
- `<meta viewport>` con `viewport-fit=cover`; el shell ya respetaba `env(safe-area-inset-*)`.

**B** — Regla confirmada por el dueño: **mostrar el mes real del teléfono** (zona
Ecuador) y el corte = último día del mes anterior (mismo patrón que antes).
- Helper `periodoRecibirEC()` sobre `partesFechaEC()` (America/Guayaquil).
- Etiquetas atadas a `periodoRecibir.mes` / `periodoRecibir.corte`.
- Los montos siguen siendo demo hasta que la base los entregue (Cowork).

## Lo que NO se tocó

- Ninguna lógica de roles ni permisos. Ningún otro rol (son archivos aparte).
- La fórmula financiera `totalRecibir/metaMes*100` (arnés `test_cambios_422`) queda igual.
- `useEsMovil(560)` (hook JS de otros componentes) no se tocó: es ajeno al shell.

## Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- En anchos 360/390/412/600/767: sin bandas, sin scroll horizontal, barra inferior
  alineada. A 768: columna centrada de 480 (tablet/escritorio).
- La tarjeta «Total a recibir» debe decir el MES actual y el corte del mes anterior.

## Trampas conocidas

- Los overlays fijos comparten `--appw`: si se agrega uno nuevo, usar `var(--appw)`,
  no `480px`, o se desalineará del shell en pantallas anchas.
- El panel sigue siendo DEMO: cuando la base entregue meta/comisiones/período reales,
  reemplazar los literales demo (eso es de Cowork).
