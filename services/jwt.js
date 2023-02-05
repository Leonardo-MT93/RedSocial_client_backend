// Importar dependencias
const jwt = require("jwt-simple");
const moment = require("moment");

// Definir una clave secreta que la usamos para generar el Token - Seguridad extra
const secret = "leonino18";


// Crear una funcion para generar tokens

const createToken = (user)=>{
    const payload = {
        id: user._id,
        name: user.name,
        surname: user.surname,
        nick: user.nick,
        email: user.email,
        role: user.role,
        image: user.image,
        iat:moment().unix(),//Hace referencia al momento en el que creo el payload
        exp: moment().add(30, "days").unix()//  Fecha de expiracion del token - Fuera de ese rango el token deja de ser valido
    }
    // Voy a devolver un jwt token codificado

        return jwt.encode(payload, secret)
}

// **No usamos module exports ya que es solo una function, asique solo exportamos la funcion**

module.exports= {
    secret, 
    createToken
}