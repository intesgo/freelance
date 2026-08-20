# PEDIDOS P3-8 · Pruebas de paridad app↔web (blindaje)

Solo pruebas (carpeta `pruebas/`); no toca la base ni las apps de producción salvo lo
necesario para test. **No cambiar VERSION ni publicar** (no hay deploy en este bloque,
salvo anclas menores).

## Objetivo
Pruebas de COMPORTAMIENTO (render real con JSDOM+Babel+supabase simulado, como
`test_pedidos_cliente.js` / `test_qq_carrito.js`), no regex, que FALLEN si se reintroduce
alguno de los bugs ya corregidos. Donde aplique, prueba de mutación ("nace roja"): romper
el código a propósito y exigir que la prueba caiga.

Contexto: hoy el canal web casi solo tiene regex, y `ARNES_SECCIONES_WEB.js` (que sí
renderiza secciones de la web) está HUÉRFANO (no está en el plan de `pruebas.js`).
Engancharlo al plan para tener comportamiento real de la web.

## Cobertura obligatoria (una prueba por punto, con su mutante)
1) Canon P1/P2 idéntico en TODOS los canales: P1=Crédito, P2=Contado en
   freelance-completo, Comisionista, socio-comercial y sistema-web. Cae si en cualquiera
   se invierte. (Verificar el mapa efectivo, no solo que exista.)
2) Conversión en la edición WEB (sistema-web): editar un pedido y agregar un producto en
   Arroba (equiv 0,25), 50 arrobas a $10/arroba → guardar `cantidad_qq=12,5` y
   `precio_qq=40`. Mutante: quitar la conversión (mandar crudo) → cae. (Hoy NO existe
   cobertura de conversión en la web.)
3) Piso de P5 en app y web: un P5 por debajo de `costo_condición × (1+margen_min/100)` se
   BLOQUEA; uno igual o por encima PASA. `costo_contado` para contado, `costo` para
   crédito. Mutante: bajar/quitar el piso → cae.
4) Cupo de crédito en app y web: una línea de CONTADO no reduce el cupo; un pedido a
   crédito por encima del cupo se puede armar y queda "por autorizar" (no se bloquea),
   igual en ambos canales. Mutante: contado consume cupo o se bloquea → cae.
5) (Paridad de creación, si es viable) mismos inputs creados por app y por web → mismos
   `cantidad_qq`, `precio_qq`, `tipo_precio` y `condicion` en el payload a
   `registrar_pedido_atomico`.

No incluir aún: "una tarjeta por pedido" en la web (P0-2 no implementado;
`test_pedidos_cliente.js` todavía afirma "una fila por producto"). Anotado como pendiente
ligado a P0-2; no probar ahora.

## Requisitos
- Comportamiento real (no regex) para 2, 3, 4; para 1 vale verificación estructural del
  mapa efectivo + mutante.
- Cada prueba corre sobre las apps que correspondan (web: sistema-web; app:
  freelance-completo/Comisionista/socio).
- Enganchar `ARNES_SECCIONES_WEB.js` al plan de `pruebas.js`.
- Marcar cada archivo nuevo con `/* PED_TESTS_PARIDAD */`.

## Criterio de aceptación
- La suite completa corre verde con el código actual.
- Cada prueba 1–4 CAE con su mutante (demostrarlo en el reporte).
- La web pasa a tener cobertura de comportamiento en edición/conversión y P1/P2.

Al terminar: correr la suite completa, reportar verdes/exentas y confirmar que los
mutantes tumban sus pruebas.
