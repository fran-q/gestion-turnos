// ============================================================
// authMiddleware.js
// Portero del sistema: revisa que la petición traiga un token JWT
// válido. Si no lo trae, corta con 401 y el controller ni se entera.
// ============================================================

const jwt = require('jsonwebtoken');


function verificarToken(req, res, next) {
    const authorization = req.headers.authorization;

    // Sin el header "Authorization: Bearer <token>" no se sigue
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Se requiere un token de autenticación'
        });
    }

    const token = authorization.split(' ')[1];

    try {
        // Si la firma no coincide o el token venció, verify lanza error
        const datosToken = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Deja los datos del usuario disponibles para el resto de la cadena
        req.usuario = datosToken;
        next();

    } catch (error) {
        return res.status(401).json({
            error: 'Token inválido o vencido'
        });
    }
}


module.exports = verificarToken;
