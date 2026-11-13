// ============================================================
// server.js
// Arranca la aplicación: levanta Express, conecta los middlewares
// generales y monta tanto la API como las páginas del frontend.
// Es el archivo que se ejecuta con npm start.
// ============================================================

const path = require('path');

// Se carga el .env antes que nada, porque el resto lo necesita
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require("express");
const cors = require("cors");
const router = require("./routes/router");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Habilita que un frontend en otro puerto pueda consumir esta API
app.use(cors());

// Convierte el cuerpo JSON de las peticiones en req.body
app.use(express.json());

// Rutas públicas: login, registro y verificación de correo
app.use("/api/auth", authRoutes);

// Rutas de turnos: todas piden token
app.use("/api/turnos", router);

// Express sirve también el frontend, así alcanza un solo comando
app.use(express.static(path.join(__dirname, '..', 'frontend')));


const PORT = 3000;

// Queda escuchando hasta que se corte con Ctrl+C
app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
    console.log(`Abrí la aplicación en  http://localhost:${PORT}`);
});
