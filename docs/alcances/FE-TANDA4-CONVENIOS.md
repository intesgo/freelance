# Alcance · FE_TANDA4 · Aprobación de convenios (freelance) + candado en Financiera

> `sistema-web.html` · módulo **Pagos**. **Solo front, solo consume la base** (la migración
> `fe_rediseno_tanda2_multizona_convenio` ya está aplicada por Cowork). No toca la base.
> Cierra el rediseño #2 de flete/estibada.

## Qué se cambió y por qué

Cuando en el despacho se pacta un valor de flete/estibada distinto del de la tarifa
(un **convenio**), el pago nace en `pagos_fe` con `autorizado = false`. Antes eso no se
veía en ningún lado y Financiera podía pagar un convenio que nadie aprobó. Ahora:

### A) Pantalla del freelance · «Convenios por autorizar»
- Nuevo componente **`AprobarConveniosFE`** (ancla `TANDA4_APROBAR`), montado **arriba** del
  módulo Pagos, **solo visible para el freelance** (comparación de rol insensible a
  mayúsculas; si no es freelance, no renderiza nada).
- Lee `pagos_fe` con `.eq("autorizado", false)` (de la organización activa, no demo), resuelve
  el nombre de la persona (chofer desde `usuarios`, estibador desde `estibadores`) y arma una
  lista: **Viaje · Guía**, **Persona · concepto**, **qq**, **Por defecto** (`valor_default`),
  **Convenio** (`valor_qq`, resaltado), **Monto** y un botón **Aprobar ✓**.
- «Aprobar» pide confirmación y llama al RPC **`aprobar_pago_fe(p_pago_id)`**. Traduce los
  códigos de error (`PAGO_NO_ENCONTRADO`, `ROL_NO_AUTORIZADO`, `SIN_SESION`) a mensajes en
  palabras. Al aprobar, la fila desaparece de la lista (se recarga).

### B) Financiera · muestra el estado y respeta el candado
- El módulo **`PagosFeVivos`** ahora trae también `autorizado` y `valor_default` en su `select`.
- En cada fila, si `autorizado === false` sale la etiqueta **«⏳ por autorizar»**.
- El botón **Pagar** solo aparece cuando el pago está `firme`, no es solo-lectura **y**
  `autorizado !== false`; si está por autorizar, en su lugar se lee **«Falta aprobar»**.
- Además `pagar()` tiene un cinturón de seguridad: si por lo que sea se intenta pagar un
  convenio no autorizado, corta antes de llamar al RPC con un aviso claro; y si el RPC
  devuelve `PAGO_POR_AUTORIZAR`, también se traduce a palabras.

## Qué NO se tocó
La base (ningún insert/update/delete; todo por RPC ya aplicado), el pago normal de tarifa
(los que nacen `autorizado = true` siguen igual), la app del chofer, el módulo de despacho
(Etapa 2 de la Tanda 3), permisos ni reglas de negocio. La app transportista (parte C
opcional: etiqueta «por autorizar») **no se incluyó** en esta tanda por ser mínima/opcional.

## Cómo verificar
1. `node scripts/compilar.js` + `node pruebas/pruebas.js rapido` en verde.
2. En el celular, con rol **freelance**: en «Pagos» aparece arriba «✋ Convenios por
   autorizar». Si hay un pago con convenio pendiente, sale su fila; al «Aprobar ✓» desaparece.
3. Con rol de **Financiera** (o el freelance mismo, más abajo): los pagos con convenio sin
   aprobar muestran «⏳ por autorizar» y **no** dejan pagar («Falta aprobar»); una vez aprobados
   y firmes, vuelve a salir el botón «Pagar».

## Trampas conocidas
- `pagos_fe` **no** tiene `zona_id` (la zona vive en `viaje_flete`/`viaje_estibadores`), por eso
  la lista de convenios no muestra columna de zona: se mostró lo que la tabla sí trae.
- El candado del front es apoyo visual; la base es la que realmente bloquea (RPC `pagar_fe`
  devuelve `PAGO_POR_AUTORIZAR`). No cambia permisos.
- El componente es solo-freelance por diseño; con otro rol no se ve (y la base igual lo
  protegería con `aprobar_pago_fe` → `ROL_NO_AUTORIZADO`).
