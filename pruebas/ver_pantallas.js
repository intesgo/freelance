/* ═══════════════════════════════════════════════════════════════════════
   VISOR DE PANTALLAS · abre una app en un navegador de verdad, tamaño
   celular, la recorre sola y guarda una captura de cada pantalla.

   Para qué: hasta ahora la revisión visual la hacía Richard a mano, mandando
   fotos desde el teléfono. Esto la hace antes de publicar. Los arneses de
   jsdom comprueban que el código no revienta; esto comprueba cómo se VE.

   Además avisa de tres cosas que jsdom no puede ver:
     · pantallas que quedan en blanco al tocar un botón,
     · errores de JavaScript que salen en la consola del navegador,
     · textos que se salen de la pantalla a lo ancho (412 px de celular).

   Uso:  node ver_pantallas.js <archivo-o-url> [carpeta-destino]
   Sale con código 1 si alguna pantalla queda vacía o hay error de página.
   ═══════════════════════════════════════════════════════════════════════ */
const fs=require("fs"), path=require("path");
const { chromium } = require("playwright");

const destinoBase = process.argv[3] || "/tmp/capturas";
const origen = process.argv[2];
const nombreApp = origen.split("/").pop().replace(".html","");

const limpio = (s)=> String(s||"").replace(/[^A-Za-z0-9ÁÉÍÓÚáéíóúÑñ ]/g,"").trim().replace(/\s+/g,"-") || "pantalla";

