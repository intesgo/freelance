# PEDIDOS P2-5 · Quitar el editor web muerto (limpieza)

Solo frontend (`sistema-web.html`); la base NO se toca. Al publicar: subir `VERSION`
(web) + `CACHE` (`sw.js`) y verificar el deploy.

## Contexto
En `sistema-web.html` conviven DOS editores de pedido:
- **VIVO:** `abrirEdicionArmar` / `guardarCambiosPedido` (lo llama el botón ✏️, ~L6064).
- **MUERTO:** `abrirEdicion` / `guardarEdicion` y su modal, inalcanzable: `abrirEdicion`
  (def ~L5682) nunca se llama, y `editPed` solo se pone a un id DENTRO de esa función
  muerta (`setEditPed(pedId)` ~L5691), así que el modal viejo (JSX gated por
  `editPed && …` ~L6079) nunca se renderiza.

## Objetivo
Eliminar TODO el clúster del editor viejo, sin tocar el nuevo.

## Pasos
1) Verificar que `abrirEdicion` NO se llama en ningún lado (solo `abrirEdicionArmar`), y
   que `editPed`/`setEditPed` solo se usan dentro del clúster viejo.
2) Eliminar, confirmando que sus ÚNICAS referencias están dentro del clúster viejo:
   - `const abrirEdicion` (~L5682) y `const guardarEdicion` (~L5705).
   - `cerrarEdicion`, `editSet`, `editQuitar` y helpers que usen SOLO el modal viejo.
   - el estado `editPed`/`setEditPed` (useState ~L5250) y `editItems`/`editTexto`/`editError`
     SOLO si no los usa el editor nuevo (verificar).
   - el JSX del modal viejo (bloque gated por `editPed && …`, ~L6079 y su contenido).
3) NO tocar: `abrirEdicionArmar`, `guardarCambiosPedido`, ni el botón ✏️ que los llama,
   ni ningún estado que use el editor nuevo.

## Regla
Si algún símbolo del clúster viejo resulta estar referenciado también por el editor nuevo
o por otra parte viva, NO borrarlo; dejarlo y anotarlo. Solo se elimina lo que quede 100% huérfano.

## Criterio de aceptación
- El editor de pedido de la web sigue funcionando igual (abre con ✏️ vía `abrirEdicionArmar`,
  guarda vía `guardarCambiosPedido`), sin errores en consola.
- `abrirEdicion`, `guardarEdicion` y el modal viejo ya no existen en el archivo.
- La suite sigue verde.

## Entrega
Dejar ancla `/* PED_WEB_EDITOR_UNICO */` donde estaba el editor viejo. Validar (compilar +
pruebas), publicar (VERSION + CACHE), verificar el deploy y avisar para probar en el celular.
