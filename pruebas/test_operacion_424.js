#!/usr/bin/env node
const fs=require("fs"),path=require("path");
const raiz=path.join(__dirname,"..");
const app=fs.readFileSync(path.join(raiz,"freelance-completo.html"),"utf8");
const web=fs.readFileSync(path.join(raiz,"sistema-web.html"),"utf8");
let bien=0,mal=0; const probar=(ok,msg)=>{if(ok)bien++;else{mal++;console.error("✗ "+msg);}};

probar(/ZONA_HORARIA_EC="America\/Guayaquil"/.test(app)&&/function hoyEC\(/.test(app),"Freelance debe usar fecha de Ecuador");
probar(/function hoyECWeb\(/.test(web),"Sistema Web debe usar fecha de Ecuador");
probar(!/new Date\(["']2026-|const HOY\s*=\s*["']2026|HOY_EC=["']2026/.test(app),"no debe haber una fecha operativa 2026 fijada en el código");
probar(!/new Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)/.test(app+web),"el día operativo no debe calcularse en UTC");
probar(/MODO_DEMO_ACTIVO/.test(app)&&/get\("demo"\)===\"1\"/.test(app),"los ejemplos deben requerir modo demo explícito");
probar(/MODO_DEMO_WEB/.test(web),"Sistema Web debe aislar el demo");
probar(/window\.indexedDB/.test(app)&&/COLA_STORE="operaciones"/.test(app),"la cola offline debe persistir en IndexedDB");
probar(/async function procesarColaPedidos/.test(app)&&/colaOfflineBorrar\(op\.id\)/.test(app),"solo debe retirar pedidos confirmados de la cola");
probar(/idempotencia/.test(app)&&/registrar_pedido_atomico/.test(app)&&/p_op_id:opId/.test(app),"los reintentos deben conservar la misma llave idempotente en la RPC transaccional");
probar(/addEventListener\("online",subir\)/.test(app),"la cola debe reintentarse al volver internet");
probar(/function registrarError\(/.test(app)&&/function registrarErrorWeb\(/.test(web),"los errores operativos deben quedar registrados");
probar(/registrarError\("pedido\.guardar"/.test(app)&&/registrarErrorWeb\("pedido\.guardar"/.test(web),"guardar pedidos no debe ocultar excepciones");

if(mal){console.error(`Resultado OPERACIÓN-424: ${bien} ✓ · ${mal} ✗`);process.exit(1);}
console.log(`Resultado OPERACIÓN-424: ${bien} ✓ · 0 ✗`);
