# Alcance · DISENO_LOGISTICA_ESCALAS_QQ — «Escoger pedidos» (solo estilo)

> Pantalla: Sistema Web → Logística → «Escoger pedidos» (`sistema-web.html`,
> componente `TrazabilidadWeb`, función `seleccionPedidos()` ~L3077).
> **Solo estilo + reubicar un botón + un badge.** NO toca datos, cálculos,
> permisos ni el flujo de ruta. Un solo PR.

## 1. Cuatro niveles de qq (solo color/peso)

- **TOTAL DE CIUDAD** (`{Math.round(qqC)} qq`): verde bosque **#123d29**, peso 800, ~17.5.
  La palabra «qq» chica y en muted. Es el número más fuerte.
- **TOTAL DEL PEDIDO / fila** (`{Math.round(qqIra)} qq`): tinta (`COLOR.text`), peso 800, ~15.
  Los sufijos «· N fuera» y «· ⚠ llena un camión» siguen en ámbar/naranja.
- **LÍNEA DE PRODUCTO** (`{it.q} qq`): gris apagado (`COLOR.muted`), peso 600 (pesa menos que el total).
- **IRÁ A DESPACHO**: tealDark con **pastilla** de fondo **#E4EFE7** (padding 3px 10px, redondeada), peso 800.
- **PRODUCTO EXCLUIDO** (casillero desmarcado): el número de qq en **rojo #c0392b** con `line-through`.

No se cambian anchos de columnas ni la lógica; solo color/peso de esos números.

## 2. Píldora flotante con la suma

- Se reemplazó la barra inline del final de la lista por una **píldora flotante fija**
  (`position:fixed`, abajo, centrada, con sombra) que aparece al marcar el primer pedido
  y se mantiene visible al hacer scroll y seguir marcando.
- Muestra «🚚 {idsSel.length} entregas · {Math.round(qqSel)} qq» y «Guardar ruta ✓»
  (mismo `onClick={guardarRuta}`, mismo `disabled={rpcOn}`). Usa `idsSel`/`qqSel` tal cual
  (`qqSel` ya descuenta los productos excluidos; **no se recalcula**).
- Para no duplicar: se quitó la barra inline; queda **solo** la flotante.
- En móvil respeta la barra del sistema (`env(safe-area-inset-bottom)`).

## 3. Condición de pago

- **3a)** Se quitó el «contado/crédito» de cada producto en el **detalle** (`it.cond` ya no se muestra ahí).
- **3b)** En la **línea del cliente** aparece una pastilla **«💵 CONTADO»** (fondo #FCEFD6, texto #B26A00,
  peso 800) **solo** cuando el pedido es de contado. Los de crédito NO llevan badge (así el ojo va a
  los de contado, que hay que cobrar al entregar).
- Cómo se sabe que es contado (no hay campo de pago por pedido; se deriva de las líneas):
  `esContado = (p.items||[]).length>0 && p.items.every(it => /contado/i.test(it.cond||""))`.
  **`it.cond` no se borra**: se deja de MOSTRAR en el detalle, pero se usa para el badge.

## Qué NO se tocó

- Cálculos de qq (`logQQ`/`qqPlan`/`qqSel`), la selección (`sel`/`toggleSel`/`toggleCiudad`),
  los casilleros (`toggleItem`/`excluidos`), `guardarRuta`, permisos ni otras pantallas.

## Cómo verificar

1. `node scripts/compilar.js` (compila).
2. `node pruebas/pruebas.js rapido` en verde. Guardas en `test_cambios_422.js`
   (bloque `DISENO_LOGISTICA_ESCALAS_QQ`).
3. En el celular tras publicar (b197 / caché v301): píldora flotante con la suma que sube al
   marcar; 4 niveles de qq bien diferenciados; producto excluido en rojo tachado; el detalle
   ya NO muestra contado/crédito; la fila del cliente muestra «💵 CONTADO» solo en contado.

## Refuerzo b198 (segunda vuelta)

1. **FIX de la suma:** `qqSel` (la suma de la píldora) y `qqC` (total por ciudad) usaban
   `logQQ(p)`, que **no** resta los productos excluidos con los casilleros. Se cambiaron a
   `qqPlan(p)`. Como `qqPlan` se declara después, **`qqSel` se movió debajo de `qqPlan`**
   (si no, `ReferenceError`).
2. **Píldora arrastrable:** con **Pointer Events** (dedo y mouse), con **tope al borde**
   (`clamp` a `window.innerWidth/innerHeight`). El botón «Guardar» lleva `data-nodrag` para
   que **arrastrar desde él no mueva** la píldora ni dispare el guardado. `touchAction:"none"`
   para que el arrastre no haga scroll de la página.
3. **Textos cortos:** «entregas» → «E»; «Guardar ruta ✓» → «Guardar ✓».

## Trampas conocidas

- Desde b198, `qqSel`/`qqC` usan `qqPlan` (restan los excluidos). No volver a `logQQ`, y
  mantener `qqSel` **debajo** de `qqPlan` para no romper el orden de declaración.
- El badge de contado se calcula de las líneas del pedido, **no** de un campo de pago (no existe).
- Un pedido **mixto** (parte contado, parte crédito) **NO** se marca como contado.
- El arrastre usa `setPointerCapture`; el botón se salva del arrastre con `data-nodrag`
  (`e.target.closest("[data-nodrag]")`).
