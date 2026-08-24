# Alcance · FE_TANDA3 · Etapa 2 — Modal de despacho rediseñado (multi-zona + convenio)

> `sistema-web.html` · componente `TrazabilidadWeb` (Logística), modal «Despachar».
> **Solo front, solo consume la base** (la migración `fe_rediseno_tanda2_multizona_convenio`
> ya está aplicada por Cowork). No toca la base.

## Verificación previa de punta a punta (§9)
Antes de construir se leyó la base (solo lectura) para confirmar el contrato:
- `despachar_ruta` tiene el 7º parámetro `p_asignacion jsonb DEFAULT NULL` y, cuando llega, inserta
  en `viaje_flete(viaje_id,zona_id,valor_convenio,org_id)` y
  `viaje_estibadores(viaje_id,zona_id,estibador_id,valor_convenio,org_id)`.
- El disparador `fe_pagos_al_despachar()` (AFTER INSERT de cada `viaje_guias`) genera los `pagos_fe`:
  resuelve la zona con `fe_zona_de_ciudad(pedido.ciudad)`, toma la tarifa con
  `fe_tarifa_vigente(concepto,persona,zona)` y, si hay convenio en `viaje_flete`/`viaje_estibadores`,
  lo usa y marca `autorizado=false` **solo cuando el convenio ≠ la tarifa por defecto**. La estibada
  nace únicamente si hay estibador en `viaje_estibadores` (o el viejo `viajes.estibador_id`).
- La ruta ya trae `ciudad` y `qq_planificado` por pedido (`ruta_pedidos`), así que el front puede
  agrupar por zona igual que la base. **Nada faltaba en la base → se construyó.**

## Qué se cambió
- **Sobre (`p_asignacion`) en un solo guardado:** el despacho ya **no** llama a
  `asignar_estibador_ruta`. Ahora arma `p_asignacion = { flete:[{zona_id,convenio}],
  estibadores:[{zona_id,estibador_id,convenio}] }` y lo manda como 7º parámetro de `despachar_ruta`.
- **Dos caras (botones):** «🚚 Transportista y flete» y «💪 Estibador(es)» (se ocultan con `display`,
  no se desmontan, para no perder lo escrito). El resumen y el botón de despachar quedan siempre abajo.
- **Flete por ZONA (tramos):** cada zona de la ruta con su qq y el $/qq por defecto del transportista;
  se puede pactar un convenio por zona. La zona «Sin zona» (ciudades aún no asignadas a ninguna zona)
  se paga con la tarifa general del chofer y ahí no se pacta convenio (la base exige `zona_id`).
- **1 ó 2 estibadores:** cada uno con su zona (vacío = toda la ruta) y convenio opcional. Con dos, se
  exige zona distinta a cada uno para que la base sepa quién estiba qué.
- **Convenio → «por autorizar»:** si un convenio difiere de la tarifa por defecto, el renglón se marca
  con «⏳ por autorizar» en el front y la base lo hace nacer con `autorizado=false` (lo aprueba luego el
  freelance, Tanda 4).
- **Resumen** antes del botón: estimado de flete + estibada, cuántos renglones quedan «por autorizar» y
  aviso si alguna zona no tiene tarifa (nace «pendiente de tarifa»).
- El front replica exactamente la base para no descuadrar la zona: `zonaDeCiudad` (ciudad dentro de
  `zonas.ciudades[]`, sin mayúsculas ni espacios) y `tarifaDe` (tarifa exacta de la zona, o la general
  si no hay). `mapRutaViva` ahora guarda `ciuPlan` (ciudad por pedido).

## Qué NO se tocó
La base (todo por RPC ya aplicado; ningún insert/update/delete), el candado de facturación antes de
despachar, la placa/capacidad sugerida, el panel de pagos del viaje, la app del chofer, los permisos ni
las reglas de negocio. El pago de flete de zonas sin convenio sigue saliendo con la tarifa del chofer.

## Cómo verificar
1. `node scripts/compilar.js` + `node pruebas/pruebas.js rapido` en verde.
2. En el celular (rol logística/freelance), en Logística → Despachar una ruta ordenada:
   - Cara «Transportista y flete»: elegir chofer, ver el flete por zona con su qq; pactar un convenio en
     una zona y ver que el renglón se marca «por autorizar».
   - Cara «Estibador(es)»: elegir 1 estibador (toda la ruta) o 2 (uno por zona); convenio opcional.
   - Resumen abajo con el estimado; «Despachar» sale el viaje y abre el panel de pagos.
3. En Pagos (Financiera) y en «Convenios por autorizar» (freelance, Tanda 4): los convenios pactados
   aparecen «por autorizar» y no se pagan hasta aprobarlos.

## Trampas conocidas
- La zona la resuelve **la base** por la ciudad del pedido; el front solo la replica para mostrar. Si una
  ciudad no está en ninguna zona, cae en «Sin zona» (flete con tarifa general; sin convenio).
- El flete se manda en `p_asignacion.flete` **solo** cuando hay convenio; sin convenio, la base usa la
  tarifa del chofer igual (no hace falta mandarlo).
- Con dos estibadores «toda la ruta» el pago sería ambiguo (la base toma uno solo): por eso el front
  exige zona distinta a cada uno.
- Los montos del resumen son **estimados** (qq planificado × tarifa); el pago real lo calcula la base por
  qq facturado al despachar.
