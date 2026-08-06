/* ═══════════════════════════════════════════════════════════════════════════
   LA REGLA DEL REGALO, CORRIDA DE VERDAD CONTRA UN PostgreSQL
   · migración PROMO-03 (todavía SIN APLICAR en producción)

   Por qué existe este arnés. La regla del regalo NO vive en JavaScript: vive
   en la base, en `gratis_que_concede` y `gratis_tope_al_despachar`, para que
   la app, el cerrojo del pedido y `facturar_pedido` digan siempre el mismo
   número. Una prueba que la copiara a JavaScript estaría midiendo la copia,
   no la regla, y el día que las dos se separen la prueba seguiría en verde.

   Así que esto levanta un PostgreSQL de juguete, le mete un esquema mínimo
   con la forma real de las tablas y le carga EL BLOQUE DE LA MIGRACIÓN TAL
   CUAL, leído del archivo entre sus dos marcadores. Si alguien cambia la
   regla en la migración, aquí se mide la regla nueva: no hay copia que se
   quede vieja.

   Lo que cubre: el exceso bloqueado con el número exacto · el despacho corto
   que recalcula en proporción · la promoción vencida y la inactiva, que no
   conceden nada · el producto sin promoción · la piladora ajena · lo demo
   contra lo real · y LAS PRESENTACIONES, que en este proyecto ya engañaron
   dos veces: la arroba (0,25 qq) y «10 libras» (0,1 qq), cuyo texto no dice
   nada de su equivalencia.

   NACE ROJA a propósito: se rompe la regla en el fuente de la migración, una
   rotura a la vez, y se comprueba que la prueba SE CAE. Hay DOS roturas
   TONTAS y directas (sumar 1 a la cantidad concedida, sumar 1 al techo del
   despacho) además de las semánticas.

   Si en esta máquina no hay un PostgreSQL, la prueba lo dice y no falla:
   no se puede exigir un servidor de base de datos en el teléfono de nadie.

   Uso: node test_regalo_sql.js
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require("fs"), os = require("os"), path = require("path");
const { execFileSync } = require("child_process");
const R = require("./rutas");

const MIGRACION = "20260806014500_promo03_el_regalo_no_pasa_de_lo_que_da_la_promocion.sql";

/* ── Cuántas comprobaciones se esperan. Declaradas ANTES de correr. ── */
const ESPERADAS = 34;
const MUTANTES_ESPERADOS = 9;

/* ══ 1 · ¿HAY UN PostgreSQL EN ESTA MÁQUINA? ══════════════════════════════ */
function binarios() {
  if (process.env.PG_BIN && fs.existsSync(path.join(process.env.PG_BIN, "initdb"))) return process.env.PG_BIN;
  const raiz = "/usr/lib/postgresql";
  if (fs.existsSync(raiz)) {
    const v = fs.readdirSync(raiz).sort().reverse();
    for (const x of v) { const b = path.join(raiz, x, "bin"); if (fs.existsSync(path.join(b, "initdb"))) return b; }
  }
  for (const b of ["/usr/bin", "/usr/local/bin", "/opt/homebrew/bin"])
    if (fs.existsSync(path.join(b, "initdb"))) return b;
  return null;
}

const BIN = binarios();
if (!BIN) {
  console.log("═══ La regla del regalo, contra PostgreSQL");
  console.log("  (·) no corre aquí: no hay un PostgreSQL instalado (falta `initdb`).");
  console.log("      La regla vive en la migración " + MIGRACION);
  console.log("      Para correrla: instalar postgresql, o apuntar PG_BIN a su carpeta bin.");
  console.log("Resultado de la regla del regalo: sin medir (no hay PostgreSQL)");
  process.exit(0);
}

/* PostgreSQL se niega a arrancar como root. Si esta sesión es root, todo se
   hace con el usuario `postgres`, que es el que trae el paquete. */
const ESROOT = typeof process.getuid === "function" && process.getuid() === 0;
let USUARIO = null;
if (ESROOT) {
  try { execFileSync("id", ["postgres"], { stdio:"ignore" }); USUARIO = "postgres"; }
  catch (e) {
    console.log("═══ La regla del regalo, contra PostgreSQL");
    console.log("  (·) no corre aquí: esta sesión es root y no existe el usuario `postgres`.");
    console.log("      PostgreSQL no arranca como root, a propósito.");
    console.log("Resultado de la regla del regalo: sin medir (no hay usuario para PostgreSQL)");
    process.exit(0);
  }
}

