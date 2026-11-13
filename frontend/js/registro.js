// ============================================================
// registro.js
// Maneja el alta de cuentas: cambia los campos según si se registra
// un paciente o un médico, y manda el formulario a la API.
// ============================================================

const formulario = document.getElementById('formRegistro');
const mensaje = document.getElementById('mensaje');
const boton = formulario.querySelector('button[type="submit"]');

// Arranca en paciente, que es el caso más común
let tipo = 'paciente';


// Las pestañas cambian qué campos se piden
document.querySelectorAll('#pestanas button').forEach(function (pestana) {
    pestana.addEventListener('click', function () {
        tipo = pestana.dataset.tipo;

        document.querySelectorAll('#pestanas button').forEach(function (b) {
            b.classList.toggle('activa', b.dataset.tipo === tipo);
        });

        // Muestra solo los campos del tipo elegido
        document.querySelectorAll('[data-campos]').forEach(function (grupo) {
            grupo.classList.toggle('oculta', grupo.dataset.campos !== tipo);
        });

        mensaje.textContent = '';
    });
});


// Arma el objeto según el tipo elegido y lo manda a la API
formulario.addEventListener('submit', async function (evento) {
    evento.preventDefault();

    mensaje.textContent = '';
    boton.disabled = true;
    boton.textContent = 'Creando cuenta...';

    try {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        let resultado;

        if (tipo === 'paciente') {
            resultado = await registrarPaciente({
                dni_paciente: document.getElementById('dni').value,
                nombre_paciente: document.getElementById('nombre').value.trim(),
                apellido_paciente: document.getElementById('apellido').value.trim(),
                fec_nac_paciente: document.getElementById('fechaNacimiento').value,
                email: email,
                password: password
            });

        } else {
            resultado = await registrarMedico({
                matricula_medico: document.getElementById('matricula').value,
                email: email,
                password: password
            });
        }

        mensaje.textContent = resultado.mensaje;
        mensaje.style.color = 'green';

        formulario.reset();

    } catch (error) {
        mensaje.textContent = error.message;
        mensaje.style.color = 'red';

    } finally {
        boton.disabled = false;
        boton.textContent = 'Crear cuenta';
    }
});
