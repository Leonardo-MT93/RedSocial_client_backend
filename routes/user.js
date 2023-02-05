const express = require("express");
const router = express.Router();
const userController = require("../controllers/user");
const check = require("../middlewares/auth");
const multer = require("multer");

// Configuracion de subida - Donde van a subir y que nombre van a tener los archivos

const storage = multer.diskStorage({
    destination: (req, file, cb)=> {
        cb(null, "./uploads/avatars")
    },
    filename: (req, file, cb) => {
        cb(null, "avatar-"+Date.now()+"-"+file.originalname);
    }
})

const uploads = multer({storage}); //Middleware

//Definimos las rutas
router.get("/prueba-usuario",check.auth, userController.pruebaUser);
router.post("/register", userController.register);
router.post("/login", userController.login);
router.get("/profile/:id", check.auth, userController.profile); //Necesitamos autenticar con el token sino figura error.
router.get("/list/:page?", check.auth, userController.list); 
router.put("/update/", check.auth, userController.update);
router.post("/upload", [check.auth, uploads.single("file0")], userController.upload);
router.get("/avatar/:file", userController.avatar);
router.get("/counters/:id", check.auth, userController.counters);

//Exportar router 

module.exports = router;
