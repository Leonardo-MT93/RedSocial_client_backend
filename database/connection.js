const mongoose = require("mongoose");
const connection = async () => {
    try{
        await mongoose.connect("mongodb://0.0.0.0:27017/mi_redsocial");
        console.log("Conectado correctamente a BD: mi_redsocial");
    }catch(error){
        console.log(error);
        throw new Error("Nose ha podido conectar a la base de datos");
    }
}

module.exports = connection