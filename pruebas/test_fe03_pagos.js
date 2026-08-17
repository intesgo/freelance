#!/usr/bin/env node
/* FE-03 · Pagos de flete y estibada (pagos_fe). Vigila que Logística asigne el
   estibador ANTES de despachar, que Financiera lea pagos_fe y pague por RPC, y que
   la app del chofer lea SOLO sus fletes. Atado a b166 / v253. */
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
const tr =fs.readFileSync(path.join(raiz,"transportista-app.html"),"utf8");
const sw =fs.readFileSync(path.join(raiz,"sw.js"),"utf8");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

/* ── versión y caché ── */
ok(/const VERSION = \{ n:"166"/.test(web),"Sistema Web debe anunciar b166");
ok(/const VERSION = \{ n:"36"/.test(tr),"la app del transportista debe anunciar v36");
ok(/const CACHE = "freelance-v253"/.test(sw),"la caché debe renovarse a v253");

/* ── FE-04 · mensaje claro al anular con pago pagado ── */
ok(/VIAJE_CON_PAGOS_PAGADOS: "No se puede anular/.test(web),"Logística mapea el error VIAJE_CON_PAGOS_PAGADOS a un mensaje en palabras");

/* ── FE-03.1 · los otros dos mensajes traducidos, no el error crudo de Postgres ── */
ok(!/No se pudo pagar: " \+ e\.message/.test(web),"al pagar NO se muestra el error crudo de Postgres");
ok(/PAGO_NO_LISTO:/.test(web),"pagar traduce el código PAGO_NO_LISTO");
ok(/ESTIBADOR_NO_ENCONTRADO:/.test(web),"asignar_estibador_ruta traduce sus códigos (EST_ERR)");
ok(/asignar_estibador_ruta", \{ p_ruta_id: despachar\.id, p_estibador_id: dEst\.id \}, EST_ERR\)/.test(web),"asignar_estibador_ruta recibe su diccionario EST_ERR");

/* ── FE-05.1 · el flete nace 'provisional' y se explica, no alarma ── */
ok(/Se cobra al entregar/.test(tr),"el chofer ve el flete provisional como «Se cobra al entregar»");
ok(/se cobran cuando confirmes las entregas/.test(tr),"el chofer ve el total en espera con su motivo");
ok(/estado==="provisional"/.test(tr),"la app del chofer distingue el estado provisional");
ok(/el flete y la estibada esperan a que se confirme la entrega/.test(web),"el módulo Pagos dice que AMBOS esperan la entrega (no solo la estibada)");

/* ── anclas ── */
ok(/FE03_ESTIBADOR_RUTA/.test(web),"ancla FE03_ESTIBADOR_RUTA (Logística)");
ok(/FE03_PAGOS_VIAJE/.test(web),"ancla FE03_PAGOS_VIAJE (panel del viaje)");
ok(/FE03_PAGOS_FINANCIERA/.test(web),"ancla FE03_PAGOS_FINANCIERA (Financiera)");
ok(/FE03_PAGOS_CHOFER/.test(tr),"ancla FE03_PAGOS_CHOFER (app del chofer)");

/* ── Logística: estibador obligatorio y asignado ANTES de despachar ── */
ok(/from\("estibadores"\)/.test(web),"Logística lista los estibadores");
ok(/correrRpc\("asignar_estibador_ruta", \{ p_ruta_id: despachar\.id, p_estibador_id: dEst\.id \}/.test(web),
  "se llama asignar_estibador_ruta con ruta y estibador");
const iAsig=web.indexOf('correrRpc("asignar_estibador_ruta"');
const iDesp=web.indexOf('correrRpc("despachar_ruta"');
ok(iAsig>0 && iDesp>0 && iAsig<iDesp,"el estibador se asigna ANTES de despachar_ruta (orden)");
ok(/fuenteLog==="vivo" && !dEst/.test(web),"sin estibador, el botón Despachar queda deshabilitado");
ok(/abrirPagosViaje\(vj\)/.test(web),"al terminar el despacho se abre el panel de pagos del viaje");

/* ── panel del viaje: solo lectura desde pagos_fe ── */
ok(/from\("pagos_fe"\)[\s\S]{0,160}\.eq\("viaje_id", viajeId\)/.test(web),"el panel del viaje lee pagos_fe por viaje_id");
ok(/💵 Pagos/.test(web),"cada viaje vivo tiene botón «💵 Pagos»");

/* ── Financiera: PagosFeVivos, monta arriba, paga solo firmes por RPC ── */
ok(/function PagosFeVivos\(\{ usuario \}\)/.test(web),"existe el componente PagosFeVivos");
ok(/<PagosFeVivos usuario=\{usuario\} \/>/.test(web),"PagosFeVivos se monta dentro de PagosWeb");
ok(/from\("pagos_fe"\)[\s\S]{0,200}\.eq\("es_demo", false\)/.test(web),"Financiera lee pagos_fe (no demo)");
ok(/rpc\("pagar_fe", \{ p_pago_id: f\.pago_id \}\)/.test(web),"se paga por RPC pagar_fe(p_pago_id)");
ok(/f\.estado==="firme" && !soloLectura/.test(web),"el botón Pagar solo aparece en los pagos firmes");
ok(/window\.confirm\(/.test(web),"pagar pide confirmación");

/* ── valor_qq nulo → «—», nunca $0,00 ── */
ok(/const fmtQqUnitFE = \(v\) => \(v==null \|\| isNaN\(Number\(v\)\)\) \? "—"/.test(web),"valor_qq nulo se muestra como «—»");
ok(/const fmtMontoFE = \(m\) => \(m==null \|\| isNaN\(Number\(m\)\)\) \? "—"/.test(web),"monto nulo se muestra como «—»");

/* ── App del chofer: SOLO sus fletes, nunca estibada, nunca paga ── */
ok(/window\.SB\.from\("pagos_fe"\)/.test(tr),"la app del chofer usa window.SB para leer pagos_fe");
ok(/\.eq\("concepto","flete"\)\.eq\("persona_id", yo\.usr_id\)/.test(tr),
  "el chofer filtra por concepto flete Y por su propio usr_id (RLS es por organización)");
ok(!/concepto","estibada"/.test(tr),"la app del chofer NO consulta estibada (solo flete)");
ok(!/pagar_fe/.test(tr),"la app del chofer NUNCA paga (no llama pagar_fe)");
ok(/fletesDe\(chofer\)/.test(tr),"sin sesión o sin filas, cae al demo de siempre (FLETES)");

/* ── la base solo se toca por RPC: ningún insert/update/delete a pagos_fe ── */
ok(!/from\("pagos_fe"\)[\s\S]{0,80}\.(insert|update|delete)\(/.test(web) && !/from\("pagos_fe"\)[\s\S]{0,80}\.(insert|update|delete)\(/.test(tr),
  "nadie escribe pagos_fe directo (solo por RPC pagar_fe)");

if(m){console.error(`FE03-PAGOS: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`FE03-PAGOS: ${b} ✓ · 0 ✗`);