const CARPETA = fs.mkdtempSync(path.join(os.tmpdir(), "regalo-pg-"));
const DATOS = path.join(CARPETA, "datos");
const PUERTO = 49200 + Math.floor(Math.random() * 5000);

const comilla = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";
function sh(cmd, callado) {
  const entero = USUARIO ? "su " + USUARIO + " -c " + comilla(cmd) : cmd;
  return execFileSync("/bin/sh", ["-c", entero], { encoding:"utf-8", stdio: callado ? ["ignore","pipe","pipe"] : "pipe" });
}
const psql = (args) => sh([path.join(BIN,"psql"), "-h", CARPETA, "-p", PUERTO, "-U","postgres", args].join(" "));

/* ══ 2 · EL ESQUEMA MÍNIMO, con la forma REAL de las tablas ═══════════════
   Solo las columnas que la regla toca. Los CHECK que sí importan van tal cual
   los tiene producción: si la regla intentara guardar un regalo despachado
   mayor que el prometido, aquí también se caería. */
const ESQUEMA = `
create table presentaciones (
  pres_id text primary key, prod_id text, producto text,
  presentacion_cod text, presentacion text, equiv_qq numeric);
create table promociones (
  promo_id text primary key, org_id text not null default 'ORG-001',
  nombre text not null, modalidad text not null, origen text not null,
  prov_cod text, detalle text, base numeric,
  estado text not null default 'pendiente', motivo_resp text,
  vigente_desde date not null default ((now() at time zone 'America/Guayaquil')::date),
  vigente_hasta date, es_demo boolean not null default false,
  creado timestamptz not null default now(),
  prod_id text not null, pres_cod text,
  constraint promociones_estado_check check (estado in ('activa','pendiente','aprobada','rechazada','vencida','inactiva')),
  constraint promociones_modalidad_check check (modalidad in ('compra_lleva','descuento_volumen','descuento_factura')),
  constraint promociones_promo_id_modalidad_key unique (promo_id, modalidad));
create table promocion_tramos (
  tramo_id text primary key, promo_id text not null, modalidad text not null,
  desde_cant numeric not null, gratis_cant numeric, precio_unit numeric,
  desc_monto numeric, desc_pct numeric, es_demo boolean not null default false,
  creado timestamptz not null default now(),
  constraint promocion_tramos_desde_check check (desde_cant > 0),
  constraint promocion_tramos_promo_fkey foreign key (promo_id, modalidad)
    references promociones (promo_id, modalidad) on update cascade on delete cascade,
  constraint promocion_tramos_unico_escalon unique (promo_id, desde_cant));
create table pedidos (
  ped_id text primary key, org_id text not null default 'ORG-001', cli_id text not null,
  prov_cod text, estado text not null default 'ingresado',
  es_demo boolean not null default false);
create table pedido_items (
  item_id text primary key, ped_id text not null references pedidos(ped_id),
  prod_id text, descripcion text, cantidad_qq numeric not null, precio_usd numeric not null,
  tipo_precio text, gratis_qq numeric not null default 0, es_demo boolean not null default false,
  comision_usd numeric, despachado_qq numeric, gratis_despachado_qq numeric,
  constraint pedido_items_tipo_precio_check check (tipo_precio in ('P1','P2','P3','P4','P5','P6')),
  constraint pedido_items_gratis_despachado_check check
    (gratis_despachado_qq is null or (gratis_despachado_qq >= 0 and gratis_despachado_qq <= coalesce(gratis_qq,0))));
`;

/* ══ 3 · LA SIEMBRA · productos, presentaciones y promociones de prueba ════
   Las fechas se cuentan desde el día de ECUADOR, el mismo que mira la regla:
   con CURRENT_DATE a secas, entre las 19h y la medianoche de Guayaquil el
   servidor (en UTC) ya está en mañana y una promoción vencida seguiría viva. */
