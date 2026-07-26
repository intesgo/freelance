/* ═══════════════════════════════════════════════════════════════════════
   EL AVISO CUANDO UNA PILADORA CAMBIA SU COSTO · empujar-avisos v6

   El costo lo pone la piladora desde su app y entra solo, sin que nadie lo
   apruebe. Si el aviso no sale, Richard se entera cuando ya liquidó al
   costo viejo. Por eso esto se prueba contra el ARCHIVO DE VERDAD de la
   función (el .ts que se despliega), no contra una copia:

     · avisa la subida, la bajada y el cambio anunciado para más adelante;
     · nombra la piladora, el producto y la presentación;
     · el costo de contado solo se nombra si de verdad se movió;
     · si la oferta ya no está (una prueba que se deshizo), NO avisa;
     · lo viejo no se avisa: solo los cambios de los últimos 3 días;
     · llega al mando, no a la piladora ni al vendedor;
     · nunca dos veces: el libro `avisos_enviados` manda.

   La función vive en el repo privado. Uso:
     AVISOS_TS=/ruta/empujar-avisos-v8.ts node test_avisos_costo.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");

const RUTA = process.env.AVISOS_TS || "/tmp/freelance_work/Freelance-Sistema/empujar-avisos-v8.ts";
if (!fs.existsSync(RUTA)) { console.log("✗ no está el archivo de la función: " + RUTA); process.exit(1); }

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };

const hoy = new Date().toISOString().slice(0, 10);
const enDias = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const haceDias = (n) => new Date(Date.now() - n * 86400000).toISOString();

/* ── Los teléfonos suscritos: uno por rol, para ver a quién le llega ── */
const TELEFONOS = [
  { sus_id: "S1", endpoint: "tel/richard", p256dh: "a", auth: "b", rol: "freelance", usr_id: "FRL-RR", usuario: "intesgo@gmail.com" },
  { sus_id: "S2", endpoint: "tel/admin", p256dh: "a", auth: "b", rol: "admin", usr_id: "ADM-01", usuario: "admin@ejemplo.com" },
  { sus_id: "S3", endpoint: "tel/piladora", p256dh: "a", auth: "b", rol: "proveedor", usr_id: "PRV-01", usuario: "ros@ejemplo.com" },
  { sus_id: "S4", endpoint: "tel/vendedor", p256dh: "a", auth: "b", rol: "subcomisionista", usr_id: "SC1", usuario: "carlos@ejemplo.com" },
];

/* ── Ofertas vivas. PostgREST devuelve los enganches como objeto anidado:
      ofertas_piladora tiene UNA sola llave a productos y UNA a proveedores,
      así que se llaman por el nombre de la tabla de destino. ── */
const OFERTAS = [
  { oferta_id: "OF-A", presentacion: "Quintal", prov_cod: "ROS",
    productos: { nombre: "Arroz Dallis" }, proveedores: { nombre: "Piladora Santa Rosa" } },
  { oferta_id: "OF-B", presentacion: "Arroba", prov_cod: "AGU",
    productos: { nombre: "Arroz Conejo" }, proveedores: { nombre: "Piladora San Agustín" } },
  { oferta_id: "OF-C", presentacion: "Quintal", prov_cod: "ROS",
    productos: { nombre: "Azúcar Valdez" }, proveedores: { nombre: "Piladora Santa Rosa" } },
  { oferta_id: "OF-D", presentacion: "Quintal", prov_cod: "AGU",
    productos: { nombre: "Maíz Amarillo" }, proveedores: { nombre: "Piladora San Agustín" } },
  { oferta_id: "OF-VIEJA", presentacion: "Quintal", prov_cod: "ROS",
    productos: { nombre: "Arroz de antes" }, proveedores: { nombre: "Piladora Santa Rosa" } },
];

