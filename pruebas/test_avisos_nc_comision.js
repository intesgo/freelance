/* ═══════════════════════════════════════════════════════════════════════
   AVISOS DE PLATA QUE CAMBIA · empujar-avisos v8

   Dos cosas que no pueden pasar desapercibidas:

   1) Una **nota de crédito esperando el visto bueno de Richard**. Mientras
      no la resuelva hay plata en el aire: ni el vendedor sabe cuánto va a
      cobrar ni la piladora si se la aceptaron. No es cortesía, es un tapón.
   2) La **comisión de un vendedor que se reajustó** —salió corto el
      despacho o entró una devolución—. Que se entere ahora y por el
      sistema, no el día del pago y por sorpresa. Le llega A ÉL; si no
      tiene teléfono, al mando para que se lo diga antes de pagarle.

   Contra el archivo real de la función:
     · la NC pendiente llega al mando, con cliente, producto, monto y quién
       la pidió; una ya resuelta o de práctica no se avisa;
     · el reajuste le llega al VENDEDOR, no al mando, con el antes y el
       después; si no tiene teléfono cae en el respaldo y lo explica;
     · un reajuste de una comisión de práctica no se avisa;
     · lo viejo no se reavisa, y nunca dos veces.

   Uso: AVISOS_TS=/ruta/empujar-avisos-v8.ts node test_avisos_nc_comision.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");

const RUTA = process.env.AVISOS_TS || "/tmp/freelance_work/Freelance-Sistema/empujar-avisos-v8.ts";
if (!fs.existsSync(RUTA)) { console.log("✗ no está el archivo de la función: " + RUTA); process.exit(1); }

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };
const haceDias = (n) => new Date(Date.now() - n * 86400000).toISOString();

const TELEFONOS = [
  { sus_id: "S1", endpoint: "tel/richard", p256dh: "a", auth: "b", rol: "freelance", usr_id: "FRL-RR", usuario: "intesgo@gmail.com" },
  { sus_id: "S2", endpoint: "tel/carlos", p256dh: "a", auth: "b", rol: "subcomisionista", usr_id: "SC1", usuario: "carlos@ejemplo.com" },
];

const NCS = [
  { nc_id: "NC-1", ped_id: "PD-0020", qq: 10, valor: 480, motivo: "Humedad",
    origen: "vendedor", estado: "pendiente", es_demo: false, creado: haceDias(0),
    pedido_items: { descripcion: "Arrox Extra Lira" },
    pedidos: { clientes: { nombre: "Comercial Nilo" } } },
  /* ya resuelta: no se avisa */
  { nc_id: "NC-2", ped_id: "PD-0021", qq: 5, valor: 240, motivo: "x",
    origen: "socio", estado: "aprobada", es_demo: false, creado: haceDias(0),
    pedido_items: { descripcion: "Arrocillo" }, pedidos: { clientes: { nombre: "Don Pepe" } } },
  /* de práctica: tampoco */
  { nc_id: "NC-3", ped_id: "PD-0022", qq: 5, valor: 240, motivo: "x",
    origen: "vendedor", estado: "pendiente", es_demo: true, creado: haceDias(0),
    pedido_items: { descripcion: "x" }, pedidos: { clientes: { nombre: "Práctica" } } },
];

const COMIS = [
  { com_id: "CO-1", ped_id: "PD-0020", sub_id: "SC1", monto: 180, es_demo: false },
  { com_id: "CO-2", ped_id: "PD-0030", sub_id: "SC9", monto: 90, es_demo: false },   /* SC9 sin teléfono */
  { com_id: "CO-3", ped_id: "PD-0040", sub_id: "SC1", monto: 50, es_demo: true },    /* práctica */
];

const BITACORA = [
  { codigo: "AU-20", operacion: "REAJUSTAR_COMISION", registro_id: "CO-1", fecha: haceDias(0),
    valor_anterior: { monto: 200 }, valor_nuevo: { monto: 180 } },
  { codigo: "AU-21", operacion: "REAJUSTAR_COMISION", registro_id: "CO-2", fecha: haceDias(1),
    valor_anterior: { monto: 120 }, valor_nuevo: { monto: 90 } },
  { codigo: "AU-22", operacion: "REAJUSTAR_COMISION", registro_id: "CO-3", fecha: haceDias(0),
    valor_anterior: { monto: 60 }, valor_nuevo: { monto: 50 } },
  { codigo: "AU-23", operacion: "REAJUSTAR_COMISION", registro_id: "CO-1", fecha: haceDias(30),
    valor_anterior: { monto: 999 }, valor_nuevo: { monto: 1 } },
  { codigo: "AU-24", operacion: "APROBAR_PEDIDO", registro_id: "PD-0099", fecha: haceDias(0),
    valor_anterior: {}, valor_nuevo: {} },
];

