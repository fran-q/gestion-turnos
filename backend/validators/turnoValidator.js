// ============================================================
// turnoValidator.js
// Concentra las reglas que debe cumplir un turno para poder
// guardarse. Devuelve la lista de errores encontrados: si vuelve
// vacía, los datos están bien. No sabe nada de HTTP.
// ============================================================

const db = require('../config/database');

// Listas cerradas: cualquier otro valor se rechaza
const ESTADOS_VALIDOS = ['Reservado', 'Confirmado', 'Cancelado'];
const MEDIOS_VALIDOS = ['Web', 'Teléfono', 'WhatsApp'];

// Horario de atención por día de la semana; null = cerrado
const FRANJA_HORARIA = {
    0: null,                                  // Domingo: cerrado
    1: { desde: '08:00', hasta: '20:00' },    // Lunes
    2: { desde: '08:00', hasta: '20:00' },    // Martes
    3: { desde: '08:00', hasta: '20:00' },    // Miércoles
    4: { desde: '08:00', hasta: '20:00' },    // Jueves
    5: { desde: '08:00', hasta: '20:00' },    // Viernes
    6: { desde: '08:00', hasta: '14:00' }     // Sábado
};

// En plural porque se arman frases como "los lunes se atiende de..."
const NOMBRE_DIA = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];


// Fecha de hoy como AAAA-MM-DD, en hora local
function hoyISO() {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');

    return `${hoy.getFullYear()}-${mes}-${dia}`;
}


// Día de la semana (0 = domingo). Se parte el string a mano porque
// new Date("2026-10-10") lo lee como UTC y en Argentina da el día anterior.
function diaDeLaSemana(fecha) {
    const [anio, mes, dia] = fecha.split('-').map(Number);

    return new Date(anio, mes - 1, dia).getDay();
}


// Recorta a HH:MM para poder comparar las horas como texto
function soloHoraYMinutos(hora) {
    return String(hora).slice(0, 5);
}


// Regla 2: el DNI tiene que estar registrado
async function existePaciente(dni_paciente) {
    const [pacientes] = await db.execute(
        'SELECT dni_paciente FROM paciente WHERE dni_paciente = ?',
        [dni_paciente]
    );

    return pacientes.length > 0;
}

// Regla 3: la matrícula tiene que existir
async function existeMedico(matricula_medico) {
    const [medicos] = await db.execute(
        'SELECT matricula_medico FROM medico WHERE matricula_medico = ?',
        [matricula_medico]
    );

    return medicos.length > 0;
}


// Dos turnos se pisan si uno empieza antes de que termine el otro, en ambos sentidos.
// Cada turno ocupa desde su hora hasta hora + la duración de la práctica.
const CONDICION_SOLAPAMIENTO = `
    TIME_TO_SEC(?) < TIME_TO_SEC(t.hora_turno) + p.duracion * 60
    AND TIME_TO_SEC(t.hora_turno) < TIME_TO_SEC(?) + ? * 60
`;


// Minutos que dura una práctica, necesarios para medir el solapamiento
async function duracionDePractica(id_practica) {
    const [filas] = await db.execute(
        'SELECT duracion FROM practica WHERE id_practica = ?',
        [id_practica]
    );

    return filas.length > 0 ? filas[0].duracion : null;
}


// Reglas 5 y 7: el paciente no puede tener dos turnos superpuestos
async function pacienteTieneTurno(dni_paciente, fecha_turno, hora_turno, duracion, idExcluir = null) {
    const [turnos] = await db.execute(
        `SELECT t.id_turno
         FROM turno t
         JOIN practica p ON t.id_practica = p.id_practica
         WHERE t.dni_paciente = ?
           AND t.fecha_turno = ?
           AND t.estado_turno <> 'Cancelado'
           AND t.id_turno <> COALESCE(?, 0)
           AND ${CONDICION_SOLAPAMIENTO}`,
        [dni_paciente, fecha_turno, idExcluir, hora_turno, hora_turno, duracion]
    );

    return turnos.length > 0;
}