const SEMILLA = `
insert into presentaciones (pres_id, prod_id, producto, presentacion_cod, presentacion, equiv_qq) values
 ('PS1','P-QQ',  'Arroz Crecedor',      'QQ', 'Quintal',   1),
 ('PS2','P-QQ',  'Arroz Crecedor',      'ARR','Arroba',    0.25),
 ('PS3','P-QQ',  'Arroz Crecedor',      'L10','10 libras', 0.1),
 ('PS4','P-ARR', 'Arroz Rosa Elvira',   'ARR','Arroba',    0.25),
 ('PS5','P-ARR', 'Arroz Rosa Elvira',   'QQ', 'Quintal',   1),
 ('PS6','P-L10', 'Arroz Gustadina',     'L10','10 libras', 0.1),
 ('PS7','P-VENC','Arroz de temporada',  'QQ', 'Quintal',   1),
 ('PS8','P-INAC','Arroz por aprobar',   'QQ', 'Quintal',   1),
 ('PS9','P-NADA','Arroz sin promoción', 'QQ', 'Quintal',   1),
 ('PS10','P-PROV','Arroz de la piladora','QQ','Quintal',   1);

insert into promociones (promo_id,nombre,modalidad,origen,prov_cod,estado,vigente_desde,vigente_hasta,prod_id,pres_cod,es_demo) values
 ('PM-QQ',  'Compra 100 lleva 2',  'compra_lleva','freelance',null, 'activa',
   (now() at time zone 'America/Guayaquil')::date - 30, null, 'P-QQ','QQ',false),
 ('PM-ARR', 'Compra 40 arrobas lleva 4','compra_lleva','freelance',null,'activa',
   (now() at time zone 'America/Guayaquil')::date - 30, null, 'P-ARR','ARR',false),
 ('PM-L10', 'Compra 200 de 10 libras lleva 20','compra_lleva','freelance',null,'aprobada',
   (now() at time zone 'America/Guayaquil')::date - 30, null, 'P-L10','L10',false),
 ('PM-VENC','Se acabó anteayer',   'compra_lleva','freelance',null, 'activa',
   (now() at time zone 'America/Guayaquil')::date - 60,
   (now() at time zone 'America/Guayaquil')::date - 2, 'P-VENC','QQ',false),
 ('PM-INAC','Todavía no la aprueban','compra_lleva','freelance',null,'pendiente',
   (now() at time zone 'America/Guayaquil')::date - 30, null, 'P-INAC','QQ',false),
 ('PM-PROV','La paga la piladora', 'compra_lleva','proveedor','AGU','activa',
   (now() at time zone 'America/Guayaquil')::date - 30, null, 'P-PROV','QQ',false),
 ('PM-DEMO','De demostración',     'compra_lleva','freelance',null, 'activa',
   (now() at time zone 'America/Guayaquil')::date - 30, null, 'P-QQ','ARR',true);

insert into promocion_tramos (tramo_id,promo_id,modalidad,desde_cant,gratis_cant) values
 ('PT1','PM-QQ',  'compra_lleva',100, 2),
 ('PT2','PM-QQ',  'compra_lleva',500,15),
 ('PT3','PM-ARR', 'compra_lleva', 40, 4),
 ('PT4','PM-L10', 'compra_lleva',200,20),
 ('PT5','PM-VENC','compra_lleva',100, 2),
 ('PT6','PM-INAC','compra_lleva',100, 2),
 ('PT7','PM-PROV','compra_lleva', 50, 1),
 ('PT8','PM-DEMO','compra_lleva', 40, 4);

insert into pedidos (ped_id, cli_id, prov_cod) values ('PD-0001','CL-0001','AGU');
create table _r (clave text primary key, valor text);
`;

/* ══ 4 · LAS PREGUNTAS ════════════════════════════════════════════════════ */
const gq = (p, pres, prov, cant, demo) =>
  `public.gratis_que_concede(${p},${pres},${prov},${cant}${demo===undefined?"":","+demo})`;
const gt = (p, prov, cant, desp, gratis) =>
  `public.gratis_tope_al_despachar(${p},${prov},${cant},${desp},${gratis})`;

