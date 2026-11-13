// ============================================================
// verificarEmail.js
// Maneja la página a la que lleva el enlace del correo. Saca el
// token de la URL, lo manda a la API y muestra si la cuenta quedó
// activada o si el enlace ya no sirve.
// ============================================================

const mensaje = document.getElementById('mensaje');


async function verificar() {

    // El enlace llega como verificar-email.html?token=abc123...
    const token = new URLSearchParams(window.location.search).get('token');

    if (!token) {
        mensaje.textContent = 'El enlace no incluye un token de verificación.';
        mensaje.style.color = 'red';
        return;
    }

    try {
        const resultado = await verificarEmail(token);

        mensaje.textContent = resultado.mensaje;
        mensaje.style.color = 'green';

    } catch (error) {
        // Enlace vencido, ya usado o inválido
        mensaje.textContent = error.message;
        mensaje.style.color = 'red';
    }
}


// Arranca sola al abrir la página
verificar();
