#!/usr/bin/env node
/* MARCA_EXCLUSIVA_CLIENTE · una marca propia de un cliente solo se ofrece a ESE cliente al
   tomar pedido. La regla vive igual en las tres apps que arman pedido. Este arnés vigila:
   1) las TRES apps declaran EXCLUSIVA_DE, marcaVisibleParaCli y el ancla.
   2) las TRES cuelan marcaVisibleParaCli dentro del filtro de productosDelProv, sobre p.prodId
      (NO p.id, que es producto+presentación) y con el cliente elegido (CLI_ID_DE por nombre).
   3) la lógica EN SÍ, extraída del fuente y corrida de verdad: sin dueños → visible; con
      dueños y el cliente que sí está → visible; con dueños y otro cliente → oculto; con dueños
      y SIN cliente elegido → oculto. Un mutante (dejar pasar todo) DEBE romper la prueba.
   4) ninguna app del vendedor ESCRIBE en marca_clientes: solo .select (la RLS ya lo impone,
      pero que nadie meta un insert/update/delete por descuido). */
const fs = require("fs"), path = require("path"), vm = require("vm");
const raiz = path.join(__dirname, "..");
const APPS = ["Comisionista.html", "socio-comercial.html", "freelance-completo.html"];
let b = 0, m = 0;
const ok = (c, x) => { if (c) b++; else { m++; console.error("✗ " + x); } };

const fuentes = {};
APPS.forEach(a => fuentes[a] = fs.readFileSync(path.join(raiz, a), "utf8"));

/* ── 1) anclas y declaraciones en las TRES apps ── */
APPS.forEach(a => {
  const s = fuentes[a];
  ok(/MARCA_EXCLUSIVA_CLIENTE/.test(s), a + ": tiene el ancla MARCA_EXCLUSIVA_CLIENTE");
  ok(/const EXCLUSIVA_DE = \{\};/.test(s), a + ": declara EXCLUSIVA_DE");
  ok(/const marcaVisibleParaCli = \(prodId, cliId\) =>/.test(s), a + ": declara marcaVisibleParaCli");
  ok(/from\("marca_clientes"\)\.select\("prod_id,cli_id"\)/.test(s), a + ": carga marca_clientes con .select");
});

