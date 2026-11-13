// ============================================================
// authRoutes.js
// Rutas de cuentas: login, registro y verificación de correo.
// Son públicas porque se usan justamente antes de tener un token.
// ============================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const registroController = require('../controllers/registroController');
const verificacionController = require('../controllers/verificacionController');


// Devuelve el token si las credenciales son correctas
router.post('/login', authController.login);

// Alta de cuenta: crean el usuario sin verificar y mandan el correo
router.post('/registro/paciente', registroController.registrarPaciente);
router.post('/registro/medico', registroController.registrarMedico);

// Destino del enlace que llega por mail: activa la cuenta
router.get('/verificar-email', verificacionController.verificarEmail);


module.exports = router;
