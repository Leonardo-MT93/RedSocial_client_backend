//importar dependencias y modulos
const bcrypt = require("bcrypt");
const mongoosePagination = require("mongoose-pagination");
const fs = require("fs");
const path = require("path");
const followService = require("../services/followService");

// Importar modelos
const User = require("../models/user");
const Follow = require("../models/follow");
const Publication = require("../models/publication");

//Importar servicios
const jwt = require("../services/jwt");
const { findById } = require("../models/user");
const validate = require("../helpers/validate");

//Acciones de prueba
const pruebaUser = (req, res) => {
  return res.status(200).send({
    message: "Mensaje enviado desde: controllers/user.js",
    usuario: req.user,
  });
};
//Creamos el metodo de registro de usuarios


const register = (req, res) => {
  //Recoger datos de la peticion
  let params = req.body;
  //Comprobar que llegan bien los datos + validacion
  if (params.name && params.email && params.password && params.nick) {

    //VALIDACION AVANZADA 
    try{
      validate(params);
    }catch(error){
      return error(400).json({
        status: "error",
        message: "La validacion no ha podido ser superada",
      });
    }
    


    //Hacer un control de usuarios duplicados
    User.find({
      $or: [
        { email: params.email.toLowerCase() },
        { nick: params.nick.toLowerCase() },
      ],
    }).exec(async (error, users) => {
      if (error)
        return error(500).json({
          status: "error",
          message: "Error en la consulta de usuarios",
        });
      if (users && users.length >= 1) {
        return res.status(200).send({
          status: "success",
          message: "El usuario ya existe",
        });
      }
      //Cifrar la contraseña
      let pwd = await bcrypt.hash(params.password, 10);
      params.password = pwd;
      //   bcrypt.hash(params.password, 10, (error, pwd) => {
      //     params.password = pwd;
      //   });
      //Crear objeto de usuario
      let user_to_save = new User(params);
      //Guardar el usuario en la base de datos
      user_to_save.save((error, userStored) => {
        if (error || !userStored)
          return res
            .status(500)
            .send({ status: "error", message: "Error al guardar el usuario" });
        if (userStored) {
          //Devolver el resultado
          return res.status(200).json({
            status: "success",
            message: "Usuario registrado exitosamente",
            user: userStored,
          });
        }
      });
    });
  } else {
    return res.status(404).json({
      status: "error",
      message: "FALTAN DATOS POR ENVIAR.",
    });
  }
};

const login = (req, res) => {
  //Recoger los parametros del body que lleguen por la peticion
  let params = req.body;
  if (!params.email || !params.password) {
    return res.status(404).send({
      status: "error",
      message: "Faltan datos por enviar al autenticar",
    });
  }
  //Buscar en la base de datos si existe

  //Si quiero limitar los campos que recibo como respuesta puedo usar el .exec y antes de eso el .select. En este caso sacamos la contraseña colocando 0
  User.findOne({ email: params.email })
    // .select({ password: 0 })
    .exec((error, user) => {
      if (error || !user)
        return res
          .status(404)
          .send({ status: "error", message: "No existe el usuario." });
      //Comprobar su contraseña   ---   Recibe una contraseña y una contraseña hasheada
      const pwd = bcrypt.compareSync(params.password, user.password);
      if (!pwd) {
        return res.status(400).send({
          status: "error",
          message: "No te has identificado correctamente.",
        });
      }

      //Conseguir el Token
      const token = jwt.createToken(user);

      //Devolver Datos del usuario
      return res.status(200).send({
        status: "success",
        message: "Te has identificado correctamente",
        user: {
          id: user.id,
          name: user.name,
          nick: user.nick,
        },
        token,
      });
    });
};
const profile = (req, res) => {
  //Recibir el parámetro del ID de usuario por la URL
  const id = req.params.id;
  //Consulta para sacar losd atos del usuario
  //Se puede hacer la funcion asincrona
  User.findById(id)
    .select({ password: 0, role: 0 })
    .exec(async(error, userProfile) => {
      if (error || !userProfile) {
        return res.status(404).send({
          status: "error",
          message: "El usuario no existe o hay un error",
        });
      }
      //Info de seguimiento
      const followInfo = await followService.followThisUser(req.user.id, id);
      //Devolver el resultado
      return res.status(200).send({
        status: "success",
        user: userProfile,
        following: followInfo.following,
        follower: followInfo.followers
      });
    });
};
const list = (req, res) => {
  //Controlar en qué página estamos
  let page = 1;
  if (req.params.page) {
    page = req.params.page;
  }
  page = parseInt(page); //Siempre usar el parametro PAGE como un nuemro entero
  //Consulta con Mongoose paginate
  let itemsPerPage = 5;

  User.find()
  .select("-password -email -role -__v")
    .sort("_id")
    .paginate(page, itemsPerPage, async(error, users, total) => {
      //Devolver el resultado (Posteriormente lista de follows)
      if (error || !users) {
        return res.status(404).send({
          status: "error",
          message: "No hay usuarios disponibles",
          error,
        });
      }

      //Sacar un array de ids de los usuarios que me siguen y los que sigo como leon

      let followUserIds = await followService.followUserIds(req.user.id);
      return res.status(200).send({
        status: "success",
        users,
        page,
        itemsPerPage,
        total,
        pages: Math.ceil(total / itemsPerPage),
        user_following: followUserIds.following,
        user_follow_me: followUserIds.followers
      });
    });
};

