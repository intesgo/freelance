# TANDA 1B · Cupo real con "usado" desde la cartera (4 apps)

Solo frontend. NO tocar base/RPC/RLS. Ancla `/* PED_CUPO_VIVO_PARIDAD */`.
Preservar las correcciones previas (conversión qq, canon P1/P2, piso P5, origen_canal,
editor único, responder_solicitud, sin fallback demo).

## Problema
- Las apps (armador de pedido) calculaban el cupo con la tabla estática `FICHA_CLIENTE`.
- La web leía `clientes.usado`, columna que está en 0 para todos (nadie la actualiza).
Ninguno usaba el "usado" real.

## Fórmula única (idéntica en las 4 apps)
- `usado(cliente) = Σ cartera_cliente.monto WHERE cli_id=<cliente> AND es_demo=false AND estado='pendiente'`
- `cupo(cliente) = clientes.cupo` (dato real ya poblado)
- `disponible = cupo − usado`
- `expuesto = usado + crédito del carrito` (solo líneas a crédito)
- `excede (solo crédito) = expuesto > cupo` → marca "con autorización", NO bloquea

## Reglas (iguales app y web)
- solo líneas a crédito consumen cupo; el contado no;
- P5 fuera del cálculo ordinario (sigue su autorización);
- exceder NO bloquea el armado, lo marca para autorización;
- cliente bloqueado SÍ impide guardar (motivo_bloqueo);
- en modo demo se usan datos de ejemplo, como hoy.

## Implementación
- **Apps (freelance/Comisionista/socio):** en la carga viva del pedido (efecto `vivoPed`)
  se amplió el `select` de clientes (`cupo,plazo,bloqueado,motivo_bloqueo`) y se agregó una
  consulta a `cartera_cliente(cli_id,monto,estado,es_demo)`. Se suma por cli_id (pendiente,
  no demo) → `usadoPorCli`, y se arma `FICHA_VIVA_PED[nombre] = {cupo, debe:usado, …}`. La
  línea `const ficha/fichaCli` del armador ahora usa `FICHA_VIVA_PED[cli]` en vivo (`vivoPed`
  presente) y `FICHA_CLIENTE[cli]` solo en demo. El resto del cálculo (cupoTotal/deudaActual/
  expuesto/excede) no cambió.
- **Web:** en el efecto `clientesReales` se agregó la misma suma de cartera por cli_id y se
  reemplazó `usado: c.usado||0` por `usado: Math.round((usadoPorCli[c.cli_id]||0)*100)/100`.
  El cupo (`clientes.cupo`) ya lo traía.
- Homologado: app y web dan el mismo número al centavo (misma fuente, mismo redondeo).

## Qué NO se toca
Base/RPC/RLS; la lista de clientes del armador de las apps sigue excluyendo a los bloqueados
en el `select` (`bloqueado=false`) — no se cambia quién aparece; el bloqueo al guardar ya lo
maneja cada app. La web mantiene su guardia `!cli.bloqueado`.

## Cómo verificar
- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- `test_paridad_cupo_app.js` (reescrito): el cupo/usado salen de `clientes.cupo` + cartera
  (no de FICHA ni de `clientes.usado`); contado no consume; exceso de crédito arma pero marca
  autorización; paridad app=web. Mutantes que caen: cupo de FICHA en vivo; usado de
  `clientes.usado`; contado consume cupo.
- En el celular: con la cartera real vacía, el disponible = cupo completo (correcto: la deuda
  nace al facturar).

## Versiones
Freelance v464, Comisionista v188, Socio v56, Sistema Web b179, caché `freelance-v274`.

## Deuda técnica (solo reportada, NO tocada)
`aprobar_pedido` no revalida cupo en el servidor: el cupo sigue siendo control de interfaz,
no de servidor. Cerrarlo requiere autorización aparte de base (Cowork).

## Trampas conocidas
- El "usado" homologado usa `estado='pendiente'` y `es_demo=false` (más estricto que las
  cargas de cartera existentes, que filtran `estado!='pagada'` en JS y no filtran demo): por
  eso se agregó una consulta dedicada en cada app.
- Los tres apps de teléfono llevan `cli` como NOMBRE (mapa por nombre `FICHA_VIVA_PED`); la
  web lleva `cli` como objeto con `.id`/`.cupo`/`.usado`.
