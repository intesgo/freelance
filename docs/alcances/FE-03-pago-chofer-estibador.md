# FE-03 · Pagos de flete y estibada (tabla `pagos_fe`)

ESTADO: pendiente de publicar
APPS: `sistema-web.html` (Logística y Pagos), `transportista-app.html` (Pagos por transporte).
BASE: ya aplicada por Cowork. Code NO toca la base. Verificado el 17/08/2026 contra producción:
la tabla `pagos_fe`, el RPC `pagar_fe(p_pago_id text)`, el RPC `asignar_estibador_ruta(p_ruta_id
text, p_estibador_id text)` y la columna `rutas_logisticas.estibador_id` YA EXISTEN.

## Qué se cambia y por qué

Los pagos de flete y estibada dejan de deducirse de los viajes de demostración: nacen solos en la
base cuando el camión sale, una fila por guía y concepto. Logística los produce, Financiera los
paga, y el chofer ve los suyos.

## La tabla `pagos_fe` (solo lectura desde el frontend)

Columnas: pago_id, org_id, guia_id, viaje_id, ped_id, concepto ('flete'|'estibada'), persona_id,
zona_id, qq_base, valor_qq, monto, estado, origen, pagado_en, pagado_por, creado, es_demo.

Los cinco estados, en palabras del negocio:
  · firme            → ya se puede pagar
  · provisional      → esperar: la entrega todavía no se confirma
  · pagado           → ya salió la plata
  · pendiente_tarifa → falta la tarifa del chofer o del estibador (FE-01)
  · anulado          → se dio de baja

El NOMBRE de la persona no está en la tabla: si concepto='flete' sale de `usuarios.nombre` por
usr_id; si es 'estibada', de `estibadores.nombre` por est_id.

REGLA DURA: el frontend LEE `pagos_fe` (la RLS lo permite: tiene_ficha() + org_id) y ESCRIBE SOLO
por RPC (`pagar_fe`). Ningún insert/update/delete directo, en ninguna app.

## Dónde

1) Logística — ancla /* FE03_ESTIBADOR_RUTA */ (sistema-web.html, componente TrazabilidadWeb)
   En el modal Despachar, debajo de la placa, un BuscadorPredictivo de estibador alimentado por la
   tabla `estibadores` (activo=true, es_demo=false). Es OBLIGATORIO: sin estibador el botón
   Despachar queda deshabilitado. Al guardar, primero se llama
   `asignar_estibador_ruta({p_ruta_id, p_estibador_id})` y SOLO si sale bien se llama
   `despachar_ruta`.

2) Logística — ancla /* FE03_PAGOS_VIAJE */ (mismo componente)
   Al terminar el despacho se abre un panel con los pagos que nacieron del viaje: guía, concepto,
   persona, qq, $/qq, monto y estado. El mismo panel se abre con un botón «💵 Pagos» en cada viaje
   vivo. Es SOLO LECTURA: aquí no se paga.

3) Financiera — ancla /* FE03_PAGOS_FINANCIERA */ (sistema-web.html, módulo Pagos → PagosWeb)
   Componente nuevo `PagosFeVivos`, montado ARRIBA del módulo Pagos. Va en «Pagos» y no en «Fletes
   y estibada» porque el rol financiero → cargo contadora ve `pagos` y NO ve `recepcion`; ponerlo
   allá obligaría a tocar permisos. Trae pagos_fe (es_demo=false), agrupa por VIAJE y dentro por
   GUÍA, muestra totales (por pagar / esperando entrega / pagado / falta tarifa) y filtros por
   estado. El botón «Pagar 💵» aparece SOLO en los pagos `firme`, pide confirmación y llama
   `pagar_fe({p_pago_id})`; después relee la lista.

4) App Transportista — ancla /* FE03_PAGOS_CHOFER */ (transportista-app.html, SecPagos)
   La pantalla «Pagos por transporte» pasa a leer de verdad: pagos_fe filtrado por
   concepto='flete' Y persona_id = su usr_id. NUNCA estibada (es de otra persona) y NUNCA paga
   (eso es de Financiera). Sin sesión o sin filas, cae al demo de siempre con su aviso.

## Qué NO se debe tocar

- La base ni las funciones: `pagar_fe` y `asignar_estibador_ruta` ya están aplicadas.
- La lógica de permisos y roles: quién ve cada módulo se queda exactamente igual.
- El bloque de pagos derivados de los viajes demo dentro de PagosWeb: se conserva DEBAJO del
  nuevo, sin pisarlo.
- El camino demo de la App Transportista (constante FLETES) y su banner de fuente.
- Los otros roles y apps (Comisionista, socio-comercial, proveedor, freelance): FE-03 no los toca.

## Cómo verificar

- `node scripts/compilar.js` y `node pruebas/pruebas.js rapido` en verde.
- Arnés propio: `pruebas/test_fe03_pagos.js`, registrado en `pruebas/pruebas.js` junto a los de
  FE-01 y FE-02.
- Versiones y caché en el MISMO cambio:
    · sistema-web.html        → VERSION n:"163"
    · transportista-app.html  → VERSION n:"35"
    · sw.js                   → const CACHE = "freelance-v250"
- Arneses atados a versión que hay que ajustar en el mismo cambio: test_fe01_tarifas.js,
  test_fe02_cobro.js, test_cambios_419.js, test_cambios_422.js.
- En el celular / web, después de publicar:
    1. Logística → Despachar una ruta: sin estibador el botón no deja; con estibador el camión
       sale y aparece el panel con los pagos del viaje.
    2. Pagos (con cuenta de contadora o freelance): se ve la lista por viaje/guía; el botón Pagar
       solo sale en los firmes; al pagar, la fila pasa a Pagado.
    3. App del chofer → «Pagos por transporte»: salen sus fletes por guía, ninguna estibada.

## Trampas conocidas

- La RLS de `pagos_fe` es POR ORGANIZACIÓN, no por persona. Un chofer con ficha puede leer los
  pagos de toda la organización: el filtro `persona_id = su usr_id` en la app del chofer NO es
  cosmético, es lo único que evita que vea la plata de los demás. No quitarlo.
- La app del chofer usa `window.SB`, no `window.supa`. Son dos nombres distintos para el mismo
  cliente de Supabase en dos apps distintas.
- `supabase-js` NO lanza excepción cuando la base responde con error: la devuelve en `r.error`.
  Un try/catch a secas no atrapa nada.
- ORDEN en el despacho: el estibador se asigna ANTES de `despachar_ruta`. Al revés, la estibada
  nacería sin persona a quien pagarle. El arnés vigila ese orden.
- `valor_qq` puede venir nulo (estado pendiente_tarifa): mostrar «—», nunca $0,00, para no hacer
  creer que ese trabajo no vale nada.
- PagosWeb sigue mostrando abajo los pagos derivados del demo (EF_VIAJES_INI). Convive a
  propósito; cuando se retire el demo hay que tocar también Dashboard, Conciliación y Finanzas,
  que leen esas mismas constantes.
