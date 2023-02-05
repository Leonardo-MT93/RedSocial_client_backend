//Importar modelo

const Follow = require("../models/follow");
const User = require("../models/user");

//Importar servicio

const followService = require("../services/followService");
//Importar dependencias

const mongoosePaginate = require("mongoose-pagination");

//Acciones de prueba
const pruebaFollow = (req, res) => {
  return res.status(200).send({
    message: "Mensaje enviado desde: controllers/user.js",
  });
};

//Accion de guardar un follow (accion de seguir)
const save = (req, res) => {
  //Conseguir datos por body
  const params = req.body;
  //Sacar ID del usuario identificado
  const identity = req.user;
  //Crear objeto con modelo FOLLOW
  let userToFollow = new Follow({
    user: identity.id,
    followed: params.followed,
  });
  //Guardar el objeto en base de datos
  userToFollow.save((error, followStored) => {
    if (error || !followStored) {
      return res.status(400).send({
        status: "error",
        message: "Nose ha podido seguir al usuario",
      });
    }
    return res.status(200).send({
      status: "success",
      identity: req.user,
      follow: followStored,
    });
  });
};

//Accion de borrar un follow (dejar de seguir)
const unfollow = (req, res) => {
  //Recoger el ID del usuario identificado
  const userId = req.user.id;
  //Recoger el id del usuario que sigo y quiero dejar de seguir
  const followedId = req.params.id;
  //Find de las coincidencias y hacer un REMOVE
  Follow.find({
    user: userId,
    followed: followedId,
  }).remove((error, followDeleted) => {
    if (error || !followDeleted) {
      return res.status(400).send({
        status: "error",
        message: "No has dejado de seguir a nadie",
      });
    }
    return res.status(200).send({
      status: "success",
      message: "Follow eliminado correctamente",
    });
  });
};
//Accion de listado de usuarios que cualquier usuario esta siguiendo (SIGUIENDO)
const following = (req, res) => {
  //Sacar el ID del usuario identificado
  let userId = req.user.id;

  //Comprobar si me llega el ID por parametro en url || TIENE PRIORIDAD
  if (req.params.id) userId = req.params.id;
  //Comprobar si me llega la pagina, sino será la página 1 || TIENE PRIORIDAD
  let page = 1;

  if (req.params.page) page = req.params.page;

  //Cuantos usuarios por página quiero mostrar
  const itemsPerPage = 5;
  //Hacemos un Find a follows, popular datos de los usuarios y paginar con MONGOOSE PAGINATION
  Follow.find({ user: userId })
    .populate("user followed", "-password -role -__v -email") // USAMOS LA FUNCION POPULATE PARA PODER VER EL CONTENIDO DE USER Y FOLLOWED MAS A DETALLE. Se puede filtrar los datos a mostrar
    .paginate(page, itemsPerPage, async (error, follows, total) => {
      //listado de usuarios de trinity, y soy leon. Quiero ver que usuarios de trinity me siguen a mi

      //Sacar un array de ids de los usuarios que me siguen y los que sigo como leon

      let followUserIds = await followService.followUserIds(req.user.id);

      return res.status(200).send({
        status: "success",
        message: "Listado de usuarios que estoy siguiendo",
        follows,
        total,
        pages: Math.ceil(total / itemsPerPage),
        user_following: followUserIds.following,
        user_follow_me: followUserIds.followers,
      });
    });
};
//Accion de listado de usuarios que siguen a cualquier otro usuario (SOY SEGUIDO)

const followers = (req, res) => {
  let userId = req.user.id;

  //Comprobar si me llega el ID por parametro en url || TIENE PRIORIDAD
  if (req.params.id) userId = req.params.id;
  //Comprobar si me llega la pagina, sino será la página 1 || TIENE PRIORIDAD
  let page = 1;

  if (req.params.page) page = req.params.page;

  //Cuantos usuarios por página quiero mostrar
  const itemsPerPage = 5;

  //Hacemos un Find a follows, popular datos de los usuarios y paginar con MONGOOSE PAGINATION
  Follow.find({ followed: userId })
    .populate("user", "-password -role -__v -email") // USAMOS LA FUNCION POPULATE PARA PODER VER EL CONTENIDO DE USER Y FOLLOWED MAS A DETALLE. Se puede filtrar los datos a mostrar
    .paginate(page, itemsPerPage, async (error, follows, total) => {
      let followUserIds = await followService.followUserIds(req.user.id);

      return res.status(200).send({
        status: "success",
        message: "Listado de usuarios que me siguen",
        follows,
        total,
        pages: Math.ceil(total / itemsPerPage),
        user_following: followUserIds.following,
        user_follow_me: followUserIds.followers,
      });
    });
};

//Exportar acciones
module.exports = {
  pruebaFollow,
  save,
  unfollow,
  following,
  followers,
};
