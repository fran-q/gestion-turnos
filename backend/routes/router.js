// ============================================================
// router.js
// Mapa de las rutas de turnos: dice qué URL ejecuta qué función y
// qué filtros corren antes. Todo lo de acá cuelga de /api/turnos.
// ============================================================

const express = require('express');
const router = express.Router();
const controller = require('../controllers/controller');
const verificarToken = require('../middlewares/authMiddleware');
const autorizarRol = require('../middlewares/autorizarRol');
const validarTurno = require('../middlewares/validarTurno');


// Ids de la tabla rol
const ADMIN = 1;
const MEDICO = 2;
const PACIENTE = 3;


// Sin token no se entra a ninguna ruta de turnos
router.use(verificarToken);


// Lectura: los tres perfiles entran, pero el controller recorta qué ve cada uno
router.get('/', autorizarRol(ADMIN, MEDICO, PACIENTE), controller.obtenerTurnos);
router.get('/paciente/:dni', autorizarRol(ADMIN, MEDICO, PACIENTE), controller.obtenerTurnosPorPaciente);
router.get('/:id', autorizarRol(ADMIN, MEDICO, PACIENTE), controller.obtenerTurnoPorId);


// Alta y edición: solo administración, y pasando por las validaciones
router.post('/', autorizarRol(ADMIN), validarTurno, controller.crearTurno);
router.put('/:id', autorizarRol(ADMIN), validarTurno, controller.actualizarTurno);
router.delete('/:id', autorizarRol(ADMIN), controller.eliminarTurno);


// Confirmar: lo hace el centro, no el paciente
router.patch('/:id/confirmar', autorizarRol(ADMIN, MEDICO), controller.confirmarTurno);

// Cancelar: el paciente también puede, pero solo el suyo
router.patch('/:id/cancelar', autorizarRol(ADMIN, MEDICO, PACIENTE), controller.cancelarTurno);


module.exports = router;
