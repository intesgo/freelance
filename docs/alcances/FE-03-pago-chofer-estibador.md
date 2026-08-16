# FE-03 · Pago al chofer/estibador

ESTADO: pendiente
APPS: `sistema-web.html` (Logística y Financiera) y `transportista-app.html` (app del chofer).
BASE: ya aplicada por Cowork (migración `fe03_pago_chofer_estibador`). **Code no toca la base.**
  - El pago **nace solo al despachar** (disparador sobre las guías). No hay que insertarlo.
  - Tabla `pagos_fe` con llave única `(guia + concepto)` = **no doble pago**.
  - RPCs: `asignar_estibador_ruta(ruta_id, estibador_id)` y `pagar_fe(pago_id)`.
  - **Flete** por **facturados** (firme). **Estibada** por **entregados** (provisional → firme al entregar).

## Qué se cambia y por qué

Que el freelance vea y pague lo que le toca a cada chofer y estibador, sin doble pago y sin teclear:
el pago se calcula solo al despachar, con las tarifas de FE-01.

## Dónde (ancla `/* FE03_PAGOS_UI */` en cada punto)

### 1) Logística (Sistema Web)
En la ruta, junto al **chofer**, agregar el **selector de estibador**. Al elegirlo, llamar
`asignar_estibador_ruta(ruta_id, estibador_id)` **ANTES de despachar**. El despacho ya crea los pagos
solo (no insertar nada). Mostrar el **pago estimado** leyendo `pagos_fe` del viaje.

### 2) Financiera (Sistema Web)
Pantalla de **pagos por viaje/guía** desde `pagos_fe`:
- **Flete** sale `firme` con botón **«Marcar pagado»** → `pagar_fe(pago_id)`.
- **Estibada** sale `provisional` (espera la entrega), pasa a `firme` sola; recién ahí se paga.
- Estado `pendiente_tarifa` = falta cargar la tarifa de esa persona (ir a **FE-01** y ponerla).

### 3) App Transportista (`transportista-app.html`)
Leer `pagos_fe` donde `persona_id = su usuario` y `concepto='flete'`; mostrar por **viaje/guía** con
estado (**por cobrar / pagado**). **Sin estibada.**

## Qué NO se debe tocar

- La base ni los disparadores (ya crean los pagos). No insertar en `pagos_fe`.
- La comisión, otros roles, el camino demo.
- El despacho existente: solo se agrega la asignación de estibador ANTES y la lectura del pago.

## Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Subir `VERSION` de las apps tocadas (Sistema Web y Transportista) + `CACHE` del `sw.js`, y ajustar
  los arneses de versión.
- En la web: en una ruta, elegir estibador (se asigna), despachar, y ver el pago estimado del viaje;
  en Financiera, marcar pagado un flete firme (la estibada provisional no se puede pagar hasta firme).
- En la app del chofer: ver sus fletes por viaje con estado por cobrar/pagado.

## Trampas conocidas

- **Asignar estibador ANTES de despachar:** si se despacha sin estibador asignado, no nace el pago de
  estibada de esa ruta. El selector debe llamar `asignar_estibador_ruta` en el momento de elegir.
- **No insertar pagos:** los crea el disparador al despachar. Code solo **lee** `pagos_fe` y llama
  `pagar_fe`/`asignar_estibador_ruta`.
- **Estados:** `provisional` (estibada, aún no entregado) no se paga; `firme` sí; `pendiente_tarifa`
  avisa que falta la tarifa (FE-01). El flete es firme desde el despacho (por facturados).
- Arneses atados a versión/diseño de Logística y del pago: ajustarlos en el mismo cambio.
