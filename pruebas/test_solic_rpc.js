#!/usr/bin/env node
/* SOLIC_RPC · resolver una solicitud pasa por el RPC, no por UPDATE directo.
   ═══════════════════════════════════════════════════════════════════════
   El hueco: las apps hacían UPDATE directo a la tabla "solicitudes", así que
   cualquier autenticado de la org podía resolver lo que no le tocaba. La base
   tiene responder_solicitud(...) que valida rol y destino. Esta prueba amarra
   que las 3 apps escriban por el RPC y que NO quede ningún UPDATE directo.
   El ruteo especial (anular_pedido → resolver_anulacion_pedido; devolución →
   resolver_devolucion) debe conservarse.
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs");
const R = require("./rutas");

let b = 0, m = 0;
const ok = (c, x) => { if (c) b++; else { m++; console.error("✗ " + x); } };

const APPS = ["freelance-completo", "proveedor-freelance", "sistema-web"];

for (const app of APPS) {
  const src = fs.readFileSync(R.app(app), "utf-8");
  /* 1 · NO queda ningún UPDATE directo a la tabla solicitudes (el hueco) */
  ok(!/from\(["']solicitudes["']\)\s*\.?\s*\n?\s*\.update/.test(src),
    app + " · no queda UPDATE directo a la tabla solicitudes");
  /* 2 · lleva su ancla del cambio */
  ok(/SOLIC_RPC/.test(src), app + " · tiene el ancla SOLIC_RPC");
  /* 3 · ahora resuelve por el RPC responder_solicitud */
  ok(/rpc\(["']responder_solicitud["']/.test(src),
    app + " · resuelve la solicitud por responder_solicitud (RPC)");
}

/* 4 · el ruteo especial se conserva donde debe ── */
const fl  = fs.readFileSync(R.app("freelance-completo"), "utf-8");
const prov = fs.readFileSync(R.app("proveedor-freelance"), "utf-8");
const web = fs.readFileSync(R.app("sistema-web"), "utf-8");

ok(/rpc\(["']resolver_anulacion_pedido["']/.test(fl),
  "freelance · anular_pedido sigue por resolver_anulacion_pedido");
ok(/rpc\(["']resolver_anulacion_pedido["']/.test(web),
  "web · anular_pedido sigue por resolver_anulacion_pedido");
ok(/rpc\(["']resolver_devolucion["']/.test(prov),
  "proveedor · la devolución sigue por resolver_devolucion");

/* 5 · en la web, decidirEnBase rutea por tipo (anular_pedido vs responder_solicitud) */
ok(/tipo === ["']anular_pedido["'][\s\S]{0,220}resolver_anulacion_pedido[\s\S]{0,220}responder_solicitud/.test(web),
  "web · decidirEnBase rutea por tipo: anular_pedido a su RPC, el resto a responder_solicitud");

/* 6 · el .insert de solicitudes en la web se queda (crear no es resolver) */
ok(/from\(["']solicitudes["']\)\.insert/.test(web),
  "web · el alta de solicitudes (insert) sigue existiendo");

if (m) { console.error(`SOLIC-RPC: ${b} ✓ · ${m} ✗`); process.exit(1); }
console.log(`SOLIC-RPC: ${b} ✓ · 0 ✗`);
