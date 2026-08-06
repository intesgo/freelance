/* Dónde está cada cosa, sin rutas escritas a mano.
   Antes los arneses apuntaban a /tmp/... y solo corrían en la máquina donde
   se escribieron. Ahora se resuelven desde este archivo, así funcionan igual
   en tu computador y en el robot que publica. */
const fs = require("fs"), path = require("path");

const RAIZ = path.join(__dirname, "..");                 // el repo de las apps
const app  = (nombre) => path.join(RAIZ, nombre.endsWith(".html") ? nombre : nombre + ".html");

const umd = (paquete, archivo) =>
  fs.readFileSync(path.join(path.dirname(require.resolve(paquete + "/package.json")), "umd", archivo), "utf-8");

/* Las migraciones NO viven aquí: viven en el otro repositorio, el archivo del
   sistema (intesgo/Freelance-Sistema), que se clona al lado de este. Se
   resuelve desde este archivo por la misma razón que todo lo demás: para que
   ningún arnés lleve una ruta escrita a mano. Quien lo tenga en otro sitio lo
   dice con FREELANCE_MIGRACIONES y no toca ni una prueba. */
const MIGRACIONES = process.env.FREELANCE_MIGRACIONES ||
  path.join(RAIZ, "..", "Freelance-Sistema", "migraciones");
const migracion = (nombre) =>
  path.join(MIGRACIONES, nombre.endsWith(".sql") ? nombre : nombre + ".sql");

module.exports = {
  RAIZ, app, MIGRACIONES, migracion,
  Babel: require("@babel/standalone"),
  react:      () => umd("react", "react.production.min.js"),
  reactDom:   () => umd("react-dom", "react-dom.production.min.js"),
  reactDev:   () => umd("react", "react.development.js"),
  reactDomDev:() => umd("react-dom", "react-dom.development.js"),
};
