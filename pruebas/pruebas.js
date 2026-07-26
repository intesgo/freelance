#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   TODAS LAS PRUEBAS, DE UN SOLO GOLPE

   Antes había que acordarse de cada arnés y correrlo a mano, uno por uno. Eso
   se olvida justo el día que importa. Esto los corre todos, en orden, y al
   final dice en una línea si se puede publicar o no.

       node pruebas.js                 → todo
       node pruebas.js rapido          → sin el visor de pantallas (sin navegador)
       node pruebas.js Comisionista    → solo lo que toca esa app

   Sale con código 1 si algo falla, para que un robot de publicación pueda
   frenar antes de sacar una app rota a la calle.
   ═══════════════════════════════════════════════════════════════════════════ */
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");

const AQUI  = __dirname;
const APPS  = process.env.FREELANCE_APPS || path.join(AQUI, "..");   /* el repo de las apps */
const filtro = (process.argv[2] || "").trim();
const rapido = /^rapido$/i.test(filtro);
const soloApp = rapido ? "" : filtro;

const LAS_APPS = ["freelance-completo", "Comisionista", "socio-comercial",
                  "proveedor-freelance", "transportista-app"];
const DEL_EQUIPO = ["Comisionista", "socio-comercial"];

/* Cada prueba: qué mide, con qué archivo y sobre qué apps.
   `navegador:true` = necesita Chromium; se salta con "rapido". */
const PLAN = [
  { arnes:"ARNES_GLOBALES.js",       que:"nombres sueltos que revientan la app", apps:LAS_APPS },
  { arnes:"test_puerta.js",          que:"la puerta: sin sesión no se entra",    apps:LAS_APPS,
    salvo:{ "freelance-completo": "por decisión de Richard conserva su propio ingreso con correo y clave real, como respaldo del portal" } },
  { arnes:"test_no_se_cae.js",       que:"la app no se queda en blanco",         apps:LAS_APPS },
  { arnes:"test_barra_leer.js",      que:"la barra se esconde al leer",          apps:LAS_APPS,
    salvo:{ "transportista-app": "no tiene barra inferior: no hay nada que esconder" } },
  { arnes:"test_barra_conectada.js", que:"la barra lee del sistema",             apps:["freelance-completo"] },
  { arnes:"test_barra_equipo.js",    que:"la barra del equipo con datos reales", apps:DEL_EQUIPO },
  { arnes:"test_barra_prov.js",      que:"la barra de la piladora",              apps:["proveedor-freelance"] },
  { arnes:"test_costo_piladora.js", que:"la piladora cambia su costo con fecha", apps:["proveedor-freelance"] },
  { arnes:"test_pedido_real.js",     que:"el pedido del vendedor llega a la base", apps:["Comisionista"] },
  { arnes:"test_aprobar_pedido.js",  que:"cómo le pagas a la piladora al aprobar", apps:["freelance-completo"] },
  { arnes:"test_despacho_parcial.js", que:"cuando el pedido sale corto",           apps:[null] },
  { arnes:"test_comision_piladora.js", que:"lo que le facturas a cada piladora",   apps:["freelance-completo"] },
  { arnes:"test_cotizacion.js",      que:"la cotización",                        apps:["Comisionista","socio-comercial","freelance-completo"] },
  { arnes:"test_padron_fc.js",       que:"sin ficha en el padrón no se entra",   apps:[null] },
  { arnes:"test_asistente_cartera.js", que:"el asistente no inventa números",    apps:[null] },
  /* este mira el sistema web, que vive en el repo privado: solo corre si se le dice dónde */
  { arnes:"test_cuentas.js",         que:"las cuentas del equipo",               apps:[null], soloSi:"SISTEMA_WEB" },
  /* la función de avisos también vive en el repo privado */
  { arnes:"test_avisos_costo.js",    que:"el aviso cuando cambia un costo",      apps:[null], soloSi:"AVISOS_TS" },
  { arnes:"test_avisos_pedido_piladora.js", que:"la piladora se entera del pedido", apps:[null], soloSi:"AVISOS_TS" },
  { arnes:"test_invitacion.js",      que:"el enlace de invitación",              apps:[null], navegador:true },
  { arnes:"ver_pantallas.js",        que:"cómo SE VE cada pantalla",             apps:LAS_APPS, navegador:true, visor:true },
];

