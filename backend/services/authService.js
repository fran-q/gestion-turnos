// ============================================================
// authService.js
// Responde una sola pregunta: ¿este email y esta contraseña son de
// un usuario válido? Trabaja contra la base y no sabe nada de HTTP.
// ============================================================

const db = require('../config/database');
const bcrypt = require('bcryptjs');


async function verificarCredenciales(email, password) {
    const [usuarios] = await db.execute(
        `SELECT id_usuario, email, password_hash, id_rol, activo, email_verificado,
                dni_paciente, matricula_medico
         FROM usuario
         WHERE email = ?`,
        [email]
    );

    // No existe o fue dado de baja
    if (usuarios.length === 0 || usuarios[0].activo !== 1) {
        return null;
    }

    const usuario = usuarios[0];

    // bcrypt vuelve a hashear lo tecleado y compara: nunca descifra
    const passwordValida = await bcrypt.compare(
        password,
        usuario.password_hash
    );

    if (!passwordValida) {
        return null;
    }

    // La clave está bien pero falta confirmar el correo: el controller lo traduce a 403
    if (Number(usuario.email_verificado) !== 1) {
        return { error: 'EMAIL_NO_VERIFICADO' };
    }

    // El dni y la matrícula viajan porque son los que recortan qué ve cada perfil
    return {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        id_rol: usuario.id_rol,
        dni_paciente: usuario.dni_paciente,
        matricula_medico: usuario.matricula_medico
    };
}


module.exports = {
    verificarCredenciales
};
