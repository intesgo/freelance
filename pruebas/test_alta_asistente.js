#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   ALTA_ASISTENTE · el alta de cliente NUEVO (Sistema Web) es un asistente por
   pasos (modalidad → datos → fiscal → sucursales → vinculación → crédito →
   resumen). La EDICIÓN de un cliente existente conserva las pestañas. Además,
   estados de gestión en la ficha: Bloquear/Desbloquear · Anular · Reactivar.
   Inspección del fuente (no navegador).
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const web = fs.readFileSync(path.join(__dirname, "..", "sistema-web.html"), "utf8");
let b = 0, m = 0;
const ok = (c, x) => { if (c) b++; else { m++; console.error("✗ " + x); } };

/* 1 · MODALIDAD_PAGO · lista cerrada de 5 modalidades + helper */
["CONTADO_BODEGA","CONTADO_DOMICILIO","CREDITO_BASICO","CREDITO_FUERTE","CREDITO_MUY_FUERTE"].forEach(k =>
  ok(new RegExp('key:"'+k+'"').test(web), "MODALIDADES_CLI incluye "+k));
ok(/const MODALIDADES_CLI = \[/.test(web) && /const modalidadCli = /.test(web), "existe MODALIDADES_CLI y el helper modalidadCli");

/* 2 · el asistente es SOLO para cliente nuevo (esEdicion=false); la edición conserva pestañas */
ok(/ALTA_ASISTENTE/.test(web), "queda el ancla ALTA_ASISTENTE");
ok(/if \(!esEdicion\) \{/.test(web), "el asistente se pinta solo cuando NO es edición (if (!esEdicion))");
ok(/const tabs = \["Identificación","Ubicación","Canal","Crédito","Fiscal","Facturación","Expediente"\];/.test(web),
   "la EDICIÓN conserva sus pestañas de siempre (no se tocó)");

/* 3 · los 7 pasos del asistente */
["modalidad","datos","fiscal","sucursales","vinculacion","credito","resumen"].forEach(k =>
  ok(new RegExp('key:"'+k+'"').test(web), "el asistente tiene el paso "+k));

/* 4 · Consumidor final SOLO en contado y omite el paso fiscal */
ok(/const esCF = docTipo === "CF";/.test(web), "consumidor final se detecta con docTipo === \"CF\"");
ok(/modalContado && <button onClick=\{\(\)=>\{ setDocTipo\("CF"\)/.test(web), "el botón «Consumidor final» solo aparece en modalidades de contado");
ok(/esCF \? \[\] : \[\{ key:"fiscal"/.test(web), "el paso Fiscal se omite cuando es consumidor final");

/* 5 · vendedor obligatorio (no «sin vincular») */
ok(/const vendedorOkW = !!form\.dueno && \(form\.dueno==="freelance" \|\| !!form\.subId\);/.test(web),
   "el vendedor es obligatorio (dueño; y si no es freelance, subId)");

/* 6 · modelo de autoridad: lee el tope y crédito mayor → EN_REVISION */
ok(/from\("parametros_credito"\)[\s\S]{0,80}limite_freelance/.test(web), "lee el tope parametros_credito.limite_freelance");
ok(/const creditoMayor = modalCredito && !vinculado && topeCredito!=null && topeCredito>0 && cupo1w > topeCredito;/.test(web),
   "crédito mayor = cupo por encima del tope");
ok(/const estadoInicial = \(!modalCredito \|\| vinculado\) \? "ACTIVO" : \(creditoMayor \? "EN_REVISION" : "ACTIVO"\);/.test(web),
   "estado inicial: contado/menor → ACTIVO; mayor → EN_REVISION");

/* 7 · GUARDADO · escrituras directas + SOLO se añade modalidad_pago; NO se introduce la RPC */
ok(/modalidad_pago: c\.modalidadPago \|\| null/.test(web), "aFilaSupabase envía modalidad_pago a la fila de clientes");
ok(!/guardar_cliente_atomico/.test(web), "NO se introdujo la RPC guardar_cliente_atomico (se mantiene el guardado directo)");

/* 8 · barra «Listo para facturar» en el resumen */
ok(/Listo para facturar/.test(web), "el resumen muestra la barra «Listo para facturar»");

/* 9 · GESTION_CLIENTE · Bloquear/Desbloquear · Anular · Reactivar (solo freelance) */
ok(/GESTION_CLIENTE/.test(web), "queda el ancla GESTION_CLIENTE");
ok(/rpc\("anular_cliente", \{ p_cli_id:id, p_motivo:motivo\|\|"" \}\)/.test(web), "Anular llama la RPC anular_cliente(p_cli_id,p_motivo)");
ok(/rpc\("reactivar_cliente", \{ p_cli_id:id \}\)/.test(web), "Reactivar llama la RPC reactivar_cliente(p_cli_id)");
ok(/from\("clientes"\)\.update\(\{ bloqueado:true, motivo_bloqueo:motivo\|\|"" \}\)/.test(web), "Bloquear usa el flag bloqueado + motivo_bloqueo existente");
ok(/esFreelance && !soloLectura && \(/.test(web), "las acciones de gestión solo se pintan para el freelance");
ok(/disabled=\{deudaCli>0\}/.test(web) && /Primero debe cancelar su deuda/.test(web),
   "Anular se deshabilita con deuda > 0 y explica que debe cancelar la deuda");

if (m) { console.error(`ALTA-ASISTENTE: ${b} ✓ · ${m} ✗`); process.exit(1); }
console.log(`ALTA-ASISTENTE: ${b} ✓ · 0 ✗`);
