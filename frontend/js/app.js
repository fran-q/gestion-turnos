// ============================================================
// app.js
// Maneja la pantalla de login: toma el formulario, llama a la API
// y, si entra, guarda el token y lleva al panel.
// ============================================================

const formulario = document.getElementById('formLogin');
const mensaje = document.getElementById('mensaje');
const boton = formulario.querySelector('button');


formulario.addEventListener('submit', async function (evento) {

    // Evita que el navegador recargue la página al enviar
    evento.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Se bloquea el botón para que no se envíe dos veces
    mensaje.textContent = '';
    boton.disabled = true;
    boton.textContent = 'Ingresando...';

    try {
        const datos = await iniciarSesion(email, password);

        // El panel lee esto de sessionStorage; se borra al cerrar la pestaña
        sessionStorage.setItem('token', datos.token);
        sessionStorage.setItem('usuario', JSON.stringify(datos.usuario));

        mensaje.textContent =
            `Bienvenida/o, ${datos.usuario.email}. Entrando al panel...`;

        mensaje.style.color = 'green';

        console.log('Login exitoso');
        console.log('Usuario:', datos.usuario);

        window.location.href = 'pages/dashboard.html';
        return;

    } catch (error) {
        // Muestra el mensaje que vino del backend
        mensaje.textContent = error.message;
        mensaje.style.color = 'red';

    } finally {
        boton.disabled = false;
        boton.textContent = 'Iniciar sesión';
    }
});
