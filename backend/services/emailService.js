// ============================================================
// emailService.js
// Manda los correos del sistema. Usa Ethereal, un buzón de prueba:
// los mails no salen a internet, se leen por una URL que queda en
// la consola del servidor.
// ============================================================

const nodemailer = require('nodemailer');


// Se guarda fuera de la función para crear la cuenta una sola vez
let transporter;


async function obtenerTransporter() {
    if (transporter) {
        return transporter;
    }

    const cuenta = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: cuenta.user,
            pass: cuenta.pass
        }
    });

    return transporter;
}


// Envía el correo y devuelve el enlace donde leerlo
async function enviarCorreo({ to, subject, text, html }) {
    const conexion = await obtenerTransporter();

    const info = await conexion.sendMail({
        from: '"Gestión de Turnos Médicos" <pruebas@gestion-turnos.test>',
        to,
        subject,
        text,
        html
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    // Se imprime porque es la única forma de ver el mail en pruebas
    console.log('Correo enviado al servicio de pruebas.');
    console.log('Asunto:', subject);
    console.log('Vista previa:', previewUrl);

    return {
        messageId: info.messageId,
        previewUrl
    };
}


module.exports = { enviarCorreo };
