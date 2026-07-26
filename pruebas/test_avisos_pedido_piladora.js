/* ═══════════════════════════════════════════════════════════════════════
   CUANDO EL PEDIDO SALE, LA PILADORA SE ENTERA · empujar-avisos v7

   Hasta ahora Richard aprobaba un pedido y la piladora se enteraba solo si le
   daba por abrir la app. Si no lo abría, el pedido se quedaba quieto y nadie
   sabía por qué. Aquí se comprueba, contra el ARCHIVO DE VERDAD de la función:

     · el aviso le llega a SU piladora y a ninguna otra;
     · dice el cliente, los quintales y CÓMO LE PAGAN (contado o crédito),
       que es lo que ella necesita para facturar;
     · si esa piladora no tiene teléfono avisado, el aviso NO se tira: se le
       manda al mando diciendo que hay que llamarla;
     · un pedido de práctica o uno anulado no se avisan;
     · el momento sale de la bitácora, no de `creado`: un pedido tomado hace
       una semana y aprobado hoy también se avisa;
     · nunca dos veces.

   Uso: AVISOS_TS=/ruta/empujar-avisos-v7.ts node test_avisos_pedido_piladora.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");

const RUTA = process.env.AVISOS_TS || "/tmp/freelance_work/Freelance-Sistema/empujar-avisos-v7.ts";
if (!fs.existsSync(RUTA)) { console.log("✗ no está el archivo de la función: " + RUTA); process.exit(1); }

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };
const haceDias = (n) => new Date(Date.now() - n * 86400000).toISOString();

/* Teléfonos: Richard, la piladora San Agustín y la piladora Santa Rosa.
   Santa Rosa aparece en el padrón pero SIN teléfono suscrito, a propósito. */
const TELEFONOS = [
  { sus_id: "S1", endpoint: "tel/richard", p256dh: "a", auth: "b", rol: "freelance", usr_id: "FRL-RR", usuario: "intesgo@gmail.com" },
  { sus_id: "S2", endpoint: "tel/agustin", p256dh: "a", auth: "b", rol: "proveedor", usr_id: "PRV-AGU", usuario: "agu@ejemplo.com" },
  { sus_id: "S3", endpoint: "tel/vendedor", p256dh: "a", auth: "b", rol: "subcomisionista", usr_id: "SC1", usuario: "carlos@ejemplo.com" },
];

const PADRON = [
  { usr_id: "PRV-AGU", prov_cod: "AGU", rol: "proveedor", activo: true },
  { usr_id: "PRV-ROS", prov_cod: "ROS", rol: "proveedor", activo: true },
  { usr_id: "FRL-RR", prov_cod: null, rol: "freelance", activo: true },
];

const PEDIDOS = [
  { ped_id: "PD-0020", prov_cod: "AGU", estado: "enviado_proveedor", pago_prov: "contado", es_demo: false,
    clientes: { nombre: "Comercial Nilo" },
    pedido_items: [{ cantidad_qq: 60, descripcion: "Arrox Extra Lira · Quintal" }, { cantidad_qq: 20, descripcion: "Arrocillo Fino · Quintal" }] },
  { ped_id: "PD-0021", prov_cod: "ROS", estado: "enviado_proveedor", pago_prov: "credito", es_demo: false,
    clientes: { nombre: "Abarrotes Don Pepe" },
    pedido_items: [{ cantidad_qq: 40, descripcion: "Arroz Dallis · Quintal" }] },
  { ped_id: "PD-0022", prov_cod: "AGU", estado: "enviado_proveedor", pago_prov: "contado", es_demo: true,
    clientes: { nombre: "Cliente de práctica" }, pedido_items: [{ cantidad_qq: 5, descripcion: "x" }] },
  { ped_id: "PD-0023", prov_cod: "AGU", estado: "anulado", pago_prov: "contado", es_demo: false,
    clientes: { nombre: "Se cayó el trato" }, pedido_items: [{ cantidad_qq: 10, descripcion: "x" }] },
];

