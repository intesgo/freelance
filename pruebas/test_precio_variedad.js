#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   DISENO_PRECIO_VARIEDAD · precio por variedad y por piladora.
   Al cambiar el precio de una variedad NO se sobrescribe cada marca: se le aplica
   la DIFERENCIA contra el precio anterior de la variedad, por quintal, multiplicada
   por la equivalencia de cada oferta. Así cada marca conserva su diferencial.
   Mezcla lógica pura (la resta) e inspección del fuente.
   ═══════════════════════════════════════════════════════════════════════ */
const fs=require("fs"), path=require("path");
const web=fs.readFileSync(path.join(__dirname,"..","sistema-web.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* réplica de la regla central: nuevo = actual + (nuevoVar − antVar) × equiv_qq */
const nuevoOferta=(actual,nuevoVar,antVar,equiv)=>Math.round((actual+(nuevoVar-antVar)*equiv)*100)/100;

/* 1 · la sección lista las variedades con precio y conteo de marcas */
ok(/🏷️ Precios por variedad/.test(web), "existe la sección «Precios por variedad»");
ok(/\{marcas\.length\} marca\(s\) · \{tienePrecio\?\("base "\+preMoney/.test(web),
   "cada variedad muestra su conteo de marcas y su base");

/* 2 · una variedad sin precio muestra «Sin precio» */
ok(/:"Sin precio"/.test(web), "una variedad sin precio muestra «Sin precio»");

/* 3 · primer precio (sin anterior): solo se registra, NO se llama a versionarOfertaWeb */
{ const iGuard=web.indexOf("if(prev){\n      const dCosto");
  const iProp=web.indexOf("await versionarOfertaWeb(o,nuevos,usuario)");
  ok(iGuard>0 && iProp>iGuard, "la propagación a las ofertas va DENTRO de if(prev): sin precio anterior no se mueve nada"); }
ok(/Se registra el precio de referencia\. No se mueve ninguna marca\./.test(web),
   "la vista previa del primer precio dice que no se mueve ninguna marca");
ok(/setPvResumen\("Precio de referencia registrado\. No se movió ninguna marca\."\)/.test(web),
   "al registrar el primer precio, el resumen lo dice");

/* 4 · el delta es nuevo − anterior (por cada uno de los cuatro números) */
ok(/nBaseCr-\(Number\(prev\.base_credito\)\|\|0\)/.test(web), "el delta de base crédito = nuevo − anterior");
ok(/nCosto-\(Number\(prev\.costo\)\|\|0\)/.test(web), "el delta de costo = nuevo − anterior");

/* 5 · la vista previa muestra marca, presentación, precio hoy y nuevo */
ok(/filas\.push\(\{marca[\s\S]{0,80}pres:o\.presentacion\|\|o\.presCod, hoy, nuevo/.test(web),
   "la vista previa arma marca · presentación · hoy → nuevo");
ok(/\{r\.marca\} · \{r\.pres\}/.test(web) && /\{r\.hoy>0\?preMoney\(r\.hoy\):"—"\}/.test(web),
   "la vista previa pinta «marca · presentación» y «hoy → nuevo»");

/* 6 · sin confirmar la vista previa NO se escribe nada (el botón queda deshabilitado) */
ok(/disabled=\{pvSaving \|\| !algo \|\| \(prev && !pvConfirm\)\}/.test(web),
   "«Aplicar» queda deshabilitado hasta confirmar la vista previa");

/* 7 · con 34→36: quintal +2,00 · arroba (0,25) +0,50 · funda (0,10) +0,20 */
ok(nuevoOferta(35,36,34,1)===37.00, "quintal: 35 → 37,00 (delta +2 × 1)");
ok(nuevoOferta(8.75,36,34,0.25)===9.25, "arroba (equiv 0,25): 8,75 → 9,25 (+0,50)");
ok(nuevoOferta(3.50,36,34,0.10)===3.70, "funda (equiv 0,10): 3,50 → 3,70 (+0,20)");

/* 8 · una marca un dólar arriba sigue un dólar arriba */
{ const antesVar=34, nuevoVar=36, marcaQQ=35;   // marca +1 sobre la variedad
  const despues=nuevoOferta(marcaQQ,nuevoVar,antesVar,1);
  ok(despues-nuevoVar===1, "la marca que estaba $1 arriba de la variedad sigue $1 arriba (37 = 36+1)"); }

/* 9 · el recargo del empaque chico se conserva */
{ const antesVar=34, nuevoVar=36, funda=3.50, eq=0.10;
  const r2=x=>Math.round(x*100)/100;
  const recargoAntes=r2(funda-antesVar*eq);         // 3,50 − 3,40 = 0,10
  const despues=nuevoOferta(funda,nuevoVar,antesVar,eq);
  const recargoDespues=r2(despues-nuevoVar*eq);
  ok(recargoAntes===0.10 && recargoDespues===0.10, "el recargo de 0,10 del empaque chico se conserva"); }

/* 10 · una marca excluida no se toca */
ok(/\.filter\(pid=>!pvExcl\[pid\]\)/.test(web), "las marcas excluidas se saltan (pvExcl)");

/* 11 · todas las escrituras de precio pasan por versionarOfertaWeb (puerta única) */
ok(/await versionarOfertaWeb\(o,nuevos,usuario\)/.test(web), "las ofertas se escriben por versionarOfertaWeb");

/* 12 · toda la tanda comparte el mismo código de auditoría */
ok(/const codigo=preAu\(\); const hoy=preHoy\(\);/.test(web) && /operacion:"Precio por variedad", codigo/.test(web),
   "toda la tanda comparte un solo código de auditoría");

/* 13 · operacion es "Precio por variedad" */
ok(/operacion:"Precio por variedad"/.test(web), "la operación auditada es «Precio por variedad»");

/* 14 · otra piladora con la misma variedad NO se mueve (todo acotado a selProv) */
ok(/o\.provCod===selProv && o\.prodId===pid/.test(web),
   "solo se mueven las ofertas de ESTA piladora (o.provCod===selProv)");

/* 15 · vincular una marca no cambia ningún precio (solo productos.tipo_grano) */
ok(/from\("productos"\)\.update\(\{tipo_grano:cod\|\|null\}\)/.test(web),
   "clasificar una marca solo escribe productos.tipo_grano (no toca precios)");

/* 16 · si falla una oferta, el resumen dice cuáles por nombre */
ok(/fallos\.push\(marca/.test(web) && /Fallaron: \$\{\[\.\.\.new Set\(fallos\)\]\.join\(", "\)\}/.test(web),
   "si algo falla, el resumen lista las marcas por nombre");

/* 17 · si precios_variedad no carga, se puede seguir editando marca a marca */
ok(/from\("precios_variedad"\)[\s\S]{0,320}\}catch\(e\)\{ if\(vivo\) setPrecVar\(\{\}\); \}/.test(web),
   "si precios_variedad no carga, precVar queda vacío y la pantalla sigue funcionando");

if(m){ console.error(`PRECIO-VARIEDAD: ${b} ✓ · ${m} ✗`); process.exit(1); }
console.log(`PRECIO-VARIEDAD: ${b} ✓ · 0 ✗`);
