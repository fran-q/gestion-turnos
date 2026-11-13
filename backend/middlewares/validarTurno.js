// ============================================================
// validarTurno.js
// Permite enchufar las validaciones directo en la ruta. Llama al
// validator y, si encuentra errores, corta con 400 para que el
// controller reciba siempre datos correctos.
// ============================================================

const { validarTurno } = require('../validators/turnoValidator');


async function validarTurnoMiddleware(req, res, next) {
    try {
        // En el PUT viene el id del turno que se edita, para que no se
        // detecte como duplicado de sí mismo. En el POST llega vacío.
        const idExcluir = req.params.id;

        const errores = await validarTurno(req.body || {}, idExcluir);

        // El validator devuelve una lista: si trae algo, no se sigue
        if (errores.length > 0) {
            return res.status(400).json({ errores });
        }

        next();

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error al validar los datos del turno'
        });
    }
}


module.exports = validarTurnoMiddleware;
