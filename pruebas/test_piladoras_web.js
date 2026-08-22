#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   PILADORAS · Costos y Base (Fase 1) · Sistema Web

   "Precios vigentes" se fusiona en un módulo "Piladoras": misma data
   (ofertas_piladora, vía v_ofertas_vigentes) por piladora, Grano → Marca →
   Presentación, con Costo + Base + margen y "Ajustar por grano". Reglas que
   este arnés vigila (para no dañar precios de producción):
     · Todo por piladora: la ficha y el ajuste filtran por prov_cod; no cruzan.
     · Versionado: cierra la fila vigente (vigente_hasta = hoy) e inserta una
       nueva (vigente_desde = hoy). No sobrescribe.
     · No escribe en `precios` (el cerrojo b63 sigue intacto): PreciosWeb queda
       definido y el Catálogo (replicar/histórico) no se toca.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const web = fs.readFileSync(path.join(__dirname, "..", "sistema-web.html"), "utf8");

let bien = 0, mal = 0;
const prueba = (ok, msg) => { if (ok) bien++; else { mal++; console.error("✗ " + msg); } };

/* ── El módulo existe y está enrutado ── */
prueba(/function PiladorasWeb\(\{ usuario \}\)\{/.test(web), "existe el módulo PiladorasWeb");
prueba(/return <PiladorasWeb usuario=\{sesion\} \/>;/.test(web), "el menú «Piladoras» (preciosvig) enruta a PiladorasWeb");
prueba(/key:"preciosvig",\s*ic:"[a-zA-Z]+",\s*icon:"🏭", label:"Piladoras"/.test(web), "el módulo se llama «Piladoras» en el menú");  /* DISENO_BASE_ERP · cada sección lleva ahora ic:"<vectorial>" antes del emoji */

/* ── Fusiona "Precios vigentes" pero preserva lo demás ── */
prueba(/function PreciosWeb\(\{ usuario \}\) \{/.test(web), "PreciosWeb sigue definido (no se rompe test_precios_ofertas)");
prueba(!/return <PreciosWeb usuario=\{sesion\} \/>;/.test(web), "«Precios vigentes» ya no se enruta suelto (se fusionó en Piladoras)");
prueba(/function CatalogoWeb\(\{ usuario \}\)/.test(web) && /replicarEnBloque/.test(web), "el Catálogo y «replicar» quedan intactos");

/* ── Todo por piladora: carga y agrupación por prov_cod ── */
prueba(/\(ofertas\|\|\[\]\)\.filter\(o=>o\.provCod===selProv\)/.test(web), "la ficha muestra solo las ofertas de la piladora elegida (prov_cod)");
prueba(/g\[inf\.linea\]\[o\.prodId\]/.test(web), "agrupa Grano (linea) → Marca (prodId) → presentación");

/* ── Versionado: cerrar vigente + insertar nueva, nunca sobrescribir ── */
prueba(/const c1=await window\.supa\.from\("ofertas_piladora"\)\.update\(\{vigente_hasta:hoy\}\)\.eq\("oferta_id",o\.ofertaId\)/.test(web), "cierra la fila vigente (vigente_hasta = hoy)");
prueba(/const c2=await window\.supa\.from\("ofertas_piladora"\)\.insert\(fila\)/.test(web), "inserta una fila nueva (no sobrescribe)");
prueba(/vigente_desde:hoy/.test(web) && /activo:true/.test(web), "la fila nueva abre con vigente_desde = hoy y activa");

/* ── No escribe en `precios` (cerrojo b63) ── */
prueba(!/from\("precios"\)[\s\S]{0,40}\.(insert|update|upsert|delete)\(/.test(web), "no hay escritura en la tabla `precios`");

/* ── Ajustar por grano: por prov_cod (implícito en granos), salta excluidas, monto/% ── */
prueba(/const aplicarAjuste=async\(\)=>\{/.test(web), "existe «Ajustar por grano» (aplicarAjuste)");
prueba(/const objetivo=Object\.keys\(marcas\)\.filter\(pid=>!excluidas\[pid\]/.test(web), "el ajuste salta las marcas excluidas");
prueba(/ajuste\.modo==="pct"\?base\*\(v\/100\):v/.test(web), "el ajuste puede ser en % o en monto");
prueba(/ajuste\.signo\*delta/.test(web), "el ajuste puede subir (+) o bajar (−)");

/* ── Costo + Base + margen; precisión al guardar ── */
prueba(/Costo<\/div>/.test(web) && /Base<\/div>/.test(web), "muestra Costo y Base");
prueba(/const r4=n=>Math\.round\(\(Number\(n\)\|\|0\)\*10000\)\/10000/.test(web), "el ajuste conserva precisión (redondeo a 4, no a 2)");

if (mal) { console.error(`Resultado PILADORAS-WEB: ${bien} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`Resultado PILADORAS-WEB: ${bien} ✓ · 0 ✗`);
