// ============================================================
// database.js
// Abre la conexión con MySQL y la deja lista para que la use todo
// el proyecto. Es el único archivo que conoce las credenciales.
// ============================================================

const mysql = require('mysql2/promise');
const path = require('path');

// La ruta se arma desde este archivo para que el .env se encuentre
// sin importar desde qué carpeta se ejecute node
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });


// Un pool reutiliza conexiones en vez de abrir una por consulta
const conexion = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

module.exports = conexion;