const BITACORA = [
  /* tomado hace una semana, aprobado HOY: el momento sale de aquí, no de `creado` */
  { codigo: "AU-10", operacion: "APROBAR_PEDIDO", registro_id: "PD-0020", fecha: haceDias(0) },
  { codigo: "AU-11", operacion: "APROBAR_PEDIDO", registro_id: "PD-0021", fecha: haceDias(1) },
  { codigo: "AU-12", operacion: "APROBAR_PEDIDO", registro_id: "PD-0022", fecha: haceDias(0) },
  { codigo: "AU-13", operacion: "APROBAR_PEDIDO", registro_id: "PD-0023", fecha: haceDias(0) },
  { codigo: "AU-14", operacion: "APROBAR_PEDIDO", registro_id: "PD-VIEJO", fecha: haceDias(30) },
  { codigo: "AU-15", operacion: "CAMBIO_COSTO", registro_id: "OF-X", fecha: haceDias(0),
    valor_anterior: {}, valor_nuevo: {} },
];

function baseDeDatos() {
  const datos = {
    secretos: [{ clave: "vapid", valor: { publicKey: "PUB", privateKey: "PRIV" } },
               { clave: "cron", valor: { clave: "LA-CLAVE" } }],
    push_suscripciones: TELEFONOS.map((t) => ({ ...t, activo: true })),
    usuarios: PADRON.slice(),
    fallos: [], solicitudes: [], cartera_cliente: [], ofertas_piladora: [],
    pedidos: PEDIDOS.slice(),
    auditoria: BITACORA.slice(),
    avisos_enviados: [],
  };
  const consulta = (nombre) => {
    const cond = []; let tope = 0;
    const filas = () => {
      let r = (datos[nombre] || []).filter((f) => cond.every(([t, c, v]) =>
        t === "eq" ? String(f[c]) === String(v)
        : t === "neq" ? String(f[c]) !== String(v)
        : t === "gte" ? String(f[c]) >= String(v)
        : t === "lte" ? String(f[c]) <= String(v)
        : t === "in" ? v.map(String).includes(String(f[c])) : true));
      if (tope) r = r.slice(0, tope);
      return r;
    };
    const b = {
      select() { return b; }, order() { return b; }, is() { return b; }, not() { return b; },
      limit(n) { tope = n; return b; },
      eq(c, v) { cond.push(["eq", c, v]); return b; },
      neq(c, v) { cond.push(["neq", c, v]); return b; },
      gte(c, v) { cond.push(["gte", c, v]); return b; },
      lte(c, v) { cond.push(["lte", c, v]); return b; },
      in(c, v) { cond.push(["in", c, v]); return b; },
      maybeSingle() { return Promise.resolve({ data: filas()[0] || null, error: null }); },
      single() { return b.maybeSingle(); },
      insert(f) {
        datos[nombre] = datos[nombre] || [];
        if (nombre === "avisos_enviados" && datos[nombre].some((x) => x.clave === f.clave))
          return Promise.resolve({ error: { message: "duplicate key value" } });
        datos[nombre].push(f);
        return Promise.resolve({ error: null });
      },
      update() { const p = Promise.resolve({ error: null }); p.eq = () => p; return p; },
      then(res, rej) { return Promise.resolve({ data: filas(), error: null }).then(res, rej); },
    };
    return b;
  };
  return { datos, supa: { from: (t) => consulta(t), rpc: async () => ({ data: null, error: null }),
                          auth: { getUser: async () => ({ data: { user: null } }) } } };
}

