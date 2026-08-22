# DISEÑO BASE ERP del Sistema Web (molde transversal)

Solo estilo (`sistema-web.html`). Ancla `/* DISENO_BASE_ERP */`. NO tocar lógica, datos,
nombres de funciones/variables ni comportamiento. Deja montado el "molde" (iconos, menú,
paleta, tipografía) que luego se replica pantalla por pantalla.

## Qué se hizo
1. **Un solo juego de iconos (Lucide inline, sin CDN).** Se amplió `ICONS`/`<Ico>` con los
   iconos que faltaban para cubrir el menú: home, inbox, beaker, package, gift, link, award,
   factory, mapPin, fileText, messageCircle, search, megaphone, briefcase, bell, settings,
   building, idCard, shield, scale, trendingUp. El set viejo `ICON_PATHS`/`<Icono>` queda en
   desuso (lo sigue usando Pedidos): no se borra, no se agregan usos nuevos.
2. **Menú lateral con iconos vectoriales.** Cada objeto de `SECCIONES` lleva ahora `ic:"<nombre>"`
   (sin quitar el emoji `icon`, que tiene otros usos). El Sidebar, el buscador del Tablero, la
   lista de permisos por cargo y las pestañas pintan `<Ico name={s.ic}/>` (o `{h.ic}`) en vez del
   emoji. Se mantiene el verde bosque del Sidebar (el icono sigue el color del estado activo).
3. **Paleta ordenada (`COLOR`).** Se definieron los tokens que faltaban: `cta:"#17492e"` (botón
   principal), `fieldGreen:"#f6f8f3"` y `fieldMaiz:"#fdf3df"`. Los fondos sueltos de "Subir
   pedido" pasan a `COLOR.fieldGreen`/`COLOR.fieldMaiz`: ningún color vive fuera de `COLOR`.
4. **Tipografía del sistema.** Las declaraciones inline `'Space Grotesk','Inter',sans-serif`
   (título de Socio comercial y otros títulos de pantalla) pasan a la constante `FUENTE`. Queda
   solo la clase CSS `.num` (fuente numérica global, no es tipografía de pantalla).
5. **Viewport móvil.** Ya presente en el `<head>` (`width=device-width, initial-scale=1`).

## Qué NO se toca
Lógica, datos, RPC, nombres de funciones/variables. El contenido de cada pantalla (sus emojis
internos) NO se migra en esta tanda: va en tandas posteriores. El set viejo `ICON_PATHS` sigue
vivo para Pedidos.

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- El menú lateral muestra iconos vectoriales (no emojis) en todos los cargos.
- `test_menu_web.js` (arnés de diseño, ACTUALIZADO): su regex leía `key:"...", icon:"..."`
  seguidos; ahora tolera y lee el nuevo `ic:"..."` y le pasa al Sidebar el icono vectorial.
- Guards de fuente en `test_cambios_422.js` (ancla, tokens de paleta, sin fondos sueltos, sin
  Space Grotesk inline, set de iconos, `<Ico name={s.ic}/>` en el menú).

## Versiones
Sistema Web b183, caché `freelance-v280`.

## Trampas conocidas
- El arnés `test_menu_web.js` está atado al SHAPE de `SECCIONES` (regex): al insertar `ic:`
  entre `key` e `icon` había que actualizar su regex en el MISMO cambio (§4).
- El icono del Sidebar usa `color={on ? "#fff" : SB.txt}` para verse sobre el verde bosque y
  seguir el estado activo/inactivo, no `currentColor` (el `<div>` padre no fija color).
- El buscador del Tablero mezcla secciones (icono vectorial) y clientes (emoji "👤"): se pinta
  `<Ico>` solo si `ICONS[h.ic]` existe; si no, cae al emoji.
