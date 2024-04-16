const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const mysql = require("mysql");

const app = express();
const port = 3000;

cloudinary.config({
  cloud_name: "dyoigdvdh",
  api_key: "831332363759673",
  api_secret: "uXG0Iy3RdRMJrC2COTqqS6m9PU8",
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "diegoangel",
  database: "archivo_db",
});

connection.connect((err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err);
    return;
  }
  console.log("Conexión establecida con la base de datos MySQL");
});

// Obtener todas las imágenes
app.get("/api/upload", (req, res) => {
  connection.query("SELECT id, url_archivo FROM archivos", (err, results) => {
    if (err) {
      console.error(
        "Error al obtener la lista de archivos desde la base de datos:",
        err
      );
      return res
        .status(500)
        .json({
          error:
            "Hubo un error al obtener la lista de archivos desde la base de datos.",
        });
    }

    // Devolver tanto el ID como la URL de las imágenes
    const imageInfo = results.map((result) => ({
      id: result.id,
      url: result.url_archivo,
    }));

    res.json({ images: imageInfo });
  });
});

// Crear una nueva imagen
app.post("/upload", upload.single("image"), (req, res) => {
  cloudinary.uploader
    .upload_stream({ resource_type: "image" }, (error, result) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ error: "Hubo un error al subir la imagen a Cloudinary." });
      }

      const archivo = {
        nombre_archivo: req.file.originalname,
        url_archivo: result.secure_url,
      };

      connection.query(
        "INSERT INTO archivos SET ?",
        archivo,
        (err, results) => {
          if (err) {
            console.error(
              "Error al guardar el archivo en la base de datos:",
              err
            );
            return res
              .status(500)
              .json({
                error:
                  "Hubo un error al guardar el archivo en la base de datos.",
              });
          }
          console.log("Archivo guardado en la base de datos:", results);

          res.json({ imageUrl: result.secure_url });
        }
      );
    })
    .end(req.file.buffer);
});

// Obtener una imagen por su ID
app.get("/api/upload/:id", (req, res) => {
  const imageId = req.params.id; // Obtener el ID de la imagen de los parámetros de ruta

  // Verificar si se proporcionó un ID válido
  if (!imageId || isNaN(parseInt(imageId))) {
    return res
      .status(400)
      .json({ error: "Se requiere un ID válido para obtener la imagen." });
  }

  // Consultar la base de datos para obtener la URL de la imagen con el ID proporcionado
  connection.query(
    "SELECT id, url_archivo FROM archivos WHERE id = ?",
    [imageId],
    (err, results) => {
      if (err) {
        console.error(
          "Error al obtener la imagen desde la base de datos:",
          err
        );
        return res
          .status(500)
          .json({
            error: "Hubo un error al obtener la imagen desde la base de datos.",
          });
      }

      // Verificar si se encontró una imagen con el ID proporcionado
      if (results.length === 0) {
        return res
          .status(404)
          .json({
            error: "No se encontró ninguna imagen con el ID proporcionado.",
          });
      }

      // Devolver el ID y la URL de la imagen
      res.json({ id: results[0].id, imageUrl: results[0].url_archivo });
    }
  );
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.listen(port, () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});
