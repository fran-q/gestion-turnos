// ============================================================
// authController.js
// Atiende el inicio de sesión: recibe las credenciales, le pregunta
// al service si son válidas y, si lo son, firma y entrega el token.
// ============================================================

const authService = require('../services/authService');
const jwt = require('jsonwebtoken');


async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'El email y la contraseña son obligatorios'
            });
        }

        // Se normaliza el email porque en la base se guarda en minúsculas
        const usuario = await authService.verificarCredenciales(
            email.trim().toLowerCase(),
            password
        );

        // Usuario inexistente, inactivo o contraseña equivocada
        if (!usuario) {
            return res.status(401).json({
                error: 'Credenciales incorrectas'
            });
        }

        // Caso distinto: la clave estaba bien, falta confirmar el correo
        if (usuario.error === 'EMAIL_NO_VERIFICADO') {
            return res.status(403).json({
                error: 'Tenés que verificar tu correo antes de iniciar sesión. Revisá tu casilla.'
            });
        }

        // Sin la clave de firma el token no serviría de nada
        if (!process.env.JWT_SECRET) {
            throw new Error('Falta configurar JWT_SECRET en .env');
        }

        // El token lleva los datos que después deciden qué puede ver el usuario
        const token = jwt.sign(
            {
                id_usuario: usuario.id_usuario,
                email: usuario.email,
                id_rol: usuario.id_rol,
                dni_paciente: usuario.dni_paciente,
                matricula_medico: usuario.matricula_medico
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
            usuario,
            token
        });

    } catch (error) {
        console.error('Error en login:', error);

        return res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
}


module.exports = {
    login
};