const verde = (t)=>"\x1b[32m"+t+"\x1b[0m", rojo=(t)=>"\x1b[31m"+t+"\x1b[0m", gris=(t)=>"\x1b[90m"+t+"\x1b[0m";

let bien = 0, mal = 0, saltadas = 0, exentos = 0;
const fallos = [];

function correr(arnes, app, visor) {
  const ruta = path.join(AQUI, arnes);
  if (!fs.existsSync(ruta)) { saltadas++; console.log(gris("  · " + arnes + ": no está en esta carpeta")); return; }
  const args = [ruta];
  const LOCAL = process.env.FREELANCE_LOCAL || "/tmp/local";   /* copias con el doble, solo para el visor */
  if (app) args.push(visor ? ("file://" + path.join(LOCAL, app + ".html")) : path.join(APPS, app + ".html"));
  if (visor) args.push("/tmp/capturas");
  const etiqueta = arnes.replace(/\.js$/,"") + (app ? " · " + app : "");
  try {
    const salida = execFileSync("node", args, { encoding:"utf-8", stdio:["ignore","pipe","pipe"], timeout: 180000 });
    const ultima = salida.trim().split("\n").filter(Boolean).pop() || "";
    bien++; console.log(verde("  ✓ ") + etiqueta + gris("  " + ultima.slice(0,60)));
  } catch (e) {
    mal++;
    const salida = String((e.stdout||"") + (e.stderr||"")).trim().split("\n");
    const detalle = salida.filter(l=>/✗/.test(l)).slice(0,4).join("\n     ") || salida.slice(-2).join(" ");
    fallos.push({ etiqueta, detalle });
    console.log(rojo("  ✗ ") + etiqueta + "\n     " + detalle);
  }
}

console.log("\n═══ PRUEBAS DE FREELANCE" + (soloApp ? " · solo " + soloApp : "") + (rapido ? " · sin navegador" : ""));
for (const p of PLAN) {
  if (rapido && p.navegador) continue;
  if (p.soloSi && !process.env[p.soloSi]) { console.log(gris("\n" + p.que + "\n  (·) no corre aquí: falta " + p.soloSi + " (vive en el repo privado)")); continue; }
  let apps = soloApp ? p.apps.filter(a => a === soloApp) : p.apps;
  const exentas = apps.filter(a => p.salvo && p.salvo[a]);
  apps = apps.filter(a => !(p.salvo && p.salvo[a]));
  if (!apps.length && !exentas.length) continue;
  console.log("\n" + p.que);
  for (const a of apps) correr(p.arnes, a, p.visor);
  /* Nunca en silencio: si una app queda fuera, se dice y se dice por qué. */
  for (const a of exentas) { exentos++; console.log(gris("  (·) " + a + " queda fuera: " + p.salvo[a])); }
}

console.log("\n" + "─".repeat(58));
if (mal === 0) {
  console.log(verde("TODO BIEN") + " · " + bien + " pruebas pasaron"
    + (exentos ? gris(" · " + exentos + " exenta(s) con motivo") : "")
    + (saltadas ? gris(" · " + saltadas + " no estaban") : ""));
  console.log("Se puede publicar.\n");
} else {
  console.log(rojo("NO PUBLIQUES") + " · " + mal + " prueba(s) fallaron de " + (bien + mal));
  fallos.forEach(f => console.log("  ✗ " + f.etiqueta));
  console.log("");
}
process.exit(mal ? 1 : 0);
