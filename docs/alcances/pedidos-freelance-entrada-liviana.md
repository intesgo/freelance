# Pedidos (App Freelance) · entrada liviana + rendimiento

ESTADO: pendiente
APPS: `freelance-completo.html` (componente `Pedidos`, ~línea 11003). Nada más.
BASE: no toca la base. Solo diseño y cómputo local.

## Qué se cambia y por qué

La pantalla de Pedidos de la App Freelance llega "cargada": antes de ver la lista hay 4 KPI +
DOS tarjetas grandes de panorama ("Dónde están" / "Por proveedor") + pestañas + un párrafo de
regla + buscador + filtros. En el celular es mucho scroll antes de los pedidos. Además el
cargador arma cosas de más. Objetivo: entrada liviana (aterrizar en pestañas+lista) y quitar
recomputos.

## Cambios (todo en `freelance-completo.html` · una sola publicación)

### A) Entrada más liviana (visual)

1. Dejar arriba SOLO la fila compacta de 4 KPI (`mini-kpi`, ~11088-11110) y, enseguida, las
   pestañas + buscador + lista.
2. Mover las DOS tarjetas grandes de panorama (bloque `ndash`, ~11114-11180) a una sub-vista
   "Resumen" DENTRO del mismo componente `Pedidos` (igual que `sel` abre el detalle): un estado
   `vistaResumen`, un botón "📊 Resumen" cerca de los KPI que la abre, y un "‹ Volver" que
   regresa a la lista. NO es ruta nueva; es como ya funciona el detalle. IMPORTANTE: conservar
   que tocar una barra de estado/proveedor filtra y lleva a la pestaña correcta (usa
   `irAEstado`/`cambiarPestana`): desde Resumen, al tocar un estado debe cerrar Resumen y
   mostrar la lista ya filtrada.
3. El párrafo de regla bajo las pestañas (~11189-11195) → convertirlo en un ícono "ⓘ" que
   muestre ese texto al tocarlo (tooltip/expandible). Baja ruido vertical sin perder la regla.

### B) Rendimiento (sin cambiar qué se ve)

4. En `vivoPedidos` (~18349): indexar los ítems por pedido UNA vez
   (`const itemsPorPed={}; items.forEach(i=>{(itemsPorPed[i.ped_id]=itemsPorPed[i.ped_id]||[]).push(i);})`)
   y usar `itemsPorPed[p.ped_id]||[]` en vez de `items.filter(...)` por cada pedido.
5. NO armar la línea de tiempo (`linea`, ~18400-18405) dentro de `vivoPedidos`. Sácala a un
   helper (p.ej. `lineaDePedido(p)`) y constrúyela SOLO en `DetallePedido` (~11402), que es el
   único que la usa (`p.linea` en 11411 y en la vista Seguimiento). ANTES de quitarla del
   cargador, busca con patrón MULTILÍNEA todos los usos de `.linea` sobre un pedido para
   confirmar que solo `DetallePedido` la consume.
6. Envolver en `useMemo` los agregados del panorama (`activos`/`porEstado`/`porProv`) y el
   cálculo de `lista`/`ordenada`, con dependencias `[pedidos,q,estado,desde,hasta,orden,pestana]`,
   para que escribir en el buscador no recompute los gráficos.

## Qué NO se debe tocar

- La paginación (`POR_PAGINA=15`) ni el filtrado/orden ya existentes.
- La lógica de pestañas (`TAB_ESTADOS`/`tabDe`/`SELLADOS`) ni la regla de qué es
  editable/anulable.
- El detalle, el editor de líneas (`abrirEditor` carga a demanda: dejarlo así) ni permisos.
- Ninguna llamada a la base ni la forma de los datos de `vivoPedidos` (salvo el índice interno
  y sacar `linea`, que es cómputo local).

## Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Sube `VERSION` de la app y `CACHE` de `sw.js` juntas; actualiza los arneses atados a
  versión/diseño (`test_cambios_*`) en el MISMO cambio.
- Si algún arnés valida la estructura de la pantalla Pedidos (secciones/barras), ajústalo a la
  nueva disposición.
- Probar en el celular: al entrar a Pedidos se ve pestañas+lista rápido; el botón Resumen abre
  las dos tarjetas y "volver" regresa; tocar un estado en Resumen filtra la lista; el ícono ⓘ
  muestra la regla; abrir/editar/anular un pedido siguen igual.

## Trampas conocidas

- `DetallePedido` usa `p.linea` (cumplidos = `p.linea.filter`). Si sacas `linea` del cargador,
  constrúyela en el detalle o rómpelo. Verifica con grep multilínea TODOS los usos de `.linea`.
- El panorama recomputaba en cada render por estar en IIFE en línea: al pasar a `useMemo`,
  cuida las dependencias (incluye `pedidos`) o mostrará datos viejos tras recargar.
- Es solo diseño/rendimiento local: NO cambia datos, permisos ni reglas de negocio.