const PREGUNTAS = `
insert into _r values
 ('A01', ${gq("'P-QQ'","'QQ'","null",100)}::text),
 ('A02', ${gq("'P-QQ'","'QQ'","null",150)}::text),
 ('A03', ${gq("'P-QQ'","'QQ'","null",50)}::text),
 ('A04', ${gq("'P-QQ'","null","null",100)}::text),
 ('A05', ${gq("'P-QQ'","'QQ'","null",500)}::text),
 ('A06', ${gq("'P-QQ'","'QQ'","null",600)}::text),
 ('A07', ${gq("'P-NADA'","'QQ'","null",100)}::text),
 ('A08', ${gq("'P-VENC'","'QQ'","null",100)}::text),
 ('A09', ${gq("'P-INAC'","'QQ'","null",100)}::text),
 ('A10', ${gq("'P-ARR'","'ARR'","null",10)}::text),
 ('A11', ${gq("'P-ARR'","'ARR'","null",20)}::text),
 ('A12', ${gq("'P-ARR'","'QQ'","null",10)}::text),
 ('A13', ${gq("'P-L10'","'L10'","null",20)}::text),
 ('A14', ${gq("'P-L10'","'L10'","null",10)}::text),
 ('A15', ${gq("'P-PROV'","'QQ'","'AGU'",50)}::text),
 ('A16', ${gq("'P-PROV'","'QQ'","'ROS'",50)}::text),
 ('A17', ${gq("'P-QQ'","'ARR'","null",10,"false")}::text),
 ('A18', ${gq("'P-QQ'","'ARR'","null",10,"true")}::text),
 ('B01', ${gt("'P-QQ'","null",100,50,2)}::text),
 ('B02', ${gt("'P-QQ'","null",100,100,2)}::text),
 ('B03', ${gt("'P-QQ'","null",100,0,2)}::text),
 ('B04', ${gt("'P-NADA'","null",100,50,3)}::text),
 ('B05', ${gt("'P-QQ'","null",100,100,5)}::text),
 ('B06', ${gt("'P-QQ'","null",100,50,0)}::text),
 ('B07', ${gt("'P-QQ'","null",100,25,2)}::text);

/* El cerrojo, probado como se prueba de verdad: intentando guardar. */
do $prueba$
declare v text;
begin
  begin
    insert into pedido_items (item_id, ped_id, prod_id, descripcion, cantidad_qq, precio_usd, tipo_precio, gratis_qq)
    values ('I-EXC','PD-0001','P-QQ','Arroz Crecedor · Quintal',100,37,'P4',5);
    insert into _r values ('T01','SIN ERROR');
  exception when others then insert into _r values ('T01', sqlerrm); end;

  begin
    insert into pedido_items (item_id, ped_id, prod_id, descripcion, cantidad_qq, precio_usd, tipo_precio, gratis_qq)
    values ('I-OK','PD-0001','P-QQ','Arroz Crecedor · Quintal',100,37,'P4',2);
    insert into _r values ('T03','SIN ERROR');
  exception when others then insert into _r values ('T03', sqlerrm); end;

  begin
    insert into pedido_items (item_id, ped_id, prod_id, descripcion, cantidad_qq, precio_usd, tipo_precio, gratis_qq)
    values ('I-NADA','PD-0001','P-NADA','Arroz sin promoción · Quintal',100,37,'P4',1);
    insert into _r values ('T04','SIN ERROR');
  exception when others then insert into _r values ('T04', sqlerrm); end;

  begin
    insert into pedido_items (item_id, ped_id, prod_id, descripcion, cantidad_qq, precio_usd, tipo_precio, gratis_qq)
    values ('I-P3','PD-0001','P-NADA','Arroz sin promoción · Quintal',100,37,'P3',1);
    insert into _r values ('T05','SIN ERROR');
  exception when others then insert into _r values ('T05', sqlerrm); end;

  begin
    insert into pedido_items (item_id, ped_id, prod_id, descripcion, cantidad_qq, precio_usd, tipo_precio, gratis_qq)
    values ('I-SIN','PD-0001','P-NADA','Arroz sin promoción · Quintal',100,37,'P4',0);
    insert into _r values ('T08','SIN ERROR');
  exception when others then insert into _r values ('T08', sqlerrm); end;

  begin
    update pedido_items set gratis_qq = 5 where item_id = 'I-OK';
    insert into _r values ('T06','SIN ERROR');
  exception when others then insert into _r values ('T06', sqlerrm); end;

  /* Y lo que NO se puede bloquear: la piladora facturando un pedido viejo
     cuya promoción ya se venció. Si esto se cae, la piladora se queda con la
     mercadería en el camión y sin poder emitir la factura. */
  update promociones set vigente_hasta = (now() at time zone 'America/Guayaquil')::date - 1
   where promo_id = 'PM-QQ';
  begin
    update pedido_items set despachado_qq = 50, gratis_despachado_qq = 1 where item_id = 'I-OK';
    insert into _r values ('T07','SIN ERROR');
  exception when others then insert into _r values ('T07', sqlerrm); end;
end $prueba$;

select clave || '|' || coalesce(valor, '<null>') from _r order by clave;
`;

