# Alcance · Productos: cabecera compacta, conteo que no se parte, y grano a la derecha

> `freelance-completo.html`. **Tres retoques de pantalla, un solo PR. No tocan la base.**
> Referencia: `main` en `61ad54b` (v475). Sube a **v476 / CACHE freelance-v321**.

## CAMBIO 1 · Cabecera de Productos en un solo renglón (`CABECERA_COMPACTA`)
La pantalla gastaba tres renglones antes del buscador (título + ayuda + píldora verde). Queda en uno:
título a la izquierda y, a la derecha, un chip «NP» con cuántas marcas se ven.
- Se borran el `<div className="sub">` de ayuda y la píldora verde.
- El chip cuenta **`lista.length`** (lo que se ve, no `reales.length`): sin búsqueda 59P, buscando
  «arrocillo» 3P.
- El **color no es decorativo**: verde con base (`reales`), gris con demo — hereda el aviso «estás
  viendo la base, no la demostración» que daba la píldora.
- **Arnés `test_catalogo_productos` repuntado:** la comprobación en vivo pasa a `/2P/` (sin `\b`, el
  texto llega pegado); el mutante de la píldora se cambia por uno anclado en el chip
  (`{lista.length}P` → `{lista.length + 1}P`). Mismo número de mutantes. Vuelve a 39 ✓.

## CAMBIO 2 · La tarjeta de marca ya no parte el conteo (`CONTEO_NO_SE_PARTE`)
La segunda línea era un solo texto «Piladora … · N presentación(es)» que se partía dejando el número
separado de lo que cuenta. Pasa a **dos `.meta`** (piladora en un renglón, conteo en otro) y se va el
«(es)»: singular/plural de verdad («1 presentación» / «3 presentaciones»). Los otros dos sitios con
«presentación(es)» (subtítulo de la ficha ~17570 y otra lista ~24168) quedan con el mismo singular/plural.

## CAMBIO 3 · Ficha de marca: menos texto y el grano a la derecha (`GRANO_A_LA_DERECHA`)
- Se borra el aviso «📷 Cada presentación tiene su propia foto…» (solo el aviso; la subida por
  presentación `subirFotoPres`/`fotoRef`/`presPend`/`<input type=file>` sigue igual).
- La tarjeta de grano: el valor pasa a dos renglones pegados a la derecha («Tipo de Grano L1103» /
  «Familia L11»); se va la descripción larga; el aviso ámbar «⚠ Sin clasificar» **se queda** (solo
  desaparece cuando el grano ya está puesto). La etiqueta «Variedad» sigue a la izquierda.

## Qué NO se toca
La base; el buscador de Productos y su micrófono; el agrupado por línea; el emoji de línea, el chevron
y el onClick que abre la ficha; la subida de foto; el botón «Cambiar/Clasificar el grano» y todo el
modo edición (`FiltroBuscador`, Cancelar, Guardar, `guardarGrano`); la clase `.meta` global (ajustes
en línea si hace falta); roles y permisos; `sistema-web.html` y las apps del vendedor.

## Publicación
`freelance-completo.html` **v476** · `sw.js` **CACHE freelance-v321**. Arneses de versión ajustados
(`test_cambios_419/422`, `test_fe01_tarifas`, `test_fe03_pagos`) + `test_catalogo_productos` repuntado.
`compilar.js` + `pruebas.js rapido` en verde.
