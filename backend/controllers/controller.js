// ============================================================
// controller.js
// Atiende las peticiones de turnos: lee el pedido, decide el código
// de respuesta y arma el JSON. El SQL no está acá, lo hace el service.
// ============================================================

const turnoService = require('../services/turnoService');

// Las validaciones corren como middleware en la ruta: acá los datos ya llegan limpios


// Ids de la tabla rol
const ROLES = { ADMIN: 1, MEDICO: 2, PACIENTE: 3 };


// Traduce el motivo que devuelve el service a un código HTTP
const CODIGO_HTTP = {
    NO_ENCONTRADO: 404,
    TURNO_PASADO: 409,
    ESTADO_INVALIDO: 409,
    FALTA_MEDICO: 400,
    MEDICO_INEXISTENTE: 400
};


// Arma el filtro que recorta qué turnos ve cada perfil
async function recortePorRol(usuario) {
    const rol = Number(usuario.id_rol);

    if (rol === ROLES.ADMIN) {
        return {};
    }

    if (rol === ROLES.MEDICO) {
        const idServicio = await turnoService.servicioDelMedico(usuario.matricula_medico);

            // Sin matrícula asociada no ve nada
        return { id_servicio: idServicio ?? -1 };
    }

    // Paciente: solo los suyos
    return { dni_paciente: usuario.dni_paciente ?? -1 };
}


// Control fino: el rol habilita la operación, esto comprueba que el turno sea suyo
async function puedeAccederAlTurno(usuario, turno) {
    const rol = Number(usuario.id_rol);

    if (rol === ROLES.ADMIN) {
        return true;
    }

    if (rol === ROLES.PACIENTE) {
        return Number(turno.dni_paciente) === Number(usuario.dni_paciente);
    }

    if (rol === ROLES.MEDICO) {
        const idServicio = await turnoService.servicioDelMedico(usuario.matricula_medico);
        const servicioDelTurno = await turnoService.servicioDeTurno(turno.id_turno);

        return idServicio !== null && idServicio === servicioDelTurno;
    }

    return false;
}


// Comprueba el permiso sobre el turno del :id y responde el 403 si no corresponde
async function verificarAccesoPorId(req, res) {
    const turno = await turnoService.obtenerPorId(req.params.id);

    // Si no existe se deja seguir: el 404 lo responde el service
    if (turno === null) {
        return true;
    }

    if (!(await puedeAccederAlTurno(req.usuario, turno))) {
        res.status(403).json({
            error: 'No tenés permisos para operar sobre este turno'
        });
        return false;
    }

    return true;
}


async function obtenerTurnos(req, res) {
    try {
        // Filtros de búsqueda que llegan por querystring
        const filtros = {
            fecha: req.query.fecha || null,
            estado: req.query.estado || null,
            dni_paciente: req.query.dni || null,
            texto: req.query.texto || null
        };

        const recorte = await recortePorRol(req.usuario);

        const turnos = await turnoService.obtenerTodos({ ...filtros, ...recorte });

        res.json(turnos);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error al obtener los turnos'
        });
    }
}


// Devuelve un turno puntual, si el usuario puede verlo
async function obtenerTurnoPorId(req, res) {
    try {
        const turno = await turnoService.obtenerPorId(req.params.id);

        if (turno === null) {
            return res.status(404).json({
                error: 'Turno no encontrado'
            });
        }

        if (!(await puedeAccederAlTurno(req.usuario, turno))) {
            return res.status(403).json({
                error: 'No tenés permisos para ver este turno'
            });
        }

        res.json(turno);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error al obtener el turno'
        });
    }
}


// Historial de un paciente, sin los turnos cancelados
async function obtenerTurnosPorPaciente(req, res) {
    try {
        const dni = req.params.dni;

        // Un paciente solo puede consultar su propio historial
        if (Number(req.usuario.id_rol) === ROLES.PACIENTE &&
            Number(dni) !== Number(req.usuario.dni_paciente)) {
            return res.status(403).json({
                error: 'Solo podés consultar tus propios turnos'
            });
        }

        const turnos = await turnoService.obtenerTurnosPorPaciente(dni);

        // null = el paciente no existe. [] = existe pero no tiene turnos.
        if (turnos === null) {
            return res.status(404).json({
                error: `El DNI ${dni} no corresponde a un paciente registrado`
            });
        }

        res.json(turnos);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error al obtener los turnos del paciente'
        });
    }
}


