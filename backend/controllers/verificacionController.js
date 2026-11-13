// ============================================================
// verificacionController.js
// Atiende el enlace que el usuario recibe por correo. Si el token
// sirve, marca la cuenta como verificada y la habilita para entrar.
// ============================================================

const db = require('../config/database');
const { buscarTokenValido } = require('../services/tokenService');


// 32 bytes en hexadecimal son 64 caracteres
const FORMATO_TOKEN = /^[a-f0-9]{64}$/i;


async function verificarEmail(req, res) {
    try {
        const { token } = req.query;

        // Se descarta cualquier cosa que ni siquiera tenga forma de token
        if (typeof token !== 'string' || !FORMATO_TOKEN.test(token)) {
            return res.status(400).json({
                error: 'El enlace de verificación no es válido'
            });
        }

        const tokenEncontrado = await buscarTokenValido(
            token,
            'VERIFICACION_EMAIL'
        );

        if (!tokenEncontrado) {
            return res.status(400).json({
                error: 'El enlace venció, ya fue utilizado o no es válido'
            });
        }

        const conexion = await db.getConnection();

        try {
            // Los dos UPDATE van juntos: o pasan los dos o ninguno
            await conexion.beginTransaction();

            // FOR UPDATE bloquea la fila: si llegan dos clics juntos, uno espera
            const [tokens] = await conexion.execute(
                `SELECT id_token, id_usuario
                 FROM token_cuenta
                 WHERE id_token = ?
                   AND usado = 0
                   AND tipo = 'VERIFICACION_EMAIL'
                   AND fecha_expiracion > NOW()
                 FOR UPDATE`,
                [tokenEncontrado.id_token]
            );

            // El otro pedido llegó primero y ya lo consumió
            if (tokens.length === 0) {
                await conexion.rollback();

                return res.status(400).json({
                    error: 'El enlace venció o ya fue utilizado'
                });
            }

            // Habilita la cuenta
            await conexion.execute(
                `UPDATE usuario
                 SET email_verificado = 1
                 WHERE id_usuario = ?`,
                [tokens[0].id_usuario]
            );

            // Y quema el enlace para que no sirva una segunda vez
            await conexion.execute(
                `UPDATE token_cuenta
                 SET usado = 1
                 WHERE id_token = ?`,
                [tokens[0].id_token]
            );

            await conexion.commit();

            return res.status(200).json({
                mensaje: 'Correo verificado correctamente. Ya podés iniciar sesión.'
            });

        } catch (error) {
            await conexion.rollback();
            throw error;

        } finally {
            // La conexión siempre vuelve al pool, falle o no
            conexion.release();
        }

    } catch (error) {
        console.error('Error al verificar correo:', error);

        return res.status(500).json({
            error: 'No se pudo verificar el correo'
        });
    }
}


module.exports = { verificarEmail };