// Regla 9: el equipo no puede estar tomado en ese rango
async function equipoOcupado(id_equipo, fecha_turno, hora_turno, duracion, idExcluir = null) {
    const [turnos] = await db.execute(
        `SELECT t.id_turno
         FROM turno t
         JOIN practica p ON t.id_practica = p.id_practica
         WHERE t.id_equipo = ?
           AND t.fecha_turno = ?
           AND t.estado_turno <> 'Cancelado'
           AND t.id_turno <> COALESCE(?, 0)
           AND ${CONDICION_SOLAPAMIENTO}`,
        [id_equipo, fecha_turno, idExcluir, hora_turno, hora_turno, duracion]
    );

    return turnos.length > 0;
}


// Regla 12: el equipo tiene que servir para esa práctica.
// Sin esto se podía pedir una radiografía asignando un ecógrafo.
async function equipoSirveParaPractica(id_equipo, id_practica) {
    const [filas] = await db.execute(
        `SELECT 1
         FROM practica_equipo
         WHERE id_practica = ?
           AND id_equipo = ?`,
        [id_practica, id_equipo]
    );

    return filas.length > 0;
}


// Corre todas las reglas y devuelve la lista de errores encontrados
async function validarTurno(datos, idExcluir = null) {
    const errores = [];

    // En el PUT llega el id a ignorar; en el POST llega vacío y se normaliza a null
    const excluir = idExcluir ?? null;

    const {
        fecha_turno,
        hora_turno,
        medio_solicitado,
        estado_turno,
        fecha_confirmacion,
        medico_confirmacion,
        dni_paciente,
        id_practica,
        id_equipo
    } = datos;


    // TANDA 1: todo lo que se puede chequear sin ir a la base


    // Regla 1: el estado tiene que ser uno de la lista
    if (estado_turno === undefined || estado_turno === null || estado_turno === '') {
        errores.push('estado_turno es obligatorio');
    } else if (!ESTADOS_VALIDOS.includes(estado_turno)) {
        errores.push(
            `estado_turno debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}. Recibido: "${estado_turno}"`
        );
    }


    // Regla 3a: un Confirmado necesita médico y fecha; un Reservado no puede tenerlos
    const hayMedico = medico_confirmacion !== undefined && medico_confirmacion !== null;
    const hayFecha = fecha_confirmacion !== undefined && fecha_confirmacion !== null;

    if (estado_turno === 'Confirmado') {
        if (!hayMedico) {
            errores.push('Un turno Confirmado necesita medico_confirmacion');
        }
        if (!hayFecha) {
            errores.push('Un turno Confirmado necesita fecha_confirmacion');
        }
    } else if (ESTADOS_VALIDOS.includes(estado_turno)) {
        if (hayMedico) {
            errores.push(`Un turno ${estado_turno} no puede tener medico_confirmacion`);
        }
        if (hayFecha) {
            errores.push(`Un turno ${estado_turno} no puede tener fecha_confirmacion`);
        }
    }


    // Regla 4: el medio tiene que ser uno de la lista
    if (medio_solicitado === undefined || medio_solicitado === null || medio_solicitado === '') {
        errores.push('medio_solicitado es obligatorio');
    } else if (!MEDIOS_VALIDOS.includes(medio_solicitado)) {
        errores.push(
            `medio_solicitado debe ser uno de: ${MEDIOS_VALIDOS.join(', ')}. Recibido: "${medio_solicitado}"`
        );
    }


    // Las reglas de calendario necesitan que el formato sea correcto primero
    const fechaBienFormada = /^\d{4}-\d{2}-\d{2}$/.test(fecha_turno);
    const horaBienFormada = /^\d{2}:\d{2}(:\d{2})?$/.test(hora_turno);

    if (fecha_turno && !fechaBienFormada) {
        errores.push('fecha_turno debe tener el formato AAAA-MM-DD');
    }

    if (hora_turno && !horaBienFormada) {
        errores.push('hora_turno debe tener el formato HH:MM o HH:MM:SS');
    }


    // Regla 6: no se pueden pedir turnos para una fecha pasada
    if (fechaBienFormada && fecha_turno < hoyISO()) {
        errores.push(`fecha_turno no puede ser anterior a hoy (${hoyISO()})`);
    }


    // Regla 8: los campos obligatorios no pueden faltar
    if (!fecha_turno) {
        errores.push('fecha_turno es obligatorio');
    }

    if (!hora_turno) {
        errores.push('hora_turno es obligatorio');
    }

    if (!dni_paciente) {
        errores.push('dni_paciente es obligatorio');
    }

    if (!id_practica) {
        errores.push('id_practica es obligatorio');
    }


    // Regla 11: el turno tiene que caer dentro del horario de atención
    if (fechaBienFormada && horaBienFormada) {
        const dia = diaDeLaSemana(fecha_turno);
        const franja = FRANJA_HORARIA[dia];
        const hora = soloHoraYMinutos(hora_turno);

        if (franja === null) {
            errores.push(`No se atiende los ${NOMBRE_DIA[dia]}`);
        } else if (hora < franja.desde || hora > franja.hasta) {
            errores.push(
                `Los ${NOMBRE_DIA[dia]} se atiende de ${franja.desde} a ${franja.hasta}. Recibido: ${hora}`
            );
        }
    }


    // Si ya hay errores se corta: no tiene sentido gastar consultas
    if (errores.length > 0) {
        return errores;
    }


    // TANDA 2: solo si la tanda 1 pasó limpia, se consulta la base


    // Regla 2: el paciente tiene que existir
    if (!(await existePaciente(dni_paciente))) {
        errores.push(`El DNI ${dni_paciente} no corresponde a un paciente registrado`);
    }


    // Regla 3b: si vino una matrícula, tiene que ser real
    if (hayMedico && !(await existeMedico(medico_confirmacion))) {
        errores.push(`La matrícula ${medico_confirmacion} no corresponde a un médico registrado`);
    }


    // Para medir solapamientos hace falta saber cuánto dura la práctica
    const duracion = await duracionDePractica(id_practica);

    if (duracion === null) {
        errores.push(`La práctica ${id_practica} no existe`);
        return errores;
    }


    // Reglas 5 y 7: se comparan intervalos completos, no la hora exacta
    if (await pacienteTieneTurno(dni_paciente, fecha_turno, hora_turno, duracion, excluir)) {
        errores.push(
            `El paciente ${dni_paciente} ya tiene otro turno que se superpone el ${fecha_turno} a las ${soloHoraYMinutos(hora_turno)}`
        );
    }


    // Regla 9: el equipo no puede estar tomado
    if (id_equipo !== undefined && id_equipo !== null) {
        if (await equipoOcupado(id_equipo, fecha_turno, hora_turno, duracion, excluir)) {
            errores.push(
                `El equipo ${id_equipo} ya está ocupado el ${fecha_turno} a las ${soloHoraYMinutos(hora_turno)}`
            );
        }


        // Regla 12: el equipo tiene que ser compatible con la práctica
        if (!(await equipoSirveParaPractica(id_equipo, id_practica))) {
            errores.push(
                `El equipo ${id_equipo} no sirve para la práctica ${id_practica}`
            );
        }
    }


    // Regla 10 (médico duplicado): no se puede implementar todavía, porque la
    // tabla turno no guarda qué médico atiende, solo quién confirmó.


    return errores;
}


// Lo que consumen el middleware y el service
module.exports = {
    validarTurno,
    existePaciente,
    existeMedico,
    pacienteTieneTurno,
    equipoOcupado,
    equipoSirveParaPractica,
    duracionDePractica,
    ESTADOS_VALIDOS,
    MEDIOS_VALIDOS,
    FRANJA_HORARIA
};
