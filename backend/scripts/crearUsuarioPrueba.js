// ============================================================
// crearUsuarioPrueba.js
// Script suelto para dejar cargada la cuenta de administrador si
// se reimporta la base desde cero. Se corre a mano con:
//     node backend/scripts/crearUsuarioPrueba.js
// ============================================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../config/database');
const bcrypt = require('bcryptjs');


// Si la cuenta ya existe no hace nada, así se puede correr varias veces
async function crearUsuarioPrueba() {
    const email = 'admin@turnos.com';
    const password = 'AdminTurnos2026!';

    try {
        const [usuarios] = await db.execute(
            'SELECT id_usuario FROM usuario WHERE email = ?',
            [email]
        );

        if (usuarios.length > 0) {
            console.log('El usuario de prueba ya existe.');
            return;
        }

        // Nunca se guarda la contraseña en claro
        const passwordHash = await bcrypt.hash(password, 10);

        // id_rol 1 = ADMIN
        await db.execute(
            `INSERT INTO usuario (email, password_hash, id_rol, activo)
             VALUES (?, ?, ?, ?)`,
            [email, passwordHash, 1, 1]
        );

        console.log('Usuario de prueba creado correctamente.');
        console.log('Email:', email);
        console.log('Contraseña:', password);

    } catch (error) {
        console.error('Error al crear el usuario:', error.message);

    } finally {
        // Cierra el pool para que el proceso termine
        await db.end();
    }
}


crearUsuarioPrueba();
