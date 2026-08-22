#!/usr/bin/env node
/* FE-02 · Cobro de flete/estibada en el pedido (arregla el retiro).
   Vigila que las CUATRO tomas de pedido lean la tarifa por zona, cobren en
   $/qq (0 en retiro), manden los campos al RPC y muestren el desglose. */
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const L=f=>fs.readFileSync(path.join(raiz,f),"utf8");
const sw=L("sw.js");
let b=0,m=0; const ok=(c,x)=>{ if(c)b++; else{m++;console.error("✗ "+x);} };

const APPS=[
  {f:"freelance-completo.html", retiro:"retiro"},
  {f:"Comisionista.html",       retiro:"retiro"},
  {f:"socio-comercial.html",    retiro:"retiro"},
  {f:"sistema-web.html",        retiro:"retiroBodega"},
];
for(const a of APPS){
  const s=L(a.f);
  ok(/FE02_COBRO_PEDIDO/.test(s), a.f+": ancla FE02_COBRO_PEDIDO");
  ok(/from\("zonas"\)/.test(s) && /\.eq\("activo",true\)/.test(s), a.f+": lee las zonas activas");
  ok(/from\("tarifas_fe"\)[\s\S]{0,120}\.eq\("ambito","zona"\)/.test(s), a.f+": lee la tarifa vigente por zona");
  ok(new RegExp("flete_cobro_qq: "+a.retiro+"\\?0:\\(Number\\(fleteCobroQq\\)\\|\\|0\\)").test(s), a.f+": manda flete_cobro_qq ($/qq; 0 en retiro)");
  ok(new RegExp("estibada_cobro_qq: "+a.retiro+"\\?0:\\(Number\\(estibadaCobroQq\\)\\|\\|0\\)").test(s), a.f+": manda estibada_cobro_qq ($/qq; 0 en retiro)");
  ok(/Base del pedido/.test(s) && /Total del pedido/.test(s), a.f+": muestra el desglose Base + Flete + Estibada = Total");
  ok(/zonaDeCiudadFE/.test(s), a.f+": resuelve la zona por la ciudad del cliente");
}

/* versión y caché de las apps tocadas */
ok(/const VERSION = \{ n:"464"/.test(L("freelance-completo.html")),"Freelance debe anunciar v464");
ok(/const VERSION = \{ n:"188"/.test(L("Comisionista.html")),"Comisionista debe anunciar v188");
ok(/const VERSION = \{ n:"56"/.test(L("socio-comercial.html")),"Socio debe anunciar v56");
ok(/const VERSION = \{ n:"180"/.test(L("sistema-web.html")),"Sistema Web debe anunciar b180");
ok(/const CACHE = "freelance-v275"/.test(sw),"la caché debe renovarse a v275");

if(m){console.error(`FE02-COBRO: ${b} ✓ · ${m} ✗`);process.exit(1);}
console.log(`FE02-COBRO: ${b} ✓ · 0 ✗`);