/* ══ 5 · ARRANQUE Y APAGADO DEL SERVIDOR DE JUGUETE ═══════════════════════ */
function arrancar() {
  if (USUARIO) execFileSync("chown", ["-R", USUARIO + ":" + USUARIO, CARPETA]);
  fs.chmodSync(CARPETA, 0o755);
  sh([path.join(BIN,"initdb"), "-D", DATOS, "-U", "postgres", "-A", "trust"].join(" "), true);
  sh([path.join(BIN,"pg_ctl"), "-D", DATOS, "-o", comilla("-p " + PUERTO + " -k " + CARPETA + " -c listen_addresses=''"),
      "-l", path.join(CARPETA,"registro.log"), "-w", "start"].join(" "), true);
}
function apagar() {
  try { sh([path.join(BIN,"pg_ctl"), "-D", DATOS, "-m", "immediate", "stop"].join(" "), true); } catch (e) {}
  try { fs.rmSync(CARPETA, { recursive:true, force:true }); } catch (e) {}
}

/* Corre el bloque de regla que se le pase y devuelve el mapa clave → valor. */
function correrRegla(regla) {
  const f = (n, txt) => { const p = path.join(CARPETA, n); fs.writeFileSync(p, txt); fs.chmodSync(p, 0o644); return p; };
  const pReg = f("regla.sql", regla);
  const pEsq = f("esquema.sql", ESQUEMA);
  const pSem = f("semilla.sql", SEMILLA);
  const pPre = f("preguntas.sql", PREGUNTAS);
  sh([path.join(BIN,"dropdb"), "-h", CARPETA, "-p", PUERTO, "-U","postgres", "--if-exists", "regalo"].join(" "), true);
  sh([path.join(BIN,"createdb"), "-h", CARPETA, "-p", PUERTO, "-U","postgres", "regalo"].join(" "), true);
  const salida = psql(["-d","regalo","-q","-At","-v","ON_ERROR_STOP=1","-f",pEsq,"-f",pReg,"-f",pSem,"-f",pPre].join(" "));
  const mapa = {};
  for (const linea of salida.split("\n")) {
    const i = linea.indexOf("|");
    if (i > 0) mapa[linea.slice(0, i)] = linea.slice(i + 1);
  }
  return mapa;
}

