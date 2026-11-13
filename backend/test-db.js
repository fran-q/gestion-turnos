// ============================================================
// test-db.js
// Script suelto para comprobar que la conexión con MySQL funciona.
// No forma parte de la API.
// ============================================================

const db = require('./config/database');
async function probarConexion() {
    try {
        const [resultado] = await db.query('SELECT 1 AS conectado');
        console.log('Conexión a MySQL OK');
        console.log(resultado);
    } catch (error) {
        console.error('Error de conexión:', error.message);
    }
}
probarConexion();