const BITACORA = [
  /* 1 · sube y rige desde hoy; el contado también se movió */
  { codigo: "AU-01", operacion: "CAMBIO_COSTO", registro_id: "OF-A", fecha: haceDias(0),
    valor_anterior: { costo: 38, costo_contado: 37, desde: "2026-07-21" },
    valor_nuevo: { costo: 41, costo_contado: 40, desde: hoy, piladora: "ROS" } },
  /* 2 · anunciado para más adelante */
  { codigo: "AU-02", operacion: "CAMBIO_COSTO", registro_id: "OF-B", fecha: haceDias(0),
    valor_anterior: { costo: 9.5, costo_contado: 9.25, desde: "2026-07-01" },
    valor_nuevo: { costo: 10, costo_contado: 9.75, desde: enDias(5), piladora: "AGU" } },
  /* 3 · baja, y el contado NO se movió */
  { codigo: "AU-03", operacion: "CAMBIO_COSTO", registro_id: "OF-C", fecha: haceDias(1),
    valor_anterior: { costo: 45, costo_contado: 44, desde: "2026-07-10" },
    valor_nuevo: { costo: 43, costo_contado: 44, desde: hoy, piladora: "ROS" } },
  /* 4 · la oferta se deshizo: no queda a quién nombrar */
  { codigo: "AU-04", operacion: "CAMBIO_COSTO", registro_id: "OF-QUE-YA-NO-ESTA", fecha: haceDias(0),
    valor_anterior: { costo: 20, costo_contado: null, desde: "2026-07-01" },
    valor_nuevo: { costo: 22, costo_contado: null, desde: hoy, piladora: "ROS" } },
  /* 5 · de hace un mes: ya pasó, no se avisa */
  { codigo: "AU-05", operacion: "CAMBIO_COSTO", registro_id: "OF-VIEJA", fecha: haceDias(30),
    valor_anterior: { costo: 30, costo_contado: 29, desde: "2026-06-01" },
    valor_nuevo: { costo: 33, costo_contado: 32, desde: "2026-06-20", piladora: "ROS" } },
  /* 6 · otra operación cualquiera: no es cosa de este aviso */
  { codigo: "AU-06", operacion: "BAJA_USUARIO", registro_id: "SC-09", fecha: haceDias(0),
    valor_anterior: {}, valor_nuevo: {} },
];

/* ── Un doble de PostgREST con filtros de verdad: si la función filtra mal,
      aquí se nota. ── */