/* ══ 6 · LA BATERÍA ══════════════════════════════════════════════════════ */
function bateria(regla, ruidoso) {
  let ok = 0, mal = 0; const fallos = [];
  const comprobar = (t, c) => {
    if (c) { ok++; if (ruidoso) console.log("  ✓ " + t); }
    else   { mal++; fallos.push(t); if (ruidoso) console.log("  ✗ " + t); }
  };
  let r;
  try { r = correrRegla(regla); }
  catch (e) { return { ok:0, mal:1, fallos:["la regla no carga: " + String(e.message||e).split("\n").slice(-3).join(" ")] }; }

  const num = (k) => (r[k] === "<null>" || r[k] === undefined) ? null : Number(r[k]);
  const txt = (k) => String(r[k] === undefined ? "" : r[k]);

  /* ── Lo que concede la promoción ── */
  comprobar("«compra 100 lleva 2» por 100 qq concede 2 qq", num("A01") === 2);
  comprobar("por 150 qq concede 3 qq: la proporción manda, no el escalón pelado", num("A02") === 3);
  comprobar("por 50 qq concede 0: hay promoción, pero no se llega al primer escalón", num("A03") === 0);
  comprobar("sin decir la presentación se mira igual la promoción del producto", num("A04") === 2);
  comprobar("segundo escalón: por 500 qq concede 15 qq, no 10", num("A05") === 15);
  comprobar("y por 600 qq, 18 qq: el escalón que manda es el de 500", num("A06") === 18);
  comprobar("PRODUCTO SIN PROMOCIÓN: no concede nada (null, que no es cero)", r["A07"] === "<null>");
  comprobar("PROMOCIÓN VENCIDA: no concede nada", r["A08"] === "<null>");
  comprobar("PROMOCIÓN INACTIVA (pendiente de aprobar): no concede nada", r["A09"] === "<null>");

  /* ── Las presentaciones, la trampa de la casa ── */
  comprobar("ARROBA (0,25 qq): «compra 40 arrobas lleva 4» sobre 10 qq concede 1 qq",
    num("A10") === 1);
  comprobar("ARROBA: sobre 20 qq concede 2 qq (y NO 0, que es lo que da tratar la arroba como quintal)",
    num("A11") === 2);
  comprobar("una promoción en ARROBAS no concede al que compra en QUINTALES: son otra unidad",
    r["A12"] === "<null>");
  comprobar("«10 LIBRAS» (0,1 qq): sobre 20 qq concede 2 qq; el texto no dice su equivalencia y no se adivina",
    num("A13") === 2);
  comprobar("«10 libras»: sobre 10 qq (100 unidades) concede 0: no llega al escalón de 200",
    num("A14") === 0);

  /* ── De quién es la promoción ── */
  comprobar("promoción de la piladora AGU: a un pedido de AGU sí le concede", num("A15") === 1);
  comprobar("y a un pedido de OTRA piladora no le concede nada", r["A16"] === "<null>");
  comprobar("una promoción de DEMOSTRACIÓN no le concede nada a un pedido real", r["A17"] === "<null>");
  comprobar("y a uno de demostración sí: lo demo y lo real no se mezclan en ningún sentido",
    num("A18") === 1);

  /* ── El despacho corto ── */
  comprobar("DESPACHO CORTO: «compra 100 lleva 2» con 50 qq despachados deja el regalo en 1 qq",
    num("B01") === 1);
  comprobar("despacho completo: el regalo queda en los 2 qq prometidos", num("B02") === 2);
  comprobar("no salió ni un quintal: no se regala nada", num("B03") === 0);
  comprobar("sin promoción detrás (el regalo del vendedor): baja en la misma proporción, 3 qq × 50/100 = 1,5",
    num("B04") === 1.5);
  comprobar("línea vieja con el regalo inflado (5 qq donde la promo daba 2): al facturar se topa en 2",
    num("B05") === 2);
  comprobar("línea sin regalo: sigue sin regalo", num("B06") === 0);
  comprobar("despacho de la cuarta parte: el regalo queda en 0,50 qq", num("B07") === 0.5);

  /* ── El cerrojo del pedido ── */
  comprobar("REGALO DE MÁS (5 qq donde la promoción da 2): la línea NO se guarda",
    /REGALO DE MÁS/.test(txt("T01")));
  comprobar("y el mensaje dice el número exacto que sí concede: 2,00 qq",
    /2\.00/.test(txt("T01")));
  comprobar("y está escrito para un vendedor, no para un programador",
    /Baja el regalo/.test(txt("T01")) && !/gratis_qq|null|column|relation/i.test(txt("T01")));
  comprobar("el regalo justo (2 qq de 2) sí se guarda", txt("T03") === "SIN ERROR");
  comprobar("PRODUCTO SIN PROMOCIÓN con regalo: no se guarda y se dice por qué",
    /REGALO SIN PROMOCIÓN/.test(txt("T04")));
  comprobar("P3 «Promoción vendedor» sigue pudiendo regalar: la paga él con su comisión",
    txt("T05") === "SIN ERROR");
  comprobar("línea sin regalo en producto sin promoción: no se estorba a nadie",
    txt("T08") === "SIN ERROR");
  comprobar("subir el regalo por UPDATE también se bloquea: el cerrojo no es solo al nacer",
    /REGALO DE MÁS/.test(txt("T06")));
  comprobar("y facturar un pedido viejo con la promoción YA VENCIDA no se bloquea: " +
            "el cerrojo no puede dejar a la piladora sin poder facturar",
    txt("T07") === "SIN ERROR");

  return { ok, mal, fallos };
}

