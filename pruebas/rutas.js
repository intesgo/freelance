/* Dónde está cada cosa, sin rutas escritas a mano.
   Antes los arneses apuntaban a /tmp/... y solo corrían en la máquina donde
   se escribieron. Ahora se resuelven desde este archivo, así funcionan igual
   en tu computador y en el robot que publica. */
const fs = require("fs"), path = require("path");

const RAIZ = path.join(__dirname, "..");                 // el repo de las apps
const app  = (nombre) => path.join(RAIZ, nombre.endsWith(".html") ? nombre : nombre + ".html");

const umd = (paquete, archivo) =>
  fs.readFileSync(path.join(path.dirname(require.resolve(paquete + "/package.json")), "umd", archivo), "utf-8");

module.exports = {
  RAIZ, app,
  Babel: require("@babel/standalone"),
  react:      () => umd("react", "react.production.min.js"),
  reactDom:   () => umd("react-dom", "react-dom.production.min.js"),
  reactDev:   () => umd("react", "react.development.js"),
  reactDomDev:() => umd("react-dom", "react-dom.development.js"),
};
