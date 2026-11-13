// ============================================================
// turnoService.js
// Acá vive todo el SQL de los turnos y las reglas de negocio, como
// qué cambios de estado están permitidos. No conoce req ni res, así
// que se puede usar desde cualquier lado.
// ============================================================

const db = require('../config/database');
const { existePaciente, existeMedico } = require('../validators/turnoValidator');


// Servicio del médico: define qué turnos puede ver un usuario con rol MEDICO
async function servicioDelMedico(matricula_medico) {
    const [filas] = await db.execute(
        'SELECT id_servicio FROM medico WHERE matricula_medico = ?',
        [matricula_medico]
    );

    return filas.length > 0 ? filas[0].id_servicio : null;
}


// Servicio al que pertenece un turno, para comprobar si un médico puede tocarlo
async function servicioDeTurno(id_turno) {
    const [filas] = await db.execute(
        `SELECT pr.id_servicio
         FROM turno t
         JOIN practica pr ON t.id_practica = pr.id_practica
         WHERE t.id_turno = ?`,
        [id_turno]
    );

    return filas.length > 0 ? filas[0].id_servicio : null;
}


// Lista los turnos con los nombres ya resueltos y los próximos primero.
// Los mismos filtros sirven para la búsqueda del panel y para el recorte por rol.
async function obtenerTodos(filtros = {}) {
    const condiciones = [];
    const valores = [];

    if (filtros.fecha) {
        condiciones.push('t.fecha_turno = ?');
        valores.push(filtros.fecha);
    }

    if (filtros.estado) {
        condiciones.push('t.estado_turno = ?');
        valores.push(filtros.estado);
    }

    if (filtros.dni_paciente) {
        condiciones.push('t.dni_paciente = ?');
        valores.push(filtros.dni_paciente);
    }

    if (filtros.id_servicio) {
        condiciones.push('pr.id_servicio = ?');
        valores.push(filtros.id_servicio);
    }

    // Búsqueda libre por nombre o apellido
    if (filtros.texto) {
        condiciones.push('(p.nombre_paciente LIKE ? OR p.apellido_paciente LIKE ?)');
        valores.push(`%${filtros.texto}%`, `%${filtros.texto}%`);
    }

    const where = condiciones.length > 0
        ? 'WHERE ' + condiciones.join(' AND ')
        : '';

    const [turnos] = await db.execute(`
        SELECT
            t.id_turno,
            t.fecha_turno,
            t.hora_turno,
            t.medio_solicitado,
            t.estado_turno,
            t.fecha_confirmacion,
            t.medico_confirmacion,
            t.dni_paciente,
            p.nombre_paciente,
            p.apellido_paciente,
            pr.nombre_practica,
            pr.duracion,
            s.nombre_servicio,
            e.nombre_equipo,
            TIMESTAMP(t.fecha_turno, t.hora_turno) < NOW() AS ya_paso
        FROM turno t
        JOIN paciente p  ON t.dni_paciente = p.dni_paciente
        JOIN practica pr ON t.id_practica  = pr.id_practica
        JOIN servicio s  ON pr.id_servicio = s.id_servicio
        LEFT JOIN equipo e ON t.id_equipo  = e.id_equipo
        ${where}
        ORDER BY ya_paso ASC, t.fecha_turno ASC, t.hora_turno ASC
    `, valores);

    return turnos;
}


// Devuelve un turno por su id, o null si no existe
async function obtenerPorId(id_turno) {
    const [turnos] = await db.execute(
        'SELECT * FROM turno WHERE id_turno = ?',
        [id_turno]
    );

    return turnos.length > 0 ? turnos[0] : null;
}


// Igual que la anterior pero agrega si el turno ya pasó, según el reloj de MySQL
async function obtenerConMarcaTemporal(id_turno) {
    const [turnos] = await db.execute(
        `SELECT *, TIMESTAMP(fecha_turno, hora_turno) < NOW() AS ya_paso
         FROM turno
         WHERE id_turno = ?`,
        [id_turno]
    );

    return turnos.length > 0 ? turnos[0] : null;
}


