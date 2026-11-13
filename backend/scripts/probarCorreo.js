// ============================================================
// probarCorreo.js
// Script suelto para comprobar que el envío de mails funciona.
// Imprime la URL donde leer el correo. Se corre a mano con:
//     node backend/scripts/probarCorreo.js
// ============================================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { enviarCorreo } = require('../services/emailService');


// Manda un correo de ejemplo al buzón de pruebas
async function probarCorreo() {
    try {
        const resultado = await enviarCorreo({
            to: 'destinatario@example.com',
            subject: 'Prueba de correo',
            text: 'El envío de correos de prueba funciona correctamente.',
            html: `
                <h2>Gestión de Turnos Médicos</h2>
                <p>El servicio de correo funciona correctamente.</p>
            `
        });

        console.log('Prueba completada.');
        console.log('ID:', resultado.messageId);

    } catch (error) {
        console.error('Error al enviar el correo:', error.message);
    }
}


probarCorreo();
