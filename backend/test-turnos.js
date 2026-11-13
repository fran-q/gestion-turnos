// ============================================================
// test-turnos.js
// Script suelto que imprime los primeros turnos por consola, para
// verificar que la tabla responde. No forma parte de la API.
// ============================================================

const db = require('./config/database');


async function probarTurnos() {
    try {
        const [turnos] = await db.query(`
            SELECT *
            FROM turno
            LIMIT 10
        `);


        console.table(turnos);


    } catch (error) {
        console.error('Error:', error.message);
    }
}


probarTurnos();
