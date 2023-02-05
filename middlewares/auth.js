//Importar modulos
const jwt = require("jwt-simple");
const moment = require("moment");

//Importar clave secreta
const libjwt = require("../services/jwt");
const secret = libjwt.secret;

//Middleware de autenticacion | next nos permite saltar a la siguiente accion con el middleware
exports.auth = (req, res, next) => {
  //Comprobar si me llega la cabecera de autenticacion
  
  if (!req.headers.authorization) {
    return res.status(403).send({
      status: "error",
      message: "La peticion no tiene la cabecera de autenticacion",
    });
  }
  // Limpíamos el token con la regex
  let token = req.headers.authorization.replace(/['"]+/g, "");
  console.log(req.headers.authorization)
  console.log(token);
  //Decodificarel token

  let payload = jwt.decode(token, secret);
  //Comprobar expiracion del token
  //Agregar datos de usuario a la request
req.user = payload;

  try {
    if (payload.exp <= moment().unix()) {
        return res.status(401).send({
          status: "error",
          message: "Token expirado",
        });
      }
  } 
  catch (error) {
    return res.status(404).send({
      status: "error",
      message: "Token inválido",
      error,
    });
  }
  
  //Pasar a la ejecucionn
  next();
};
