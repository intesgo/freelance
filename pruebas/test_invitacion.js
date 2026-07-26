/* ═══════════════════════════════════════════════════════════════════════
   PRUEBA DEL PORTAL · qué pasa cuando alguien abre el enlace que le mandamos.

   Se corre en un navegador de verdad (Chromium, pantalla de celular) porque lo
   que hay que comprobar es una NAVEGACIÓN: que al invitado se lo lleve a su app
   solo DESPUÉS de crear la clave. En jsdom no se puede ver.

   Cuatro aterrizajes, el mismo index.html publicado:
     1) invitación (type=invite): tiene sesión válida, pero NO debe entrar a su
        app sin antes crear su clave. Si entra sin clave, no puede volver nunca.
     2) recuperación (type=recovery): formulario de clave nueva, se queda aquí.
     3) enlace vencido (error=…): aviso claro, no pantalla en blanco.
     4) visita normal con sesión: entra como siempre.

   Uso: node test_invitacion.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), http = require("http"), path = require("path");
const { chromium } = require("playwright");

const RAIZ = require("./rutas").RAIZ;
const PUERTO = 8731;

/* ── Doble de supabase-js: el enlace del correo SÍ deja sesión válida ── */
const DOBLE = `
window.__updates = []; window.__llamadas = [];
window.supabase = { createClient: function(){
  var U = { id:"u9", email:"ana@ejemplo.com" };
  /* Un enlace vencido NO deja sesión: así se comporta el de verdad. */
  var HAY_SESION = location.hash.indexOf("error") < 0;
  /* Con el vale nuestro (#invitacion=…) NO hay sesión hasta canjearlo, igual
     que en la vida real: primero verifyOtp, después ya hay sesión. */
  var CON_VALE = /[#&]invitacion=|[#&]recuperar=/.test(location.hash);
  if (CON_VALE) HAY_SESION = false;
  function consulta(){
    var filas = [{ usr_id:"SC-02", nombre:"Ana Torres", rol:"subcomisionista", activo:true }];
    var p = Promise.resolve({ data: filas, error:null });
    ["select","eq","limit","order","in","is"].forEach(function(m){ p[m] = consulta; });
    p.maybeSingle = function(){ return Promise.resolve({ data: filas[0], error:null }); };
    return p;
  }
  return {
    auth: {
      getSession: function(){ return Promise.resolve({ data:{ session: HAY_SESION ? { user:U } : null }, error:null }); },
      signOut: function(){ return Promise.resolve({ error:null }); },
      signInWithPassword: function(){ return Promise.resolve({ data:{ session:{ user:U } }, error:null }); },
      resetPasswordForEmail: function(){ return Promise.resolve({ error:null }); },
      updateUser: function(d){ window.__updates.push(d); return Promise.resolve({ data:{}, error:null }); },
      verifyOtp: function(d){
        window.__canjes = (window.__canjes||[]); window.__canjes.push(d);
        if(String(d.token_hash||"").indexOf("vencido") >= 0)
          return Promise.resolve({ data:{ session:null }, error:{ message:"Token has expired" } });
        HAY_SESION = true;
        return Promise.resolve({ data:{ session:{ user:U } }, error:null });
      },
      onAuthStateChange: function(){ return { data:{ subscription:{ unsubscribe:function(){} } } }; }
    },
    from: consulta
  };
}};`;

const TIPOS = { ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".json":"application/json" };
const servidor = http.createServer((pedido, resp) => {
  const limpio = decodeURIComponent(pedido.url.split("?")[0].split("#")[0]);
  const archivo = path.join(RAIZ, limpio === "/" ? "/index.html" : limpio);
  fs.readFile(archivo, (e, datos) => {
    if (e) { resp.writeHead(404); resp.end("no está"); return; }
    resp.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo)] || "text/plain" });
    resp.end(datos);
  });
});

let ok = 0, mal = 0;
const comprobar = (t, c) => { if (c) { ok++; console.log("  ✓ " + t); } else { mal++; console.log("  ✗ " + t); } };