function baseDeDatos() {
  const datos = {
    secretos: [{ clave: "vapid", valor: { publicKey: "PUB", privateKey: "PRIV" } },
               { clave: "cron", valor: { clave: "LA-CLAVE" } }],
    push_suscripciones: TELEFONOS.map((t) => ({ ...t, activo: true })),
    fallos: [], pedidos: [], solicitudes: [], cartera_cliente: [],
    auditoria: BITACORA.slice(),
    ofertas_piladora: OFERTAS.slice(),
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
        /* `avisos_enviados` tiene la clave como llave primaria: repetirla falla,
           y ese fallo ES el mecanismo que impide avisar dos veces. */
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
  return {
    datos,
    supa: {
      from: (t) => consulta(t),
      rpc: async () => ({ data: "AU-000", error: null }),
      auth: { getUser: async () => ({ data: { user: null } }) },
    },
  };
}

(async () => {
  console.log("═══ Aviso de cambio de costo · " + path.basename(RUTA));

  let esbuild;
  try { esbuild = require("esbuild"); }
  catch (_e) { console.log("✗ falta esbuild (npm i -D esbuild): sin él no se puede leer el .ts"); process.exit(1); }

  /* Se compila el .ts REAL. Los dos paquetes de Deno se cambian por dobles;
     todo lo demás —los filtros, los textos, el orden— es el código que se
     despliega, sin tocar una coma. */
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

  /* Correr la función una vez y devolver lo que salió por el canal push. */
  async function correr(bd) {
    const empujados = [];
    globalThis.__SUPA = bd.supa;
    globalThis.__PUSH = {
      setVapidDetails() {},
      async sendNotification(sub, carga) { empujados.push({ a: sub.endpoint, ...JSON.parse(carga) }); },
    };
    let atender = null;
    globalThis.Deno = {
      env: { get: (k) => (k === "SUPABASE_URL" ? "https://x.supabase.co" : "clave-de-servicio") },
      serve: (h) => { atender = h; },
    };
    const mod = { exports: {} };
    new Function("module", "exports", codigo)(mod, mod.exports);
    if (!atender) throw new Error("la función no se registró con Deno.serve");
    const pedido = {
      method: "POST",
      json: async () => ({ modo: "auto" }),
      headers: { get: (k) => (k === "x-clave" ? "LA-CLAVE" : null) },
    };
    const resp = await atender(pedido);
    return { empujados, cuerpo: await resp.json() };
  }

  const bd = baseDeDatos();
  const r1 = await correr(bd);

  if (r1.cuerpo.error) { console.log("✗ la función devolvió error: " + r1.cuerpo.error); process.exit(1); }

  const soloCostos = r1.empujados.filter((e) => /costo-/.test(String(e.tag || "")));
  const deA = soloCostos.filter((e) => e.tag === "costo-AU-01");
  const deB = soloCostos.filter((e) => e.tag === "costo-AU-02");
  const deC = soloCostos.filter((e) => e.tag === "costo-AU-03");

  comprobar("avisa los 3 cambios que valen, ni uno más", soloCostos.length === 3 * 2);
  comprobar("el que perdió su oferta no se avisa", !soloCostos.some((e) => e.tag === "costo-AU-04"));
  comprobar("un cambio de hace un mes no se avisa", !soloCostos.some((e) => e.tag === "costo-AU-05"));
  comprobar("otra operación de la bitácora no se confunde con un costo",
    !soloCostos.some((e) => e.tag === "costo-AU-06"));

  comprobar("llega al freelance y al administrador, a nadie más",
    soloCostos.every((e) => e.a === "tel/richard" || e.a === "tel/admin"));
  comprobar("NO le llega a la piladora que lo cambió ni al vendedor",
    !soloCostos.some((e) => e.a === "tel/piladora" || e.a === "tel/vendedor"));

  const a = deA[0] || {};
  comprobar("dice qué piladora y que subió", /Piladora Santa Rosa/.test(a.titulo || "") && /subió/.test(a.titulo || ""));
  comprobar("nombra el producto y su presentación", /Arroz Dallis/.test(a.detalle || "") && /Quintal/.test(a.detalle || ""));
  comprobar("muestra el costo de antes y el de ahora", /\$38\.00 → \$41\.00/.test(a.detalle || ""));
  comprobar("dice que rige desde hoy", /Rige desde hoy/.test(a.detalle || ""));
  comprobar("nombra el contado porque también se movió", /contado \$37\.00 → \$40\.00/.test(a.detalle || ""));

  const b = deB[0] || {};
  const [aa, mm] = [enDias(5).slice(8, 10), enDias(5).slice(5, 7)];
  comprobar("el cambio anunciado dice para qué día es, no 'desde hoy'",
    b.detalle && b.detalle.indexOf("Anunciado para el " + aa + "/" + mm) >= 0 && !/Rige desde hoy/.test(b.detalle));
  comprobar("la arroba se nombra como arroba, no como quintal", /Arroba/.test(b.detalle || ""));

  const c = deC[0] || {};
  comprobar("cuando el costo baja, lo dice con esa palabra", /bajó/.test(c.titulo || ""));
  comprobar("si el contado no se movió, no lo menciona: sería ruido", !/contado/.test(c.detalle || ""));
  comprobar("y aun así muestra la baja", /\$45\.00 → \$43\.00/.test(c.detalle || ""));

  comprobar("el resumen cuenta los avisos de costo aparte", r1.cuerpo.detalle && r1.cuerpo.detalle.costos === 6);

  /* ── Segunda corrida, la misma base: el libro no deja repetir ── */
  const r2 = await correr(bd);
  comprobar("a la segunda vuelta no repite ni un aviso",
    r2.empujados.filter((e) => /costo-/.test(String(e.tag || ""))).length === 0);

  console.log("Resultado: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log("✗ " + String((e && e.message) || e).split("\n")[0]); process.exit(1); });
