/* ¿La app abre SIN INTERNET?
   -------------------------------------------------------------------------
   El 01/08/2026 se midió que la app del transportista abría EN BLANCO sin
   señal: el service worker guardaba las pantallas pero no las librerías del
   CDN. Se corrigió, pero la corrección quedó SIN VERIFICAR. Esto la verifica.

   Método: se sirve dist/ en localhost (el service worker funciona en
   localhost sin https), se abre la app con un navegador de verdad, se espera
   a que el service worker termine de instalarse, se CORTA LA RED, se recarga
   y se mira si la app pinta algo.

   Lo que NO prueba: instalar la app en el celular. Eso solo se comprueba en
   un teléfono de verdad, con modo avión.

   Declarado ANTES de correr: 4 comprobaciones por app.  */

const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.join(require("./rutas").RAIZ, "dist");

/* ─── DOBLE DEL CDN ───────────────────────────────────────────────────────
   Este contenedor no alcanza cdnjs ni jsdelivr: el primer intento de esta
   prueba dio 0 librerías guardadas y pareció un defecto del sistema, pero
   estaba midiendo la red del contenedor, no el código. Aquí se responde a
   esas direcciones con copias locales, para que lo que se mida sea LA LÓGICA
   DEL SERVICE WORKER: si guarda las librerías y si las sirve sin red.
   Lo que este doble NO prueba: que las direcciones del CDN existan de verdad
   ni que estén disponibles desde el celular. */
const rutas = require("./rutas");
function dobleDelCdn(url) {
  if (/\/react\.production\.min\.js$/.test(url)) return rutas.react();
  if (/\/react-dom\.production\.min\.js$/.test(url)) return rutas.reactDom();
  if (/babel/.test(url)) return "/* babel no se usa: las apps van precompiladas */";
  if (/supabase/.test(url)) return "window.supabase={createClient:function(){return{}}};";
  return "/* pieza desconocida */";
}
const APPS = ["transportista-app.html", "Comisionista.html", "socio-comercial.html"];
const ESPERADAS = APPS.length * 4;

let ok = 0, fallo = 0, hechas = 0;
const prueba = (n, c) => { hechas++; if (c) { ok++; console.log("  ✓", n); } else { fallo++; console.log("  ✗ FALLO:", n); } };

const TIPOS = { ".html": "text/html", ".js": "application/javascript", ".json": "application/json", ".png": "image/png" };

function servidor() {
  return new Promise((listo) => {
    const s = http.createServer((req, res) => {
      const limpia = decodeURIComponent(req.url.split("?")[0]);
      const f = path.join(DIST, limpia === "/" ? "index.html" : limpia);
      if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        res.writeHead(404); res.end("no está"); return;
      }
      res.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "text/plain" });
      res.end(fs.readFileSync(f));
    });
    s.listen(0, "127.0.0.1", () => listo({ s, puerto: s.address().port }));
  });
}

/* ¿esta máquina alcanza los CDN? De eso depende qué se puede afirmar */
let HAY_CDN = false;