function baseDeDatos() {
  const datos = {
    secretos: [{ clave: "vapid", valor: { publicKey: "PUB", privateKey: "PRIV" } },
               { clave: "cron", valor: { clave: "LA-CLAVE" } }],
    push_suscripciones: TELEFONOS.map((t) => ({ ...t, activo: true })),
    usuarios: [], fallos: [], solicitudes: [], cartera_cliente: [],
    ofertas_piladora: [], pedidos: [],
    notas_credito: NCS.slice(), comisiones: COMIS.slice(),
    auditoria: BITACORA.slice(), avisos_enviados: [],
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
  console.log("═══ Avisos de plata que cambia · " + path.basename(RUTA));

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

  /* ── la nota de crédito pendiente ── */
  const nc = r1.empujados.filter((e) => /^nc-/.test(String(e.tag || "")));
  comprobar("solo se avisa la nota de crédito PENDIENTE", nc.length === 1 && nc[0].tag === "nc-NC-1");
  comprobar("una ya resuelta no se avisa", !nc.some((e) => e.tag === "nc-NC-2"));
  comprobar("una de práctica tampoco", !nc.some((e) => e.tag === "nc-NC-3"));
  comprobar("le llega al mando", nc[0] && nc[0].a === "tel/richard");
  comprobar("dice el cliente, los quintales y el producto",
    /Comercial Nilo/.test(nc[0] ? nc[0].detalle : "") && /10 qq/.test(nc[0] ? nc[0].detalle : "") &&
    /Arrox Extra Lira/.test(nc[0] ? nc[0].detalle : ""));
  comprobar("y sobre todo QUIÉN la pidió y qué implica",
    /La pidió el vendedor/.test(nc[0] ? nc[0].detalle : "") && /baja comisiones/.test(nc[0] ? nc[0].detalle : ""));
  comprobar("y lo lleva a la pantalla donde se resuelve", nc[0] && nc[0].destino === "notascredito");

  /* ── la comisión reajustada ── */
  const co = r1.empujados.filter((e) => /^comision-/.test(String(e.tag || "")));
  comprobar("se avisan los dos reajustes que valen, no el viejo ni el de práctica",
    co.length === 2 && !co.some((e) => e.tag === "comision-CO-3"));
  const suyo = co.find((e) => e.tag === "comision-CO-1") || {};
  comprobar("el del vendedor con teléfono le llega A ÉL, no al mando", suyo.a === "tel/carlos");
  comprobar("con el antes y el después", /\$200\.00 → \$180\.00/.test(suyo.detalle || ""));
  comprobar("y le dice por qué pudo pasar",
    /Salió menos de lo pedido o hubo una devolución/.test(suyo.detalle || ""));
  comprobar("el título dice de qué pedido es", /PD-0020/.test(suyo.titulo || ""));

  const sinTel = co.find((e) => e.tag === "comision-CO-2") || {};
  comprobar("si el vendedor no tiene teléfono, el aviso NO se tira: va al mando",
    sinTel.a === "tel/richard");
  comprobar("y le dice a Richard que se lo cuente antes de pagarle",
    /cuéntaselo antes de pagarle/.test(sinTel.detalle || ""));

  comprobar("no confunde otra operación de la bitácora con un reajuste",
    !co.some((e) => /PD-0099/.test(String(e.titulo || ""))));
  comprobar("el resumen cuenta las dos cosas aparte",
    r1.cuerpo.detalle && r1.cuerpo.detalle.notas_credito === 1 && r1.cuerpo.detalle.comisiones === 2);

  /* ── segunda vuelta ── */
  const r2 = await correr(bd);
  comprobar("a la segunda vuelta no repite ni un aviso",
    r2.empujados.filter((e) => /^nc-|^comision-/.test(String(e.tag || ""))).length === 0);

  console.log("Resultado: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log("✗ " + String((e && e.message) || e).split("\n")[0]); process.exit(1); });