// Inserta el turno; da por hecho que los datos ya fueron validados
async function crearTurno(datos) {
    const {
        fecha_turno,
        hora_turno,
        medio_solicitado = null,
        estado_turno,
        fecha_confirmacion = null,
        medico_confirmacion = null,
        dni_paciente,
        id_practica,
        id_equipo = null,
        id_disponibilidad = null
    } = datos;

    const [resultado] = await db.execute(
        `INSERT INTO turno
        (
            fecha_turno,
            hora_turno,
            medio_solicitado,
            estado_turno,
            fecha_confirmacion,
            medico_confirmacion,
            dni_paciente,
            id_practica,
            id_equipo,
            id_disponibilidad
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            fecha_turno,
            hora_turno,
            medio_solicitado,
            estado_turno,
            fecha_confirmacion,
            medico_confirmacion,
            dni_paciente,
            id_practica,
            id_equipo,
            id_disponibilidad
        ]
    );

    return await obtenerPorId(resultado.insertId);
}


// Turnos de un paciente, sin los cancelados.
// Devuelve null si el paciente no existe, y [] si existe pero no tiene turnos.
async function obtenerTurnosPorPaciente(dni_paciente) {
    if (!(await existePaciente(dni_paciente))) {
        return null;
    }

    const [turnos] = await db.execute(
        `SELECT
            t.id_turno,
            t.fecha_turno,
            t.hora_turno,
            t.medio_solicitado,
            t.estado_turno,
            t.fecha_confirmacion,
            t.medico_confirmacion,
            p.nombre_practica,
            p.duracion,
            s.nombre_servicio,
            e.nombre_equipo
         FROM turno t
         JOIN practica p ON t.id_practica = p.id_practica
         JOIN servicio s ON p.id_servicio = s.id_servicio
         LEFT JOIN equipo e ON t.id_equipo = e.id_equipo
         WHERE t.dni_paciente = ?
           AND t.estado_turno <> 'Cancelado'
         ORDER BY t.fecha_turno, t.hora_turno`,
        [dni_paciente]
    );

    return turnos;
}


// Transición Reservado -> Confirmado
async function confirmarTurno(id_turno, matricula_medico) {
    const turno = await obtenerConMarcaTemporal(id_turno);

    if (turno === null) {
        return { ok: false, motivo: 'NO_ENCONTRADO', error: `No existe el turno ${id_turno}` };
    }

    // Ya estaba confirmado: no se reescribe para no pisar al médico original
    if (turno.estado_turno === 'Confirmado') {
        return { ok: true, turno, sinCambios: true };
    }

    if (turno.estado_turno === 'Cancelado') {
        return { ok: false, motivo: 'ESTADO_INVALIDO', error: 'Un turno Cancelado no se puede confirmar' };
    }

    if (Number(turno.ya_paso) === 1) {
        return { ok: false, motivo: 'TURNO_PASADO', error: 'No se puede confirmar un turno que ya pasó' };
    }

    if (matricula_medico === undefined || matricula_medico === null) {
        return { ok: false, motivo: 'FALTA_MEDICO', error: 'Hace falta medico_confirmacion para confirmar el turno' };
    }

    if (!(await existeMedico(matricula_medico))) {
        return {
            ok: false,
            motivo: 'MEDICO_INEXISTENTE',
            error: `La matrícula ${matricula_medico} no corresponde a un médico registrado`
        };
    }

    // La fecha la pone el servidor, nunca el cliente
    await db.execute(
        `UPDATE turno
         SET estado_turno = 'Confirmado',
             medico_confirmacion = ?,
             fecha_confirmacion = NOW()
         WHERE id_turno = ?`,
        [matricula_medico, id_turno]
    );

    return { ok: true, turno: await obtenerPorId(id_turno) };
}


// Transición a Cancelado; cancelar uno ya cancelado no da error
async function cancelarTurno(id_turno) {
    const turno = await obtenerConMarcaTemporal(id_turno);

    if (turno === null) {
        return { ok: false, motivo: 'NO_ENCONTRADO', error: `No existe el turno ${id_turno}` };
    }

    // Ya está cancelado: no hay nada que hacer
    if (turno.estado_turno === 'Cancelado') {
        return { ok: true, turno, sinCambios: true };
    }

    if (Number(turno.ya_paso) === 1) {
        return { ok: false, motivo: 'TURNO_PASADO', error: 'No se puede cancelar un turno que ya pasó' };
    }

    // Se limpian los campos de confirmación: un Cancelado no puede tenerlos
    await db.execute(
        `UPDATE turno
         SET estado_turno = 'Cancelado',
             medico_confirmacion = NULL,
             fecha_confirmacion = NULL
         WHERE id_turno = ?`,
        [id_turno]
    );

    return { ok: true, turno: await obtenerPorId(id_turno) };
}


// Reprograma el turno. Si estaba Confirmado vuelve a Reservado,
// porque el paciente tiene que confirmar la fecha nueva.
async function actualizarTurno(id_turno, datos) {
    const turno = await obtenerConMarcaTemporal(id_turno);

    if (turno === null) {
        return { ok: false, motivo: 'NO_ENCONTRADO', error: `No existe el turno ${id_turno}` };
    }

    if (turno.estado_turno === 'Cancelado') {
        return { ok: false, motivo: 'ESTADO_INVALIDO', error: 'Un turno Cancelado no se puede modificar' };
    }

    if (Number(turno.ya_paso) === 1) {
        return { ok: false, motivo: 'TURNO_PASADO', error: 'No se puede modificar un turno que ya pasó' };
    }

    const {
        fecha_turno,
        hora_turno,
        medio_solicitado = null,
        dni_paciente,
        id_practica,
        id_equipo = null,
        id_disponibilidad = null
    } = datos;

    await db.execute(
        `UPDATE turno
         SET fecha_turno = ?,
             hora_turno = ?,
             medio_solicitado = ?,
             estado_turno = 'Reservado',
             fecha_confirmacion = NULL,
             medico_confirmacion = NULL,
             dni_paciente = ?,
             id_practica = ?,
             id_equipo = ?,
             id_disponibilidad = ?
         WHERE id_turno = ?`,
        [
            fecha_turno,
            hora_turno,
            medio_solicitado,
            dni_paciente,
            id_practica,
            id_equipo,
            id_disponibilidad,
            id_turno
        ]
    );

    return {
        ok: true,
        turno: await obtenerPorId(id_turno),
        volvioAReservado: turno.estado_turno === 'Confirmado'
    };
}


// Borra el turno de la base; cancelar en cambio lo conserva como historial
async function eliminarTurno(id_turno) {
    const turno = await obtenerPorId(id_turno);

    if (turno === null) {
        return { ok: false, motivo: 'NO_ENCONTRADO', error: `No existe el turno ${id_turno}` };
    }

    try {
        await db.execute(
            'DELETE FROM turno WHERE id_turno = ?',
            [id_turno]
        );

    } catch (error) {
        // Puede estar referenciado desde la tabla registra
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return {
                ok: false,
                motivo: 'ESTADO_INVALIDO',
                error: 'El turno no se puede eliminar porque tiene un médico asignado en la tabla registra'
            };
        }

        throw error;
    }

    return { ok: true, turno };
}


module.exports = {
    obtenerTodos,
    obtenerPorId,
    crearTurno,
    obtenerTurnosPorPaciente,
    confirmarTurno,
    cancelarTurno,
    actualizarTurno,
    eliminarTurno,
    servicioDelMedico,
    servicioDeTurno
};
