# Alcance · Front Fase 2 · Aprobación de crédito que crea la línea por proveedor

La base YA está lista (RPCs `aprobar_credito`, `fijar_limite_credito_freelance`, tabla
`parametros_credito`). **Code no toca la base**; solo llama a lo que ya existe.

## 1. Qué se cambia y por qué (negocio)
Al aprobar una solicitud de **excepción de crédito** (`tipo='excepcion_credito'`), la app del
proveedor debe **capturar cupo, plazo, máximo de facturas y vigencia** y llamar a
**`aprobar_credito`** (que crea/actualiza la línea de crédito del proveedor correcto y deja
avanzar el pedido). El **rechazo** sigue por `responder_solicitud` (sin cambios).

## 2. Qué se cambió
### a) `proveedor-freelance.html` (v77) — ancla `F2_APROBAR_CREDITO`
- Estado `formCredito` = `{id, cupo, plazo, maxFact, vigMeses, obs}`.
- El botón «Autorizar crédito ✓» de una `excepcion_credito` ya **no** llama a
  `responderSolicitud`; abre un **mini-formulario** en la misma tarjeta: Cupo aprobado ($,
  obligatorio > 0), Plazo (días), Máx. facturas, Vigencia (meses, 0 = sin fin), Observación
  (opcional), con botones «Cancelar» y «Aprobar crédito ✓».
- «Aprobar crédito ✓» → `window.SB.rpc("aprobar_credito", { p_sol_id: s.id, p_cupo, p_plazo,
  p_max_facturas, p_vigencia_meses, p_obs, p_op_id })`. Patrón correcto: `setRespondiendo(s.id)` →
  `await` la RPC → si `error`, muestra el mensaje **real** y NO pinta aprobado (si el cupo supera el
  tope del freelance, ese mensaje es esperado); si OK, recién pinta «aprobada» y avanza. Doble clic
  bloqueado (deshabilitado mientras responde). `p_op_id` único (idempotencia). En demo, optimista.
- El **rechazo** y los demás tipos de solicitud (devolución, etc.) **no cambian**.

### b) `sistema-web.html` (b228) — ancla `F2_TOPE_FREELANCE`
- Nuevo campo «Tope de crédito que aprueba el freelance» en **Configuración → Crédito**
  (componente `TopeCreditoFreelance`): lee `parametros_credito.limite_freelance` y lo guarda con
  `window.supa.rpc("fijar_limite_credito_freelance", { p_monto })`. Ayuda: «Si está vacío o en 0,
  todo el crédito lo autoriza el proveedor.» Editable según la misma regla del resto de
  Configuración (el Administrador de Plataforma la ve en consulta; la RPC valida rol server-side).

## 3. Qué NO se tocó
- Base, RLS, `responder_solicitud`, el flujo de devoluciones, el camino demo, ni cómo se **crea** la
  solicitud de crédito (sigue saliendo del ingreso de pedido, P0-c).

## 4. Cómo verificar
- `node scripts/compilar.js` y `PRUEBAS_CARRILES=4 node pruebas/pruebas.js rapido` en verde (116 ✓).
  `ARNES_SECCIONES_WEB` renderiza `ConfiguracionWeb` (con el nuevo campo) sin error; `test_puerta`
  del proveedor en verde.
- VERSION proveedor **v77** + Sistema Web **b228** + CACHE **v338**; arneses de versión al día.
- En el celular (proveedor de San Agustín): un pedido que pasa el cupo → llega «🔐 Autorización de
  crédito» → al aprobar pide cupo/plazo/vigencia → tras aprobar, el pedido avanza. El campo del tope:
  fijar un monto como freelance y ver que guarda.

## 5. Trampas conocidas
- `aprobar_credito` es la **única** puerta para APROBAR crédito; el rechazo va por
  `responder_solicitud`. No mezclar.
- El candado de `responder_solicitud` (para que ya no apruebe crédito) lo pone Cowork en la base
  **después** de publicar esto; mientras tanto nada se rompe.
- Publicar VERSION + CACHE juntos o el robot no publica.
