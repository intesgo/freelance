# FE-08 · «Por visitar» como lista plegable con acción directa

ESTADO: publicado (app Freelance v455)
APPS: `freelance-completo.html` únicamente. BASE: no toca la base (100% front-end).
ORIGEN: alcance con vista previa aprobada por el usuario.

## Qué se cambió y por qué

El banner «Por visitar · N próximos a pedir» de la pantalla de inicio pasó de ser un
botón que abría un modal, a un **bloque plegable** en la misma posición (entre «Total a
recibir» y el grid de 6 accesos):

- **Plegado:** una sola barra, idéntica al banner de hoy, con chevron.
- **Desplegado:** la misma barra como encabezado + hasta 3 renglones (nombre, zona ·
  contexto, semáforo) con botón **«Tomar pedido»** que abre el pedido **con el cliente ya
  puesto**, y **«Ver todos»** al módulo completo (el mismo modal de antes).

## Archivos y puntos exactos (`freelance-completo.html`)

- CSS del bloque: `.pv-cab`, `.pv-chevron`, `.pv-lista`, `.pv-row`, `.pv-nombre`,
  `.pv-ctx`, `.pv-cta`, `.pv-vertodos` (junto a `.visita-leyenda`). Reusa `.alerta-visita`.
- Helper `diasDesdeFechaEC()` + const `PV_ABIERTO_KEY` (junto a `periodoRecibirEC`).
- Componente `Inicio(...)`: nueva prop `irPedidoCliente`, estado `visitasAbierto`
  (persistido en localStorage), y el bloque plegable que reemplaza al banner.
- Router (`App`): `Inicio` recibe `irPedidoCliente={(c)=>{ setCliInicial(c); navegar("pedido"); }}`.

## Datos (regla estricta, cumplida)

- Nombres/conteo/orden: **misma fuente de siempre**, `clientesPorVisitar()` (urgentes primero).
- Zona y última compra: `FICHA_CLIENTE[cliente]` (`zona`, `ultimaCompra`) — ya existían en
  el front, con las mismas claves. **No se creó ninguna consulta, vista, función ni columna.**
- Contexto del renglón: rojo → «sin stock»; ámbar → «última compra hace N días»
  (calculado en zona Ecuador con `diasDesdeFechaEC`; si no se puede leer la fecha, se omite,
  nunca se inventa).
- **Ningún dato faltó**: no hubo que pedir nada a Cowork/base.

## Permisos (no tocados)

- La lista sale de `clientesPorVisitar()` (⊆ `FICHA_CLIENTE`, la cartera del freelance en
  sesión). No se agregan clientes ni se relaja ningún filtro. No se tocó lógica de roles.
- Bloque exclusivo de `freelance-completo.html`: los demás roles son archivos aparte y no
  lo heredan.

## Estados y bordes (§6)

- Sin clientes → barra plegada sin flecha: «Sin visitas pendientes hoy».
- Un cliente → 1 renglón, sin «Ver todos». Más de 3 → 3 renglones + «Ver todos (N)».
- Sin zona → se omite la zona (sin guion suelto ni «null»/«undefined»).
- Nombres largos → recorte con puntos suspensivos; el botón no se mueve ni encoge.

## Preferencia recordada

- Abierta/cerrada se guarda **local** en `localStorage` (`freelance_porvisitar_abierto_v1`).
  Nunca en la base. Estado inicial de un usuario nuevo: **PLEGADA** (v456; corrige la
  decisión de v455, que arrancaba desplegada). Si el vendedor la deja abierta, la próxima
  vez aparece abierta. El chevron ⌄ queda visible (única pista de que la lista existe).

## Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- En el celular: plegada, la pantalla entra sin scroll (igual que hoy). Desplegada, los 3
  renglones y «Tomar pedido» abre el pedido con el cliente correcto. Cerrarla y reabrir la
  app: sigue cerrada.

## Trampas conocidas

- El contexto «última compra hace N días» depende de `FICHA_CLIENTE[cli].ultimaCompra` con
  formato «DD mmm YYYY». Si algún día ese dato cambia de formato, `diasDesdeFechaEC` devuelve
  null y el renglón muestra solo la zona (no se rompe, pero pierde el dato).
- Todo el panel sigue apoyado en el demo (`STOCK_ANTERIOR`, `FICHA_CLIENTE`); cuando la base
  entregue estos datos de verdad, el bloque los tomará igual siempre que respete las claves.