const update = (req, res) => {
  //Recoger infod el usuario a actualizar
  let userIdentity = req.user;
  let userToUpdate = req.body;

  //Eliminar campos sobrantes
  delete userIdentity.iat;
  delete userIdentity.exp;
  delete userIdentity.role;
  delete userIdentity.image;

  //Comprobar si el usuario ya existe
  User.find({
    $or: [
      { email: userToUpdate.email.toLowerCase() },
      { nick: userToUpdate.nick.toLowerCase() },
    ],
  }).exec(async (error, users) => {
    if (error)
      return error(500).json({
        status: "error",
        message: "Error en la consulta de usuarios",
      });
    let userIsset = false;
    users.forEach((user) => {
      if (user && user._id != userIdentity.id) {
        userIsset = true;
      }
    });
    if (userIsset) {
      return res.status(200).send({
        status: "success",
        message: "El usuario ya existe",
      });
    }
    if (userToUpdate.password) {
      //Cifrar la contraseña
      let pwd = await bcrypt.hash(userToUpdate.password, 10);
      userToUpdate.password = pwd;
    }else{
      delete userToUpdate.password;
    }
    //Buscar y actualizar el usuario con la nueva actualziacion
    //Le paso el identificador del usuario a actualizar, objeto a actualizar y parametro de opciones
    try {
      let userUpdated = await User.findByIdAndUpdate(
        {_id: userIdentity.id},    // ESPECIFICAMOS BIEN EL ID PARA QUE NO HAYA ERRORES AL ACTUALIZAR AL USUARIO CORRESPONDIENTE
        userToUpdate,
        { new: true }
      );
      if (!userUpdated) {
        return error(500).json({
          status: "error",
          message: "Error al actualizar usuario",
        });
      }
    } catch (error) {
      return res.status(500).send({
        status: "error",
        message: "Error al actualizar",
      });
    }
    return res.status(500).send({
      status: "success",
      message: "Metodo de actualizar usuario",
      user: userToUpdate,
    });
  });
  //Si me llega la password lo que hago es cifrarla
};
const upload = (req, res) => {
  //Recoger el fichero de imagen y comprobar que existe
  if (!req.file) {
    return res.status(404).send({
      status: "error",
      message: "Peticion no incluye la imagen",
    });
  }
  //Conseguir el nombre del archivo
  let image = req.file.originalname;
  //Sacar la extension del archivo
  const imageSplit = image.split(".");
  const extension = imageSplit[1];
  console.log(image);
  //Comprobar la extension
  if (
    extension != "png" &&
    extension != "jpg" &&
    extension != "jpeg" &&
    extension != "gif"
  ) {
    const filePath = req.file.path; //Ubicacion del archivo
    //Libreria de NodeJS para manejar los archivos filesystem
    const fileDeleted = fs.unlinkSync(filePath); //Eliminar archivos de manera sincrona
    return res.status(400).send({
      status: "error",
      message: "Extension del fichero inválida.",
    });
  }

  //Si es correcta lo guardamos en la base de datos
  User.findOneAndUpdate(
    {_id: req.user.id},          // ESPECIFICAMOS BIEN EL ID PARA QUE NO HAYA ERRORES AL ACTUALIZAR AL USUARIO CORRESPONDIENTE
    { image: req.file.filename },
    { new: true },
    (error, userUpdated) => {
      if (error || !userUpdated) {
        return res.status(500).send({
          status: "error",
          message: "Error en la subida del avatar",
        });
      }
      //Devolver una respuesta
      return res.status(200).send({
        status: "success",
        user: userUpdated,
        file: req.file,
      });
    }
  );
};
const avatar = (req, res) => {

  //Sacar el parametro de la url
  const file = req.params.file;
  //Montar el path real de la imagen
  const filePath = "./uploads/avatars/"+file;
  //Comprobar que existe el archivo
  fs.stat(filePath, (error, exists) => {
    if(!exists) return res.status(404).send({status: "error", message: "No existe la imaagen"});
    //Si existe,devolvemos un file (METODO ESPECIAL DE EXPRESS) || USAMOS PATH PARA TENER UNA RUTA ABSOLUTA
    return res.sendFile(path.resolve(filePath))
  })
  
  
}

const counters = async (req, res) => {
  let userId = req.user.id;
  if(req.params.id){
    userId = req.params.id;
  }
  try{
    const following = await Follow.count({user: userId});
    const followed = await Follow.count({"followed": userId});
    const publications = await Publication.count({ user: userId});

    return res.status(200).send({
      userId,
      following : following,
      followed: followed,
      publications: publications
    });

  }catch(error){
    return res.status(500).send({
      status: "error",
      message: "Error en los contadores",
      error
    });
  }
}
//Exportar acciones
module.exports = {
  pruebaUser,
  register,
  login,
  profile,
  list,
  update,
  upload,
  avatar,
  counters
};
