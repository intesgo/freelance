#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   SEG_PRECIOS_SOLO_FREELANCE · solo el Freelance mueve costos y precios.
   Sistema Web (PiladorasWeb) en solo lectura para los demás roles; la app del
   proveedor ya no captura costo (pero conserva el historial). Inspección del fuente.
   ═══════════════════════════════════════════════════════════════════════ */
const fs=require("fs"), path=require("path");
const raiz=path.join(__dirname,"..");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
const prov=fs.readFileSync(path.join(raiz,"proveedor-freelance.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* 1 · el candado: rol Freelance ve la edición; el resto queda en solo lectura */
ok(/const esFreelancePil = usuario && usuario\.rol === "Freelance";/.test(web) &&
   /const soloLectura = !esFreelancePil;/.test(web),
   "con rol Freelance se ve la edición; el resto es solo lectura (esFreelancePil/soloLectura)");

/* 2 · en solo lectura sale el chip y NO se pinta «✎ Editar» */
ok(/Solo lectura · los precios los mueve el freelance/.test(web), "sale el chip «Solo lectura»");
ok(/\{!enEd && !soloLectura && <button onClick=\{\(\)=>\{ setEdit\(o\.ofertaId\)/.test(web),
   "el botón «✎ Editar» de una oferta no se pinta en solo lectura");

/* 3 · en solo lectura no se ofrece «Ajustar por grano» */
ok(/\{!soloLectura && <button onClick=\{\(\)=>setAjuste\(\{linea:ln/.test(web),
   "«Ajustar por grano» no se pinta en solo lectura");

/* 4 · en solo lectura la lista, el buscador y el historial SÍ se ven (no van tras soloLectura) */
ok(/placeholder="Buscar marca…"/.test(web), "el buscador de marcas sigue disponible (no depende del rol)");
ok(/Historial de precios ›/.test(web), "el historial de precios sigue disponible (no depende del rol)");

/* 5 · la app del proveedor NO ofrece capturar costo por ningún camino */
ok(!/onCambiar=\{/.test(prov), "la app del proveedor ya no pasa onCambiar a PrecioSheet");
ok(!/rpc\("cambiar_costo"/.test(prov), "la app del proveedor ya no llama al RPC cambiar_costo");
ok(!/Guardar costo/.test(prov), "la app del proveedor ya no tiene el botón «Guardar costo»");
ok(!/Costo a crédito \(lo de siempre\)/.test(prov), "la app del proveedor ya no tiene el campo de costo");
ok(/El costo lo actualiza el freelance\. Escríbele si cambió\./.test(prov),
   "en su lugar, la app del proveedor dice quién mueve el costo ahora");

/* 6 · la app del proveedor SIGUE mostrando el historial de costos (solo lectura) */
ok(/historial de este precio/.test(prov), "la app del proveedor conserva el historial de costos");

if(m){ console.error(`SEG-PRECIOS-SOLO-FREELANCE: ${b} ✓ · ${m} ✗`); process.exit(1); }
console.log(`SEG-PRECIOS-SOLO-FREELANCE: ${b} ✓ · 0 ✗`);
