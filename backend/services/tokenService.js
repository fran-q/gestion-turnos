// ============================================================
// tokenService.js
// Fabrica y controla los enlaces de un solo uso que viajan por
// correo. El enlace se manda en claro, pero en la base solo queda
// guardado su hash.
// ============================================================

const crypto = require('crypto');
const db = require('../config/database');


const TIPOS_PERMITIDOS = [
    'VERIFICACION_EMAIL',
    'RECUPERACION_PASSWORD'
];


// Si alguien lee la tabla, con el hash no puede rearmar el enlace
function hashear(token) {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}


// Crea un enlace nuevo y devuelve el token en claro para el correo
async function crearTokenCuenta(idUsuario, tipo, minutosValidez = 30) {
    if (!TIPOS_PERMITIDOS.includes(tipo)) {
        throw new Error('Tipo de token no válido');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashear(token);

    const expiracion = new Date(Date.now() + minutosValidez * 60 * 1000);

    // Pedir un enlace nuevo invalida los anteriores
    await db.execute(
        `UPDATE token_cuenta
         SET usado = 1
         WHERE id_usuario = ?
           AND tipo = ?
           AND usado = 0`,
        [idUsuario, tipo]
    );

    await db.execute(
        `INSERT INTO token_cuenta
            (id_usuario, token_hash, tipo, fecha_expiracion, usado)
         VALUES (?, ?, ?, ?, 0)`,
        [idUsuario, tokenHash, tipo, expiracion]
    );

    return token;
}


// Busca el token solo si es del tipo correcto, está sin usar y no venció
async function buscarTokenValido(token, tipo) {
    const tokenHash = hashear(token);

    const [filas] = await db.execute(
        `SELECT id_token, id_usuario
         FROM token_cuenta
         WHERE token_hash = ?
           AND tipo = ?
           AND usado = 0
           AND fecha_expiracion > NOW()
         LIMIT 1`,
        [tokenHash, tipo]
    );

    return filas.length > 0 ? filas[0] : null;
}


// Devuelve true solo si fue este llamado el que lo consumió
async function marcarTokenUsado(idToken) {
    const [resultado] = await db.execute(
        `UPDATE token_cuenta
         SET usado = 1
         WHERE id_token = ?
           AND usado = 0`,
        [idToken]
    );

    return resultado.affectedRows === 1;
}


module.exports = {
    crearTokenCuenta,
    buscarTokenValido,
    marcarTokenUsado
};
