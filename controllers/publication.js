//Importar modulos

const fs = require("fs");
const path = require("path");

//Importar modelos
const Publication = require("../models/publication");

//Importar servicios

const followService = require("../services/followService");

//Acciones de prueba
const pruebaPublication = (req, res) => {
  return res.status(200).send({
    message: "Mensaje enviado desde: controllers/publication.js",
  });
};

//Guardar publicaciones
const save = (req, res) => {
  //Recoger los datos del body
  const params = req.body;

  //Si no me llegan damos una respuesta negativa
  if (!params.text)
    return res
      .status(400)
      .send({ status: "error", message: "Debes enviar un texto" });
  //Crear y rellenar el objeto del modelo
  let newPublication = new Publication(params);
  newPublication.user = req.user.id;
  //Guardar objeto en la base de datos
  newPublication.save((error, publicationStored) => {
    if (error || !publicationStored) {
      return res
        .status(400)
        .send({ status: "error", message: "No se ha guardado la publicacion" });
    }
    //Devolver una respuesta
    return res.status(200).send({
      status: "success",
      message: "Publicacion guardada",
      publicationStored,
    });
  });
};
//Sacar una publicacion en concreto
const detail = (req, res) => {
  //Sacar el id de la publicacion de la URL
  const publicationId = req.params.id;
  //Hacemos un FIND con la condicion del id
  Publication.findById(publicationId, (error, publicationStored) => {
    if (error || !publicationStored) {
      return res.status(404).send({
        status: "error",
        message: "No existe la publicacion",
      });
    }

    //Devolver una respuesta
    return res.status(200).send({
      status: "success",
      message: "Mostrar publicacion",
      publicationStored,
    });
  });
};
//Eliminar publicaciones

const remove = (req, res) => {
  //Sacar el ID de la publicacion a eliminar
  const publicationId = req.params.id;
  //Hacer un find
  //TIENE QUE SER ELIMNADA POR EL MISMO USUARIO QUE LA CREO, Y DEBE CORRRESPONDER AL MISMO TOKEN
  Publication.find({ user: req.user.id, _id: publicationId }).remove(
    (error) => {
      if (error) {
        return res.status(500).send({
          status: "error",
          message: "No se ha eliminado la publicacion",
        });
      }
      return res.status(200).send({
        status: "success",
        message: "Eliminar publicacion",
        publication: publicationId,
      });
    }
  );
};
//Listar publicaciones de un usuario concreto
const user = (req, res) => {
  //Sacar el ID del usuario
  const userId = req.params.id;
  //Controlar la página
  let page = 1;

  if (req.params.page) {
    page = req.params.page;
  }
  const itemsPerPage = 5;
  //Find, populate, ordenar, paginar
  Publication.find({ user: userId })
    .sort("-created_at")
    .populate("user", "-password -__v -role -email")
    .paginate(page, itemsPerPage, (error, publications, total) => {
      if (error || publications.length <= 0 || !publications) {
        return res.status(400).send({
          status: "error",
          message: "No hay publicaciones para mostrar",
        });
      }
      //Devolver un resultado
      return res.status(200).send({
        status: "success",
        message: "Publicacion de un perfil de un usuario",
        page,
        total,
        pages: Math.ceil(total / itemsPerPage),
        publications,
      });
    });
};

//Subir ficheros
const upload = (req, res) => {
  //Sacar publicationID

  const publicationId = req.params.id;
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
  Publication.findOneAndUpdate(
    { user: req.user.id, _id: publicationId }, // ESPECIFICAMOS BIEN EL ID PARA QUE NO HAYA ERRORES AL ACTUALIZAR AL USUARIO CORRESPONDIENTE
    { file: req.file.filename },
    { new: true },
    (error, publicationUpdated) => {
      if (error || !publicationUpdated) {
        return res.status(500).send({
          status: "error",
          message: "Error en la subida del avatar",
        });
      }
      //Devolver una respuesta
      return res.status(200).send({
        status: "success",
        publication: publicationUpdated,
        file: req.file,
      });
    }
  );
};
//Devolver archivos multimedia (imagenes)
const media = (req, res) => {
  //Sacar el parametro de la url
  const file = req.params.file;
  //Montar el path real de la imagen
  const filePath = "./uploads/publications/" + file;
  //Comprobar que existe el archivo
  fs.stat(filePath, (error, exists) => {
    if (!exists)
      return res
        .status(404)
        .send({ status: "error", message: "No existe la imaagen" });
    //Si existe,devolvemos un file (METODO ESPECIAL DE EXPRESS) || USAMOS PATH PARA TENER UNA RUTA ABSOLUTA
    return res.sendFile(path.resolve(filePath));
  });
};

//Listar todas las publicaciones (FEED)
const feed = async (req, res) => {
  //Sacar la pagina actual
  let page = 1;

  if (req.params.page) {
    page = req.params.page;
  }
  //Establecer el numero de elementos que se muestra en la pagina
  let itemsPerPage = 5;

  //Sacar un array de identificadores de usuarios que yo sigo como usuario IDENTIFICADO
  try {
    const myFollows = await followService.followUserIds(req.user.id);
    //Find a publicaciones - OPERADOR "in", Ordenar, Popular el campo de usuario y Paginar

    const publications =  Publication.find({
      user: myFollows.following,
    })
      .populate("user", "-password -role -__v -email")
      .sort("-created_at")
      .paginate(page, itemsPerPage, (error, publications, total) => {
        if(error || !publications){
            return res.status(500).send({
                status: "error",
                message: "No hay publicaciones para mostrar",
              });
        }
        return res.status(200).send({
          status: "success",
          message: "Feed de publicaciones",
          following: myFollows.following,
          total,
          page,
          pages: Math.ceil(total / itemsPerPage),
          publications,
        });
      });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "No se han listado las publicaciones del feed",
    });
  }
};

//Exportar acciones
module.exports = {
  pruebaPublication,
  save,
  detail,
  remove,
  user,
  upload,
  media,
  feed,
};