// Da de alta un turno nuevo (los datos ya pasaron por el validator)
async function crearTurno(req, res) {
    try {
        const datos = req.body || {};

        const turno = await turnoService.crearTurno(datos);

        res.status(201).json({
            mensaje: 'Turno creado correctamente',
            id_turno: turno.id_turno,
            turno
        });

    } catch (error) {
        console.error(error);

        // Si una foreign key rechaza el insert, se traduce a un mensaje legible
        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
            return res.status(400).json({
                error: 'Alguno de los datos referenciados no existe. Revisá id_practica, id_equipo e id_disponibilidad.'
            });
        }

        res.status(500).json({
            error: 'Error al crear el turno'
        });
    }
}


// Pasa el turno de Reservado a Confirmado
async function confirmarTurno(req, res) {
    try {
        const { medico_confirmacion } = req.body || {};

        const permiso = await verificarAccesoPorId(req, res);
        if (!permiso) return;

        const resultado = await turnoService.confirmarTurno(req.params.id, medico_confirmacion);

        if (!resultado.ok) {
            return res.status(CODIGO_HTTP[resultado.motivo] || 400).json({
                error: resultado.error
            });
        }

        res.json({
            mensaje: resultado.sinCambios ? 'El turno ya estaba confirmado' : 'Turno confirmado',
            turno: resultado.turno
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error al confirmar el turno'
        });
    }
}


// Cancela el turno; repetirlo no da error
async function cancelarTurno(req, res) {
    try {
        const permiso = await verificarAccesoPorId(req, res);
        if (!permiso) return;

        const resultado = await turnoService.cancelarTurno(req.params.id);

        if (!resultado.ok) {
            return res.status(CODIGO_HTTP[resultado.motivo] || 400).json({
                error: resultado.error
            });
        }

        res.json({
            mensaje: resultado.sinCambios ? 'El turno ya estaba cancelado' : 'Turno cancelado',
            turno: resultado.turno
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error al cancelar el turno'
        });
    }
}


// Reprograma el turno: si estaba Confirmado vuelve a Reservado
async function actualizarTurno(req, res) {
    try {
        const datos = req.body || {};

        const resultado = await turnoService.actualizarTurno(req.params.id, datos);

        if (!resultado.ok) {
            return res.status(CODIGO_HTTP[resultado.motivo] || 400).json({
                error: resultado.error
            });
        }

        res.json({
            mensaje: resultado.volvioAReservado
                ? 'Turno modificado. Volvió a estado Reservado y debe confirmarse nuevamente.'
                : 'Turno modificado correctamente',
            turno: resultado.turno
        });

    } catch (error) {
        console.error(error);

        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
            return res.status(400).json({
                error: 'Alguno de los datos referenciados no existe. Revisá id_practica, id_equipo e id_disponibilidad.'
            });
        }

        res.status(500).json({
            error: 'Error al modificar el turno'
        });
    }
}


// Borra el turno de la base, a diferencia de cancelar
async function eliminarTurno(req, res) {
    try {
        const resultado = await turnoService.eliminarTurno(req.params.id);

        if (!resultado.ok) {
            return res.status(CODIGO_HTTP[resultado.motivo] || 400).json({
                error: resultado.error
            });
        }

        res.json({
            mensaje: 'Turno eliminado correctamente',
            turno: resultado.turno
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error al eliminar el turno'
        });
    }
}


// Funciones que usa el router
module.exports = {
    obtenerTurnos,
    obtenerTurnoPorId,
    obtenerTurnosPorPaciente,
    crearTurno,
    actualizarTurno,
    eliminarTurno,
    confirmarTurno,
    cancelarTurno
};
