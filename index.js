//importar las dependencias
const connection = require("./database/connection");
const express = require("express");
const cors = require("cors");

//Mensaje de bienvenida
console.log("API NODE para RED SOCIAL inicializada!")
// CONEXION A BD
connection();
// CREAR SERVIDOR Node
const app = express();
const puerto = 3900; 
// CONFIGURAR EL cors
app.use(cors()); //la ejecutamos dentro de un middleware

// CONVERTIR LOS DATOS DEL BODY A OBJETOS JSON
app.use(express.json()); 
app.use(express.urlencoded({extended: true})); //Cualquier dato que llegue con el formato URLENCODED me lo decodifica a JSON

// CARGAR CONF RUTAS
const userRoutes = require("./routes/user");
const publicationRoutes = require("./routes/publication");
const followRoutes = require("./routes/follow");

app.use("/api/user", userRoutes);
app.use("/api/publication", publicationRoutes);
app.use("/api/follow", followRoutes);



app.get("/ruta-prueba", (req,res) => {
    return res.status(200).json(
        {
            "id": 1,
            "nombre": "Victor",
            "web": "victorroblesweb.es"
        }
    )
})

// PONER SERVIDOR A ESCUCHAR PETICIONES HTTP
app.listen(puerto, () => {
    console.log("Servidor de Node corriendo en el puerto: ", puerto)
});