(async () => {
  await new Promise(r => servidor.listen(PUERTO, r));
  const nav = await chromium.launch();
  const errores = [];

  async function abrir(hash) {
    const ctx = await nav.newContext({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true });
    const pag = await ctx.newPage();
    pag.on("pageerror", e => errores.push(String(e.message).split("\n")[0]));
    /* el CDN no se alcanza desde aquí: se sirve el doble en su lugar */
    await pag.route("**/supabase-js@2/**", r => r.fulfill({ contentType:"text/javascript", body: DOBLE }));
    /* el service worker guardaría versiones viejas entre pruebas */
    await pag.route("**/sw.js", r => r.fulfill({ contentType:"text/javascript", body:"" }));
    await pag.goto("http://localhost:" + PUERTO + "/index.html" + (hash || ""), { waitUntil:"domcontentloaded" });
    await pag.waitForTimeout(600);
    return {
      pag, ctx,
      visible: (id) => pag.evaluate(i => { const e = document.getElementById(i); return !!e && !e.classList.contains("oculto"); }, id),
      txt: () => pag.evaluate(() => document.getElementById("cajaAcceso").textContent || ""),
      escribir: (id, v) => pag.fill("#" + id, v),
      tocar: (id) => pag.click("#" + id),
      updates: () => pag.evaluate(() => window.__updates || []),
    };
  }

  console.log("═══ Portal · aterrizaje de enlaces del correo");

  /* 1 · INVITACIÓN */
  const inv = await abrir("#access_token=abc&refresh_token=def&type=invite");
  comprobar("invitación: pide crear la clave", await inv.visible("vistaNueva"));
  comprobar("invitación: NO lo manda a su app sin clave", inv.pag.url().indexOf("index.html") >= 0);
  comprobar("invitación: no muestra la pantalla de sesión", !(await inv.visible("vistaSesion")));
  let t = await inv.txt();
  comprobar("invitación: el texto habla de entrar, no de 'clave nueva'", /Crea tu clave para entrar/.test(t));
  comprobar("invitación: el botón dice qué va a pasar", /Guardar mi clave y entrar/.test(t));

  await inv.escribir("inNueva", "hola"); await inv.escribir("inNueva2", "hola");
  await inv.tocar("btnGuardarNueva"); await inv.pag.waitForTimeout(400);
  comprobar("invitación: rechaza una clave floja",
    /Mínimo 8 caracteres/.test(await inv.txt()) && (await inv.updates()).length === 0);

  await inv.escribir("inNueva", "arroz2026"); await inv.escribir("inNueva2", "arroz2027");
  await inv.tocar("btnGuardarNueva"); await inv.pag.waitForTimeout(400);
  comprobar("invitación: avisa si las dos claves no coinciden",
    /no coinciden/.test(await inv.txt()) && (await inv.updates()).length === 0);

  /* Con la clave buena: primero guarda y SOLO entonces navega. Como la página
     se va, los apuntes del doble se pierden; por eso se anota el pedido. */
  const pedidos = [];
  inv.pag.on("request", r => pedidos.push(r.url()));
  await inv.escribir("inNueva", "arroz2026"); await inv.escribir("inNueva2", "arroz2026");
  await inv.tocar("btnGuardarNueva");
  await inv.pag.waitForURL(/Comisionista\.html/, { timeout:8000 }).catch(()=>{});
  comprobar("invitación: después de guardar lo lleva a la app de su rol",
    /Comisionista\.html/.test(inv.pag.url()) && pedidos.some(u => /Comisionista\.html/.test(u)));
  await inv.ctx.close();

  /* 2 · RECUPERACIÓN */
  const rec = await abrir("#access_token=abc&type=recovery");
  comprobar("recuperación: pide la clave nueva", await rec.visible("vistaNueva"));
  comprobar("recuperación: mantiene su texto de siempre", /Crea tu clave nueva/.test(await rec.txt()));
  await rec.escribir("inNueva", "arroz2026"); await rec.escribir("inNueva2", "arroz2026");
  await rec.tocar("btnGuardarNueva"); await rec.pag.waitForTimeout(900);
  const u = await rec.updates();
  comprobar("recuperación: guarda la clave", u.length === 1 && u[0].password === "arroz2026");
  comprobar("recuperación: se queda en el portal confirmando",
    /Clave actualizada/.test(await rec.txt()) && rec.pag.url().indexOf("index.html") >= 0);
  await rec.ctx.close();

  /* 3 · ENLACE VENCIDO */
  const malo = await abrir("#error=access_denied&error_code=otp_expired");
  comprobar("enlace vencido: lo dice con palabras claras", /ya se usó o venció/.test(await malo.txt()));
  comprobar("enlace vencido: deja entrar con correo y clave", await malo.visible("vistaLogin"));
  await malo.ctx.close();

  /* 4 · VISITA NORMAL CON SESIÓN */
  const normal = await abrir("");
  comprobar("visita normal: reconoce la sesión y saluda",
    (await normal.visible("vistaSesion")) && /Ana Torres/.test(await normal.txt()));
  comprobar("visita normal: no pide crear ninguna clave", !(await normal.visible("vistaNueva")));
  await normal.ctx.close();

  /* 5 · EL ENLACE QUE REPARTE RICHARD (vale nuestro, apunta directo aquí) */
  const vale = await abrir("#invitacion=abc123vale");
  comprobar("vale: pide crear la clave", await vale.visible("vistaNueva"));
  const canje = await vale.pag.evaluate(() => window.__canjes || []);
  comprobar("vale: lo canjea por una sesión", canje.length === 1 && canje[0].type === "invite" && canje[0].token_hash === "abc123vale");
  comprobar("vale: mientras comprueba, el botón no deja guardar a ciegas",
    await vale.pag.evaluate(() => document.getElementById("btnGuardarNueva").disabled) === false);
  await vale.escribir("inNueva", "arroz2026"); await vale.escribir("inNueva2", "arroz2026");
  await vale.tocar("btnGuardarNueva");
  await vale.pag.waitForURL(/Comisionista\.html/, { timeout:8000 }).catch(()=>{});
  comprobar("vale: guarda y lo lleva a su app", /Comisionista\.html/.test(vale.pag.url()));
  await vale.ctx.close();

  /* 6 · VALE YA USADO O VENCIDO */
  const gastado = await abrir("#invitacion=vencido-xyz");
  comprobar("vale vencido: vuelve al ingreso normal", await gastado.visible("vistaLogin"));
  comprobar("vale vencido: lo explica", /ya se usó o venció/.test(await gastado.txt()));
  await gastado.ctx.close();

  comprobar("ninguna pantalla soltó un error de JavaScript", errores.length === 0);
  if (errores.length) console.log("     - " + [...new Set(errores)].join("\n     - "));

  await nav.close(); servidor.close();
  console.log("Resultado: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log("✗ " + String(e && e.message || e).split("\n")[0]); process.exit(1); });
