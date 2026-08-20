#!/usr/bin/env node
/* PED P2-6 · Arreglos del aplicativo (freelance-completo.html).
   Cuatro correcciones, cada una con su ancla. Este arnés cae si algo se revierte:
   1) PED_OPTIMISTA   · una sola tarjeta por pedido (no una por producto) + recargar al guardar
   2) PED_DETALLE_LINEAS · el detalle muestra TODAS las líneas con su precio
   3) PED_COND_REAL   · la condición sale del valor real (it.credito), no del nombre
   4) PED_BUSCA_PROV  · la búsqueda por proveedor tokeniza (AND), igual que el cliente */
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const app=fs.readFileSync(path.join(raiz,"freelance-completo.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* ── anclas ── */
ok(/PED_OPTIMISTA/.test(app), "ancla PED_OPTIMISTA presente");
ok(/PED_DETALLE_LINEAS/.test(app), "ancla PED_DETALLE_LINEAS presente");
ok(/PED_COND_REAL/.test(app), "ancla PED_COND_REAL presente");
ok(/PED_BUSCA_PROV/.test(app), "ancla PED_BUSCA_PROV presente");

/* ── 1) PED_OPTIMISTA · UNA sola tarjeta por pedido ── */
ok(/const nuevo=\{/.test(app), "1 · el push optimista arma UNA tarjeta (const nuevo)");
ok(/setPedidos\(prev=>\[nuevo, \.\.\.prev\]\)/.test(app), "1 · se agrega una sola tarjeta al frente");
ok(!/const nuevos=carrito\.map\(/.test(app), "1 · ya NO se crea una tarjeta por producto (const nuevos=carrito.map)");
ok(!/setPedidos\(prev=>\[\.\.\.nuevos, \.\.\.prev\]\)/.test(app), "1 · ya NO se insertan varias tarjetas (…nuevos)");
ok(/prod:prodGuia, cant:totalCant, precio:precioProm/.test(app), "1 · la tarjeta resume producto guía + cantidad total + precio promedio");
/* recargar al confirmar el guardado en base */
ok(/guardado en la base"\);[\s\S]{0,320}recargarPedidos\(\);/.test(app), "1 · al guardar en la base se recarga la lista (fuente real, agrupada)");

/* ── 3) PED_COND_REAL · condición del valor real ── */
ok(/const credito = carrito\.some\(it=>!!it\.credito\);/.test(app), "3 · la condición del pedido sale de it.credito (valor real)");
ok(!/const credito = it\.tipoNombre && \/créd\/i\.test\(it\.tipoNombre\)/.test(app), "3 · ya NO se deriva la condición del texto del nombre");

/* ── 2) PED_DETALLE_LINEAS · el desglose lleva precio y el detalle lo itera ── */
ok(/qq: qqDe\(i\), precio: Number\(i\.precio_usd\|\|0\)/.test(app), "2 · cada línea del pedido lleva su cantidad efectiva y su precio");
ok(/p\.lineas\.map\(\(l,i\)=>\{/.test(app), "2 · el detalle itera TODAS las líneas de p.lineas");
ok(/\{money\(pr\)\} c\/u/.test(app), "2 · el detalle muestra el precio por unidad de cada línea");
ok(/\{money\(Math\.round\(q\*pr\*100\)\/100\)\}/.test(app), "2 · el detalle muestra el total de cada línea (cantidad × precio)");

/* ── 4) PED_BUSCA_PROV · búsqueda por proveedor tokenizada ── */
ok(/const palabras = t\.split\(\/\\s\+\/\)\.filter\(Boolean\);/.test(app), "4 · la búsqueda parte el texto en palabras");
ok(/palabras\.every\(w=>norm\(p\.prov\)\.includes\(w\)\)/.test(app), "4 · el proveedor se busca por palabras sueltas (AND)");
ok(!/norm\(p\.prov\)\.includes\(t\)/.test(app), "4 · ya NO se compara el proveedor contra la frase completa");

/* ── sanidad de la lógica de búsqueda (demostración pura, no toca el fuente) ── */
const norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
const casa=(q,prov)=>{ const t=norm(q); const palabras=t.split(/\s+/).filter(Boolean);
  return t==="" || palabras.every(w=>norm(prov).includes(w)); };
ok(casa("molinos litoral","Molinos del Litoral"), "4 · «molinos litoral» encuentra «Molinos del Litoral»");
ok(!casa("molinos quevedo","Molinos del Litoral"), "4 · una palabra que no está NO caza (AND, no OR)");

if(m){console.error(`PED-P2-6: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`PED-P2-6: ${b} ✓ · 0 ✗`);
