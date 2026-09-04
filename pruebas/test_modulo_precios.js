#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   DISENO_MODULO_PRECIOS · «Precios» reusa PiladorasWeb en modo="precios":
   entra directo a costos, recuerda la última piladora (localStorage, defensivo),
   botón «Cambiar piladora», sin crear piladora, ancho 1040. El módulo «Piladoras»
   (preciosvig) se queda EXACTAMENTE igual. Inspección del fuente.
   ═══════════════════════════════════════════════════════════════════════ */
const fs=require("fs"), path=require("path");
const web=fs.readFileSync(path.join(__dirname,"..","sistema-web.html"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* 1 · «Precios» está en SECCIONES y en el grupo Comercial */
ok(/\{ key:"precios", ic:"tag",/.test(web), "«Precios» está en SECCIONES");
ok(/titulo:"Comercial",\s*keys:\[[^\]]*"preciosvig","precios"/.test(web), "«precios» está en el grupo Comercial, tras preciosvig");

/* 2 · la ruta "precios" renderiza PiladorasWeb con modo="precios" */
ok(/case "precios":[\s\S]{0,160}return <PiladorasWeb usuario=\{sesion\} modo="precios" \/>/.test(web),
   "la ruta «precios» renderiza PiladorasWeb con modo=\"precios\"");

/* 3 · "ofertas","preciosvig","propuestas" renderizan el modo de siempre (sin modo) */
ok(/case "ofertas":[\s\S]{0,220}case "preciosvig":[\s\S]{0,220}case "propuestas":[\s\S]{0,120}return <PiladorasWeb usuario=\{sesion\} \/>/.test(web),
   "«ofertas/preciosvig/propuestas» siguen en el modo de siempre");

/* 4 · el componente lee modo y deriva soloPrecios */
ok(/function PiladorasWeb\(\{ usuario, modo \}\)\{/.test(web), "PiladorasWeb recibe `modo`");
ok(/const soloPrecios = modo === "precios";/.test(web), "deriva soloPrecios de modo");

/* 5 · en modo precios NO se pintan las pestañas; en el otro SÍ */
ok(/\{!soloPrecios && \(\s*<div style=\{\{display:"flex",gap:8,margin:"0 2px 14px"\}\}>/.test(web) &&
   /setSecW\("ficha"\)/.test(web),
   "las pestañas Ficha/Costos solo se pintan fuera de modo precios");

/* 6 · el botón de volver dice «Cambiar piladora» solo en modo precios */
ok(/soloPrecios\?"‹ Cambiar piladora":"‹ Piladoras"/.test(web), "el botón de volver dice «Cambiar piladora» en modo precios");

/* 7 · en modo precios no se ofrece crear piladora */
ok(/\{!soloPrecios && <button onClick=\{\(\)=>\{ setAltaOpen/.test(web), "«Crear piladora» no se ofrece en modo precios");

/* 8 · recuerda la última piladora: al elegir, si es modo precios, se guarda */
ok(/const KEY_ULT_PIL = "freelance_precios_ultima_piladora";/.test(web), "usa la clave freelance_precios_ultima_piladora");
ok(/if\(soloPrecios\)\{ try\{ localStorage\.setItem\(KEY_ULT_PIL, cod\); \}catch\(_\)\{\}\} \};/.test(web),
   "al abrir una piladora en modo precios se guarda (solo modo precios)");

/* 9 · con piladora guardada que existe se abre sola; si ya no existe, se limpia (sin error) */
ok(/if\(cod && piladoras\.some\(p=>p\.provCod===cod\)\) setSelProv\(cod\);/.test(web),
   "con piladora guardada que existe, se abre sola");
ok(/else if\(cod\) localStorage\.removeItem\(KEY_ULT_PIL\);/.test(web),
   "con piladora guardada que ya no existe, se limpia (sin error)");

/* 10 · «Cambiar piladora» borra la recordada */
ok(/const cambiarPiladora=\(\)=>\{[\s\S]{0,160}localStorage\.removeItem\(KEY_ULT_PIL\)/.test(web),
   "«Cambiar piladora» borra la piladora recordada");

/* 11 · todo el manejo de localStorage va en try/catch (pantalla no se rompe) */
ok(/const cod=localStorage\.getItem\(KEY_ULT_PIL\);[\s\S]{0,200}\}catch\(_\)\{\}/.test(web),
   "el efecto que recuerda la piladora va en try/catch");

/* 12 · el ancho pasa a 1040 en modo precios */
ok(/maxWidth:soloPrecios\?1040:760/.test(web), "en modo precios el ancho es 1040 (760 en el otro)");

if(m){ console.error(`MODULO-PRECIOS: ${b} ✓ · ${m} ✗`); process.exit(1); }
console.log(`MODULO-PRECIOS: ${b} ✓ · 0 ✗`);