/* ── 2) el filtro cuela por cliente, sobre p.prodId ── */
APPS.forEach(a => {
  const s = fuentes[a];
  ok(/marcaVisibleParaCli\(p\.prodId, cliIdPed\)/.test(s), a + ": productosDelProv cuela por marcaVisibleParaCli(p.prodId, cliIdPed)");
  ok(/const cliIdPed = CLI_ID_DE\[\(cli && cli\.nombre\) \|\| cli\]/.test(s), a + ": el id del cliente sale de CLI_ID_DE por nombre");
  ok(!/marcaVisibleParaCli\(p\.id,/.test(s), a + ": NO usa p.id (producto+presentación) en el filtro");
});

/* ── 2-web) el Sistema Web (Pedidos) también cuela por el cliente elegido ──
   Mismo criterio que el móvil, pero el id del cliente sale de `cli.id` (no de un
   mapa por nombre). El Sistema Web SÍ escribe marca_clientes (pantalla Marcas), así
   que el chequeo de «solo lee» NO aplica aquí. */
const WEB = "sistema-web.html";
const sWeb = fs.readFileSync(path.join(raiz, WEB), "utf8");
ok(/MARCA_EXCLUSIVA_WEB/.test(sWeb), WEB + ": tiene el ancla MARCA_EXCLUSIVA_WEB");
ok(/const EXCLUSIVA_DE = \{\};/.test(sWeb), WEB + ": declara EXCLUSIVA_DE");
ok(/const marcaVisibleParaCli = \(prodId, cliId\) =>/.test(sWeb), WEB + ": declara marcaVisibleParaCli");
ok(/from\("marca_clientes"\)\.select\("prod_id,cli_id"\)/.test(sWeb), WEB + ": carga marca_clientes con .select");
ok(/marcaVisibleParaCli\(p\.prodId, cli && cli\.id\)/.test(sWeb), WEB + ": Pedidos cuela por marcaVisibleParaCli(p.prodId, cli && cli.id)");
ok(!/marcaVisibleParaCli\(p\.id,/.test(sWeb), WEB + ": NO usa p.id (producto+presentación) en el filtro");
/* la lógica del Sistema Web, extraída y corrida igual que la del móvil (con mutante) */
const rWeb = correrLogica(sWeb, false);
ok(rWeb && rWeb.sinDuenos === true && rWeb.duenoPresente === true && rWeb.duenoAusente === false
   && rWeb.sinCliente === false && rWeb.libreSinCliente === true,
   WEB + ": la lógica de marcaVisibleParaCli se comporta igual que el móvil");
const mWeb = correrLogica(sWeb, true);
ok(mWeb && mWeb !== "sin-mutar" && mWeb.duenoAusente === true && mWeb.sinCliente === true,
   WEB + ": MUTANTE · si dejara pasar todo, las exclusivas dejarían de esconderse");

/* ── 3) la lógica extraída y corrida de verdad (con mutante) ── */
function correrLogica(fuente, mutar) {
  /* toma el bloque EXCLUSIVA_DE + marcaVisibleParaCli tal cual está en la app */
  const bloque = fuente.match(/const EXCLUSIVA_DE = \{\};\s*const marcaVisibleParaCli = \(prodId, cliId\) => \{[\s\S]*?\n\};/);
  if (!bloque) return null;
  let codigo = bloque[0];
  if (mutar) {
    /* MUTANTE · dejar pasar todo (ignora los dueños): las marcas exclusivas dejarían de
       esconderse. La prueba de abajo TIENE que caerse cuando esto pasa. */
    codigo = codigo.replace("return !!cliId && duenos.has(cliId);", "return true;");
    if (codigo === bloque[0]) return "sin-mutar";   /* no encontró el trozo: el mutante no aplicó */
  }
  const ctx = { salida: {} };
  vm.createContext(ctx);
  vm.runInContext(codigo + "\n salida.EXCLUSIVA_DE = EXCLUSIVA_DE; salida.f = marcaVisibleParaCli;", ctx);
  const EX = ctx.salida.EXCLUSIVA_DE, f = ctx.salida.f;
  EX["P-EXCL"] = new Set(["C-DUENO"]);   /* una marca de un solo cliente */
  return {
    sinDuenos:      f("P-LIBRE", "C-CUALQUIERA"),   /* sin dueños → visible */
    duenoPresente:  f("P-EXCL", "C-DUENO"),         /* el cliente dueño → visible */
    duenoAusente:   f("P-EXCL", "C-OTRO"),          /* otro cliente → oculto */
    sinCliente:     f("P-EXCL", null),              /* sin cliente elegido → oculto */
    libreSinCliente:f("P-LIBRE", null),             /* marca normal sin cliente → visible */
  };
}

const r = correrLogica(fuentes["freelance-completo.html"], false);
ok(r && r.sinDuenos === true,       "lógica · sin dueños: la marca se ve para cualquiera");
ok(r && r.duenoPresente === true,   "lógica · con dueños y el cliente dueño: se ve");
ok(r && r.duenoAusente === false,   "lógica · con dueños y otro cliente: se oculta");
ok(r && r.sinCliente === false,     "lógica · con dueños y sin cliente elegido: se oculta");
ok(r && r.libreSinCliente === true, "lógica · marca normal sin cliente: se ve (no la esconde)");

/* el mutante: dejar pasar todo debe cambiar los dos casos «oculto» a visible */
const mut = correrLogica(fuentes["freelance-completo.html"], true);
ok(mut && mut !== "sin-mutar" && mut.duenoAusente === true && mut.sinCliente === true,
  "MUTANTE · si marcaVisibleParaCli dejara pasar todo, las exclusivas dejarían de esconderse (la prueba lo detecta)");

/* ── 4) el vendedor solo LEE marca_clientes ── */
APPS.forEach(a => {
  const s = fuentes[a];
  const escribe = /from\("marca_clientes"\)\s*\.\s*(insert|update|delete)\(/.test(s)
    || /from\("marca_clientes"\)\.(insert|update|delete)\(/.test(s);
  ok(!escribe, a + ": NO escribe en marca_clientes (solo .select)");
});

if (m) { console.error(`MARCA-EXCLUSIVA: ${b} ✓ · ${m} ✗`); process.exit(1); }
console.log(`MARCA-EXCLUSIVA: ${b} ✓ · 0 ✗`);