(async () => {
  const { s, puerto } = await servidor();
  const base = "http://127.0.0.1:" + puerto + "/";
  const navegador = await chromium.launch();

  {
    const c = await navegador.newContext(); const p = await c.newPage();
    await p.goto(base + "index.html").catch(() => {});
    HAY_CDN = await p.evaluate(async () => {
      try { const r = await fetch("https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
                                  { cache: "no-store" }); return r.ok; } catch (e) { return false; }
    });
    await c.close();
    console.log(HAY_CDN
      ? "Esta máquina SÍ alcanza los CDN: se juzgan las 4 comprobaciones por app."
      : "Esta máquina NO alcanza los CDN: 2 comprobaciones por app quedan SIN MEDIR.\n" +
        "La prueba de verdad es instalar la app en el celular y abrirla en modo avión.");
  }

  for (const app of APPS) {
    console.log("\n── " + app + " ──");
    /* contexto nuevo por app: caché y service worker limpios, como un
       teléfono que instala la app por primera vez */
    const ctx = await navegador.newContext();
    /* el doble del CDN, también para las peticiones del service worker */
    await ctx.route("https://cdnjs.cloudflare.com/**", (r) =>
      r.fulfill({ status: 200, contentType: "application/javascript", body: dobleDelCdn(r.request().url()) }));
    await ctx.route("https://cdn.jsdelivr.net/**", (r) =>
      r.fulfill({ status: 200, contentType: "application/javascript", body: dobleDelCdn(r.request().url()) }));
    const pag = await ctx.newPage();
    const errores = [];
    pag.on("pageerror", (e) => errores.push(String(e.message || e)));

    try {
      await pag.goto(base + app, { waitUntil: "load", timeout: 30000 });

      /* 1) ¿se registró y activó el service worker? */
      const activo = await pag.evaluate(async () => {
        if (!("serviceWorker" in navigator)) return false;
        const reg = await navigator.serviceWorker.register("./sw.js").catch(() => null);
        if (!reg) return false;
        await navigator.serviceWorker.ready;
        return !!(await navigator.serviceWorker.getRegistration());
      });
      prueba(app + ": el service worker se instala", activo);

      /* 2) ¿guardó las librerías del CDN, no solo las pantallas? */
      const guardado = await pag.evaluate(async () => {
        const nombres = await caches.keys();
        let pantallas = 0, librerias = 0, libs = 0;
        for (const n of nombres) {
          for (const p of await (await caches.open(n)).keys()) {
            if (/\/lib\//.test(p.url)) libs++;
          else if (p.url.startsWith("http://127.0.0.1")) pantallas++;
          else librerias++;
          }
        }
        return { pantallas, librerias, libs };
      });
      prueba(app + ": guardó las pantallas (" + guardado.pantallas + ")", guardado.pantallas > 0);

      /* Desde el 05/08/2026 las tres librerías que hacen falta para arrancar
         (React, ReactDOM, supabase-js) salen del propio sitio, en ./lib/, así
         que el service worker las guarda como una pantalla más y esto SÍ se
         puede medir aquí. Antes venían de cdnjs/jsdelivr y no había forma de
         comprobarlo en una máquina sin salida a esos CDN. */
      prueba(app + ": guardó las 3 librerías del propio sitio (" + guardado.libs + ")", guardado.libs === 3);

      /* 3) LA PRUEBA DE VERDAD: sin red, ¿pinta algo? */
      await ctx.setOffline(true);
      errores.length = 0;
      await pag.goto(base + app, { waitUntil: "load", timeout: 30000 }).catch(() => {});
      await pag.waitForTimeout(2500);
      const pinto = await pag.evaluate(() => {
        const r = document.getElementById("root");
        return { hijos: r ? r.children.length : -1, texto: (document.body.innerText || "").trim().length };
      });
      prueba(app + ": SIN RED abre y pinta (" + pinto.hijos + " hijos, " + pinto.texto + " caracteres)",
             pinto.hijos > 0 && pinto.texto > 50);
      if (pinto.hijos <= 0 && errores.length) console.log("      motivo:", errores[0].split("\n")[0].slice(0, 110));
    } catch (e) {
      prueba(app + ": la prueba no pudo completarse → " + String(e.message).slice(0, 80), false);
    }
    await ctx.close();
  }

  await navegador.close();
  s.close();

  console.log("\nComprobaciones esperadas: " + ESPERADAS + " · hechas: " + hechas);
  if (hechas !== ESPERADAS) console.log("  ⚠ FALTAN COMPROBACIONES: alguna desapareció en silencio.");
  console.log("Resultado: " + ok + " ✓ · " + fallo + " ✗");
  process.exit(fallo || hechas !== ESPERADAS ? 1 : 0);
})();
