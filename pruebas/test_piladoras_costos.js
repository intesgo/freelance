#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   PILADORAS · COSTOS Y PRECIOS (Fase 1) · App Freelance

   En la ficha de una piladora, la pestaña "Costos y precios" muestra sus
   ofertas vigentes por Grano → Marca → Presentación (Costo de la piladora +
   Base del freelance + margen) y deja editar y "ajustar por grano". Reglas
   que este arnés vigila (críticas, para no dañar precios de producción):
     · TODO es por piladora: la carga y el ajuste filtran por prov_cod; nunca
       cruzan a otra piladora.
     · VERSIONADO: al cambiar un valor se CIERRA la fila vigente
       (vigente_hasta = hoy) y se INSERTA una nueva (vigente_desde = hoy). No
       se sobrescribe: el histórico y el motor de precios quedan intactos.
     · El valor se guarda tal cual (sin redondear); se redondea al mostrar.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), path = require("path");
const fl = fs.readFileSync(path.join(__dirname, "..", "freelance-completo.html"), "utf8");

let bien = 0, mal = 0;
const prueba = (ok, msg) => { if (ok) bien++; else { mal++; console.error("✗ " + msg); } };

/* ── Existe el componente y la pestaña ── */
prueba(/function CostosPreciosPiladora\(\{provCod, provNombre, usuario, toast\}\)\{/.test(fl), "existe el componente CostosPreciosPiladora");
prueba(/secP==="costos"\?"on":""\} onClick=\{\(\)=>setSecP\("costos"\)\}>Costos y precios/.test(fl), "la ficha de la piladora tiene la pestaña «Costos y precios»");
prueba(/\{secP==="costos" && <CostosPreciosPiladora provCod=\{selCod\} provNombre=\{prov\.nombre\} usuario=\{usuario\} toast=\{toast\}\/>\}/.test(fl), "la pestaña monta el componente con la piladora seleccionada");

/* ── TODO por piladora: la carga filtra por prov_cod ── */
prueba(/from\("ofertas_piladora"\)[\s\S]{0,400}\.eq\("prov_cod",provCod\)/.test(fl), "las ofertas se cargan filtradas por prov_cod (una sola piladora)");

/* ── Versionado: cerrar la vigente + insertar una nueva (no sobrescribir) ── */
prueba(/const c1=await window\.SB\.from\("ofertas_piladora"\)\.update\(\{vigente_hasta:hoy\}\)\.eq\("oferta_id",o\.oferta_id\)/.test(fl), "al guardar CIERRA la fila vigente (vigente_hasta = hoy)");
prueba(/const c2=await window\.SB\.from\("ofertas_piladora"\)\.insert\(fila\)/.test(fl), "al guardar INSERTA una fila nueva (no sobrescribe)");
prueba(/vigente_desde:hoy/.test(fl) && /activo:true/.test(fl), "la fila nueva abre con vigente_desde = hoy y activa");
prueba(/MISMO_DIA_ACTUALIZA/.test(fl) && /window\.SB\.from\("ofertas_piladora"\)\.update\(val\)\.eq\("oferta_id",o\.oferta_id\)/.test(fl),
  "el mismo día corrige la fila en su sitio; otro día versiona (cierra + inserta)");
prueba(/oferta_id:nid, prod_id:o\.prod_id, pres_cod:o\.pres_cod, presentacion:o\.presentacion,/.test(fl), "la fila nueva conserva prod_id/pres_cod/presentacion/equiv del original");

/* ── Costo (piladora) y Base (freelance) + margen ── */
prueba(/Costo<\/div>/.test(fl) && /Base<\/div>/.test(fl), "se muestran Costo y Base");
prueba(/Margen \(base − costo, crédito\)/.test(fl), "se muestra el margen (base − costo) como guía");

/* ── Ajustar por grano: por prov_cod, salta las excluidas, en monto o % ── */
prueba(/const aplicarAjuste=async\(\)=>\{/.test(fl), "existe «Ajustar por grano» (aplicarAjuste)");
prueba(/const objetivo=Object\.keys\(marcas\)\.filter\(pid=>!excluidas\[pid\]\)/.test(fl), "el ajuste salta las marcas excluidas");
prueba(/ajuste\.modo==="pct"\? base\*\(v\/100\) : v/.test(fl), "el ajuste puede ser en % o en monto");
prueba(/ajuste\.signo\*delta/.test(fl), "el ajuste puede subir (+) o bajar (−)");

/* ── Guardar el valor real (redondeo solo al mostrar) ── */
prueba(/const r4=n=>Math\.round\(\(Number\(n\)\|\|0\)\*10000\)\/10000/.test(fl), "el ajuste conserva precisión (redondeo a 4, no a 2)");
prueba(/o\.margen_min!=null\?o\.margen_min:8/.test(fl), "conserva el margen_min de la oferta (no lo pierde)");

if (mal) { console.error(`Resultado PILADORAS-COSTOS: ${bien} ✓ · ${mal} ✗`); process.exit(1); }
console.log(`Resultado PILADORAS-COSTOS: ${bien} ✓ · 0 ✗`);