(async () => {
  console.log("═══ La piladora se entera del pedido · " + path.basename(RUTA));

  let esbuild;
  try { esbuild = require("esbuild"); }
  catch (_e) { console.log("✗ falta esbuild (npm i -D esbuild)"); process.exit(1); }

  const dobles = {
    "npm:@supabase/supabase-js@2": "export const createClient = () => globalThis.__SUPA;",
    "npm:web-push@3.6.7": "export default globalThis.__PUSH;",
  };
  const armado = await esbuild.build({
    entryPoints: [RUTA], bundle: true, write: false, format: "cjs", target: "es2022", platform: "neutral",
    plugins: [{
      name: "dobles", setup(c) {
        c.onResolve({ filter: /^npm:/ }, (a) => ({ path: a.path, namespace: "doble" }));
        c.onLoad({ filter: /.*/, namespace: "doble" }, (a) => ({ contents: dobles[a.path] || "export default {};", loader: "js" }));
      },
    }],
  });
  const codigo = armado.outputFiles[0].text;

  async function correr(bd) {
    const empujados = [];
    globalThis.__SUPA = bd.supa;
    globalThis.__PUSH = {
      setVapidDetails() {},
      async sendNotification(sub, carga) { empujados.push({ a: sub.endpoint, ...JSON.parse(carga) }); },
    };
    let atender = null;
    globalThis.Deno = {
      env: { get: (k) => (k === "SUPABASE_URL" ? "https://x.supabase.co" : "clave") },
      serve: (h) => { atender = h; },
    };
    const mod = { exports: {} };
    new Function("module", "exports", codigo)(mod, mod.exports);
    if (!atender) throw new Error("la función no se registró con Deno.serve");
    const resp = await atender({
      method: "POST", json: async () => ({ modo: "auto" }),
      headers: { get: (k) => (k === "x-clave" ? "LA-CLAVE" : null) },
    });
    return { empujados, cuerpo: await resp.json() };
  }

  const bd = baseDeDatos();
  const r1 = await correr(bd);
  if (r1.cuerpo.error) { console.log("✗ la función devolvió error: " + r1.cuerpo.error); process.exit(1); }

  const salidos = r1.empujados.filter((e) => /aprobado-/.test(String(e.tag || "")));
  const a20 = salidos.filter((e) => e.tag === "aprobado-PD-0020");
  const a21 = salidos.filter((e) => e.tag === "aprobado-PD-0021");

  comprobar("un pedido de práctica no se avisa", !salidos.some((e) => e.tag === "aprobado-PD-0022"));
  comprobar("un pedido anulado tampoco", !salidos.some((e) => e.tag === "aprobado-PD-0023"));
  comprobar("una aprobación de hace un mes no se reavisa", !salidos.some((e) => e.tag === "aprobado-PD-VIEJO"));
  comprobar("no confunde otra operación de la bitácora con un pedido",
    !salidos.some((e) => /OF-X/.test(String(e.tag || ""))));

  /* ── el que sí tiene teléfono ── */
  comprobar("el aviso le llega a SU piladora", a20.length === 1 && a20[0].a === "tel/agustin");
  comprobar("y a nadie más: ni a la otra piladora ni al vendedor",
    !a20.some((e) => e.a === "tel/vendedor") && !salidos.some((e) => e.tag === "aprobado-PD-0020" && e.a === "tel/richard"));
  comprobar("dice el número del pedido", /PD-0020/.test(a20[0] ? a20[0].titulo : ""));
  comprobar("dice el cliente y los quintales", /Comercial Nilo/.test(a20[0] ? a20[0].detalle : "") && /80 qq/.test(a20[0] ? a20[0].detalle : ""));
  comprobar("suma los quintales de TODOS los productos, no solo el primero",
    /80 qq/.test(a20[0] ? a20[0].detalle : "") && /y 1 más/.test(a20[0] ? a20[0].detalle : ""));
  comprobar("y le dice cómo le pagan: de contado", /te pagan de contado/.test(a20[0] ? a20[0].detalle : ""));
  comprobar("la lleva a facturar, que es lo que tiene que hacer", a20[0] && a20[0].destino === "facturar");

  /* ── la piladora sin teléfono: el aviso no se pierde ── */
  comprobar("si la piladora no tiene teléfono, el aviso va al mando",
    a21.length === 1 && a21[0].a === "tel/richard");
  comprobar("y dice claramente que toca llamarla",
    /no tiene teléfono avisado/.test(a21[0] ? a21[0].detalle : "") && /ROS/.test(a21[0] ? a21[0].detalle : ""));
  comprobar("ese aviso NO le llega a la piladora equivocada",
    !a21.some((e) => e.a === "tel/agustin"));

  comprobar("el resumen cuenta los pedidos que salieron aparte",
    r1.cuerpo.detalle && r1.cuerpo.detalle.aprobados === 2);

  /* ── segunda vuelta ── */
  const r2 = await correr(bd);
  comprobar("a la segunda vuelta no repite ni un aviso",
    r2.empujados.filter((e) => /aprobado-/.test(String(e.tag || ""))).length === 0);

  console.log("Resultado: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log("✗ " + String((e && e.message) || e).split("\n")[0]); process.exit(1); });
