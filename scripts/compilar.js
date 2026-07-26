/* ══ Compilador de publicación (comité 1.1 + 6.1) ══
   Toma cada app fuente (JSX con Babel en el navegador) y genera en dist/ la misma app
   YA COMPILADA a JavaScript plano: abre ~95% más rápido porque el teléfono no compila.
   El fuente en main no cambia; esto solo prepara lo que se publica.
   Si alguna app no compila, el proceso FALLA y no se publica nada. */
const fs = require("fs");
const path = require("path");
const Babel = require("@babel/standalone");

const APPS = ["freelance-completo.html","Comisionista.html","socio-comercial.html",
              "proveedor-freelance.html","transportista-app.html"];
const RAIZ = path.join(__dirname, "..");
const DIST = path.join(RAIZ, "dist");
const RE_BABEL = /<script[^>]*type=["']text\/babel["'][^>]*>([\s\S]*?)<\/script>/i;
const RE_LIBRERIA = /<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/babel-standalone\/[^"]+"><\/script>\s*/i;

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

/* 1) Copiar todo lo publicable tal cual (sw.js, index.html, etc.) */
for (const f of fs.readdirSync(RAIZ)) {
  /* "pruebas" no se publica: son los arneses, no la app (26 jul) */
  if ([".git",".github","scripts","dist","node_modules","pruebas"].includes(f)) continue;
  /* lo que solo sirve para desarrollar tampoco se publica */
  if (["package.json","package-lock.json",".gitignore"].includes(f)) continue;
  const p = path.join(RAIZ, f);
  if (fs.statSync(p).isFile()) fs.copyFileSync(p, path.join(DIST, f));
}

/* 2) Compilar cada app y dejarla en dist/ con el mismo nombre (misma URL) */
let fallo = false;
for (const app of APPS) {
  const src = fs.readFileSync(path.join(RAIZ, app), "utf8");
  const m = src.match(RE_BABEL);
  if (!m) { console.error(`✗ ${app}: no se encontró el bloque text/babel`); fallo = true; continue; }
  let js;
  try {
    js = Babel.transform(m[1], { presets: [["react", { runtime: "classic" }]] }).code;
  } catch (e) {
    console.error(`✗ ${app}: ERROR de compilación → ${e.message.split("\n")[0]}`);
    fallo = true; continue;
  }
  /* '</script' dentro de cadenas del código rompería el HTML al inyectar: se escapa
     (dentro de una cadena JS '<\/script' es idéntico a '</script'). */
  js = js.replace(/<\/script/gi, "<\\/script");
  let out = src.replace(RE_BABEL, () => "<script>\n" + js + "\n</script>");
  out = out.replace(RE_LIBRERIA, "");   /* Babel ya no se necesita en el navegador */
  out = out.replace("<head>", "<head>\n<!-- publicación precompilada · el fuente vive en la rama main -->");
  fs.writeFileSync(path.join(DIST, app), out);
  console.log(`✓ ${app}: compilada (${(js.length/1024).toFixed(0)} KB de JS)`);
}
if (fallo) { console.error("\nHay errores: NO se publica."); process.exit(1); }
console.log("\nListo: dist/ contiene la publicación precompilada.");
