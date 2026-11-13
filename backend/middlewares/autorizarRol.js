// ============================================================
// autorizarRol.js
// Recibe los roles que pueden usar una ruta y devuelve el middleware
// que los controla. Se usa después de verificarToken, que es quien
// deja el usuario en req.usuario.
// ============================================================

// Ids de la tabla rol: 1 ADMIN · 2 MEDICO · 3 PACIENTE
function autorizarRol(...rolesPermitidos) {

    // Devuelve un middleware distinto según los roles que reciba
    return function (req, res, next) {

        // Si no pasó por verificarToken, no hay a quién controlar
        if (!req.usuario) {
            return res.status(401).json({
                error: 'Se requiere autenticación'
            });
        }

        const idRol = Number(req.usuario.id_rol);

        // El rol no figura entre los habilitados para esta ruta
        if (!rolesPermitidos.includes(idRol)) {
            return res.status(403).json({
                error: 'No tenés permisos para realizar esta acción'
            });
        }

        next();
    };
}


module.exports = autorizarRol;