(async ()=>{
  const dir = path.join(destinoBase, nombreApp);
  fs.mkdirSync(dir, { recursive:true });

  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport:{width:412,height:915},
    isMobile:true, hasTouch:true });
  const pag = await ctx.newPage();

  /* Los recursos que vienen de internet no cargan en el entorno de pruebas.
     Eso no es un fallo de la app: se apartan y se cuentan por separado. */
  const errores=[], sinRed=[];
  pag.on("pageerror", e=>errores.push(String(e.message).split("\n")[0]));
  pag.on("console", m=>{ if(m.type()!=="error") return;
    const t=m.text();
    if(/ERR_|Failed to load resource|net::/.test(t)) sinRed.push(t.slice(0,80));
    else errores.push("consola: "+t.slice(0,140)); });

  await pag.goto(origen, { waitUntil:"domcontentloaded", timeout:60000 });
  await pag.waitForTimeout(2500);

  const fotos=[];
  const foto = async (etiqueta)=>{
    const archivo = String(fotos.length).padStart(2,"0")+"-"+limpio(etiqueta)+".png";
    await pag.screenshot({ path: path.join(dir, archivo) });
    fotos.push({ archivo, etiqueta });
    return archivo;
  };

  await foto("entrada");

  /* ── Entrar ────────────────────────────────────────────────────────────
     Desde la b367 las apps publicadas NO tienen ingreso propio: se entra por
     el portal. Para poder recorrerlas, la copia local usa un doble de pruebas
     de supabase-js que finge una sesión válida (libs/supabase.js), así que lo
     normal es estar dentro ya. El bloque de usuario y clave queda como
     respaldo para una app que todavía lo pida.
     OJO: no tocar botones de "entrar" cuando ya se entró — en el transportista
     eso apretaba "Ingresar con otro usuario" y cerraba la sesión. */
  const dentro = async ()=>{
    const t = await pag.evaluate(()=>document.body.innerText||"").catch(()=>"");
    return t.length > 40 && t.indexOf("Ir al portal") < 0 && t.indexOf("Un momento") < 0;
  };
  await pag.waitForFunction(()=>{
    const t = document.body.innerText || "";
    return t.length > 40 && t.indexOf("Un momento") < 0;
  }, { timeout:30000 }).catch(()=>{});

  let usuario = "(sesión)";
  if(!(await dentro())){
    const pie = await pag.$('text=/Demostraci[oó]n/');
    let clave = "1234"; usuario = "VENDEDOR";
    if(pie){
      const linea = (await pie.textContent() || "").trim();
      const cred = linea.match(/([A-Za-z0-9_.-]+)\s*\/\s*([A-Za-z0-9_.-]+)/);
      if(cred){ usuario = cred[1]; clave = cred[2]; }
    }
    const enlace = await pag.$('text=/usuario y\s*clave/i');
    if(enlace){ await enlace.click(); await pag.waitForTimeout(700); }
    const entradas = await pag.$$("input:not([type=checkbox]):not([type=radio])");
    if(entradas[0]) await entradas[0].fill(usuario);
    if(entradas[1]) await entradas[1].fill(clave);
    await pag.waitForTimeout(300);
    for(const b of await pag.$$("button")){
      const t=(await b.textContent()||"").trim();
      if(/entrar|ingresar/i.test(t) && !/huella|otro usuario/i.test(t)){ await b.click(); break; }
    }
  }

  const entro = await Promise.race([
    pag.waitForSelector(".nav button", { timeout:25000 }).then(()=>true).catch(()=>false),
    pag.waitForFunction(()=>{
      const t = document.body.innerText || "";
      return t.length > 40 && t.indexOf("Ir al portal") < 0 && t.indexOf("Un momento") < 0;
    }, { timeout:25000 }).then(()=>true).catch(()=>false),
  ]);
  if(!entro){
    console.log("✗ "+nombreApp+": no se pudo entrar. Mira la captura de entrada.");
    await foto("no-entro");
    await nav.close();
    process.exit(1);
  }
  await pag.waitForTimeout(1200);
  await foto("Inicio");

  /* ── Recorrer los botones de la barra ─────────────────────────────────── */
  const vacias=[], anchas=[];
  const revisar = async (etiqueta)=>{
    /* innerText = lo que de verdad se ve; textContent incluiría el código */
    const cuerpo = await pag.evaluate(()=>(document.body.innerText||"").trim()).catch(()=>"");
    if(cuerpo.length < 60) vacias.push(etiqueta);
    /* algo más ancho que la pantalla obliga a desplazar en horizontal */
    const desborde = await pag.evaluate(()=>{
      const w = document.documentElement.clientWidth;
      let peor = 0, quien = "";
      for(const el of document.querySelectorAll("body *")){
        const r = el.getBoundingClientRect();
        if(r.width && r.right - w > peor){ peor = Math.round(r.right - w); quien = (el.textContent||"").trim().slice(0,40); }
      }
      return peor > 8 ? { peor, quien } : null;
    }).catch(()=>null);
    if(desborde) anchas.push(etiqueta+" (+"+desborde.peor+"px en “"+desborde.quien+"”)");
    return cuerpo.length;
  };

  const primeros = await pag.$$(".nav button");
  const nombres = [];
  for(const b of primeros) nombres.push(((await b.textContent())||"").replace(/[0-9]/g,"").trim());

  console.log("═══ "+nombreApp+"  ·  entró "+(usuario==="(sesión)" ? "con la sesión" : "con usuario "+usuario));
  if(!nombres.length) console.log("  (·) esta app no tiene barra inferior: se captura solo el inicio");
  for(let i=0;i<nombres.length;i++){
    const bs = await pag.$$(".nav button");
    if(!bs[i]) break;
    await bs[i].click().catch(()=>{});
    await pag.waitForTimeout(1400);
    const largo = await revisar(nombres[i]);
    await foto(nombres[i]);
    console.log((largo>=60?"  ✓ ":"  ✗ ")+nombres[i]+"  ("+largo+" caracteres a la vista)"+(largo<60?"  ← PANTALLA EN BLANCO":""));
  }

  /* ── El menú lateral, si lo tiene ─────────────────────────────────────── */
  try{
    let menu = await pag.$('button[aria-label*="men" i]');
    if(!menu){
      for(const b of await pag.$$("button")){
        const t = (await b.textContent()) || "";
        if(t.trim()==="☰" || /^\s*☰/.test(t)){ menu = b; break; }
      }
    }
    if(menu){
      await menu.click({ timeout:3000 });
      await pag.waitForTimeout(900);
      await foto("Menu");
      console.log("  ✓ Menú lateral");
    }
  }catch(e){}

  /* ── Hoja de contactos para verlo todo de un vistazo ──────────────────── */
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Pantallas · ${nombreApp}</title>
<style>body{font-family:system-ui,sans-serif;background:#F3F1EC;color:#243B2E;margin:0;padding:22px}
h1{font-size:20px;margin:0 0 4px} p{color:#6B7280;margin:0 0 18px;font-size:13px}
.rejilla{display:flex;flex-wrap:wrap;gap:18px}
figure{margin:0;background:#fff;border:1px solid #DDE3DC;border-radius:14px;padding:10px;width:230px}
img{width:100%;border-radius:8px;display:block;border:1px solid #EEE}
figcaption{font-size:12.5px;font-weight:600;margin-top:8px;text-align:center}</style></head><body>
<h1>${nombreApp}</h1><p>Recorrido automático en pantalla de celular (412 px). ${fotos.length} capturas.</p>
<div class="rejilla">
${fotos.map(f=>`<figure><img src="${f.archivo}" alt="${f.etiqueta}"><figcaption>${f.etiqueta}</figcaption></figure>`).join("\n")}
</div></body></html>`;
  fs.writeFileSync(path.join(dir,"index.html"), html);

  console.log("  → "+fotos.length+" capturas en "+dir);
  if(anchas.length) console.log("  ⚠ se sale del ancho: "+anchas.join(" · "));
  if(errores.length) console.log("  ⚠ errores de la app:\n     - "+[...new Set(errores)].join("\n     - "));
  if(sinRed.length) console.log("  (·) "+sinRed.length+" recursos de internet no cargaron: es el entorno de pruebas, no la app");

  await nav.close();
  process.exit((vacias.length || errores.length) ? 1 : 0);
})().catch(e=>{ console.log("✗ "+String(e&&e.message||e).split("\n")[0]); process.exit(1); });