/* ══ 7 · LAS ROTURAS A PROPÓSITO ═════════════════════════════════════════ */
const MUTANTES = [
  /* tontas y directas: si estas no tumban la prueba, la prueba no mide nada */
  ["TONTA · le suma 1 a la cantidad concedida",
   `    select round(round((u.unidades / t.desde_cant) * t.gratis_cant, 2) * v.equiv, 2) as qq`,
   `    select round(round((u.unidades / t.desde_cant) * t.gratis_cant, 2) * v.equiv, 2) + 1 as qq`],
  ["TONTA · le suma 1 al techo del despacho corto",
   `  return round(v_prom * v_desp / v_cant, 2);`,
   `  return round(v_prom * v_desp / v_cant, 2) + 1;`],
  /* la trampa de las presentaciones */
  ["la equivalencia se da por sentada en 1 qq (el texto «10 libras» vuelve a mentir)",
   `           case when p.pres_cod is null then 1::numeric`,
   `           case when true then 1::numeric`],
  /* la vigencia y el estado */
  ["las promociones VENCIDAS vuelven a conceder",
   `       and (p.vigente_hasta is null or p.vigente_hasta >= hoy.d)`,
   `       and true`],
  ["las promociones que nadie aprobó vuelven a conceder",
   `       and p.estado in ('activa','aprobada')`,
   `       and p.estado is not null`],
  /* de quién es la promoción */
  ["la promoción de una piladora se la come otra piladora",
   `       and (p.prov_cod is null or p_prov_cod is null or p.prov_cod = p_prov_cod)`,
   `       and true`],
  /* el despacho corto deja de recalcular */
  ["el despacho corto deja de recalcular: se regala lo prometido igual",
   `  if v_cant <= 0 or v_desp >= v_cant then return v_prom; end if;`,
   `  return v_prom;`],
  /* el cerrojo deja de cerrar */
  ["el regalo de más deja de bloquearse",
   `  if new.gratis_qq > v_conc + 0.005 then`,
   `  if false then`],
  ["P3 deja de estar exento y al vendedor se le bloquea su propia promoción",
   `  if coalesce(new.tipo_precio,'') = 'P3' then`,
   `  if false then`],
];

/* ══ 8 · A CORRER ════════════════════════════════════════════════════════ */
(function () {
  console.log("═══ La regla del regalo, corrida contra PostgreSQL · " + MIGRACION);
  console.log("    Comprobaciones esperadas: " + ESPERADAS + " · mutantes esperados: " + MUTANTES_ESPERADOS);

  const archivo = R.migracion(MIGRACION);
  if (!fs.existsSync(archivo)) {
    console.log("  ✗ no está la migración en " + archivo);
    console.log("    (vive en el repositorio intesgo/Freelance-Sistema; si lo tienes en otro sitio, usa FREELANCE_MIGRACIONES)");
    console.log("Resultado de la regla del regalo: 0 ✓ · 1 ✗");
    process.exit(1);
  }
  const entero = fs.readFileSync(archivo, "utf-8");
  const m = entero.match(/-- ══ INICIO REGLA REGALO ══([\s\S]*?)-- ══ FIN REGLA REGALO ══/);
  if (!m) {
    console.log("  ✗ la migración no trae los marcadores «INICIO REGLA REGALO» / «FIN REGLA REGALO»");
    console.log("Resultado de la regla del regalo: 0 ✓ · 1 ✗");
    process.exit(1);
  }
  const REGLA = m[1];

  let ok = 0, mal = 0;
  try {
    arrancar();

    const r = bateria(REGLA, true);
    ok = r.ok; mal = r.mal;

    if (ok + mal !== ESPERADAS) {
      mal++;
      console.log("  ✗ AVISO: se declararon " + ESPERADAS + " comprobaciones y corrieron " +
        (ok + mal - 1) + ". Alguna se perdió o se agregó sin declararla.");
    }

    console.log("  · rompiendo la regla a propósito (la prueba debe caerse):");
    if (MUTANTES.length !== MUTANTES_ESPERADOS) {
      mal++;
      console.log("  ✗ AVISO: se declararon " + MUTANTES_ESPERADOS + " mutantes y hay " + MUTANTES.length + ".");
    }
    for (const [nombre, dee, a] of MUTANTES) {
      const veces = REGLA.split(dee).length - 1;
      if (veces !== 1) {
        mal++;
        console.log(`  ✗ el mutante «${nombre}» no se pudo aplicar: el trozo aparece ${veces} veces`);
        continue;
      }
      let res;
      try { res = bateria(REGLA.replace(dee, a), false); }
      catch (e) { res = { mal:1, fallos:["reventó: " + e.message] }; }
      if (res.mal > 0) {
        ok++;
        console.log(`  ✓ «${nombre}» → la prueba se cae (${res.mal} fallo(s): ${res.fallos.slice(0,2).join(" · ")})`);
      } else {
        mal++;
        console.log(`  ✗ «${nombre}» → la prueba PASA IGUAL: no está midiendo nada`);
      }
    }
  } finally {
    apagar();
  }

  console.log("Resultado de la regla del regalo: " + ok + " ✓ · " + mal + " ✗");
  process.exit(mal ? 1 : 0);
})();
