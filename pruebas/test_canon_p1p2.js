#!/usr/bin/env node
/* PED_CANON_P1P2 · Canon único de tipo de precio: P1 = Crédito, P2 = Contado.
   El servidor usa "condicion" para el precio; P1/P2 es solo el rótulo tipo_precio
   y las etiquetas. Este arnés vigila que app, web, comisionista y socio digan LO
   MISMO, y CAE si alguno se vuelve a invertir (que es el bug que corrige P1-3). */
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const L=(f)=>fs.readFileSync(path.join(raiz,f),"utf8");
const web =L("sistema-web.html");
const app =L("freelance-completo.html");
const comi=L("Comisionista.html");
const soci=L("socio-comercial.html");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* ── Web (sistema-web): el catálogo de tipos, la base y esCredito ── */
ok(/\{ id:"P1", nombre:"Crédito"/.test(web), "web · P1 = Crédito en TIPOS_PRECIO_WEB");
ok(/\{ id:"P2", nombre:"Contado"/.test(web), "web · P2 = Contado en TIPOS_PRECIO_WEB");
ok(!/\{ id:"P1", nombre:"Contado"/.test(web) && !/\{ id:"P2", nombre:"Crédito"/.test(web), "web · TIPOS_PRECIO_WEB NO está invertido");
ok(/tipo==="P1" \? prod\.baseCredito/.test(web), "web · P1 toma la base de CRÉDITO");
ok(/tipo==="P2" \? prod\.baseContado/.test(web), "web · P2 toma la base de CONTADO");
ok(/const esCredito = tipo==="P1" \|\|/.test(web), "web · esCredito nace de tipo P1 (crédito)");
ok(/cond:"Crédito", credito:true, tipo:"P1"/.test(web), "web · repetir pedido a crédito guarda P1");

/* ── App (freelance-completo): selector y etiqueta del editor ── */
ok(/\{id:"P1", nombre:"Crédito"/.test(app), "app · P1 = Crédito en TIPOS_PRECIO");
ok(/\{id:"P2", nombre:"Contado"/.test(app), "app · P2 = Contado en TIPOS_PRECIO");
ok(/TIPO_NOMBRE=\{P1:"Crédito",P2:"Contado"/.test(app), "app · TIPO_NOMBRE del editor: P1=Crédito, P2=Contado");
ok(!/TIPO_NOMBRE=\{P1:"Contado",P2:"Crédito"/.test(app), "app · TIPO_NOMBRE NO está invertido");
ok(/tipo==="P1" \? prod\.baseCredito/.test(app), "app · P1 toma la base de CRÉDITO");
ok(/const esCredito = tipo==="P1" \|\|/.test(app), "app · esCredito nace de tipo P1 (crédito)");

/* ── Comisionista y Socio: deben SEGUIR canónicos (no se tocaron) ── */
ok(/\{id:"P1", nombre:"Crédito"/.test(comi), "comisionista · P1 = Crédito (sigue canónico)");
ok(/\{id:"P2", nombre:"Contado"/.test(comi), "comisionista · P2 = Contado (sigue canónico)");
ok(/\{id:"P1", nombre:"Crédito"/.test(soci), "socio · P1 = Crédito (sigue canónico)");
ok(/\{id:"P2", nombre:"Contado"/.test(soci), "socio · P2 = Contado (sigue canónico)");

if(m){console.error(`CANON-P1P2: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`CANON-P1P2: ${b} ✓ · 0 ✗`);
