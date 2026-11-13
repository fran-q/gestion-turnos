// ============================================================
// dashboard.js
// Maneja el panel: controla que haya sesión, adapta la pantalla al
// perfil del usuario, mueve el menú y arma la tabla de turnos.
// ============================================================

const token = sessionStorage.getItem('token');


// Nombres de los roles, según la tabla rol
const NOMBRE_ROL = {
    1: 'Administrador',
    2: 'Médico',
    3: 'Paciente'
};


// Los turnos se piden una sola vez, no en cada clic del menú
let turnosCargados = false;


if (!token) {
    // Sin token no hay nada que mostrar: de vuelta al login
    window.location.href = '../index.html';

} else {
    mostrarUsuario();
    adaptarAlPerfil();
    prepararCerrarSesion();
    prepararMenu();
    prepararFiltros();
}


// Ajusta la pantalla al rol. Es comodidad: el control de verdad lo hace el backend.
function adaptarAlPerfil() {
    const rol = Number(usuarioActual().id_rol);

    const titulo = {
        1: 'Panel principal',
        2: 'Turnos de mi servicio',
        3: 'Mis turnos'
    };

    document.querySelector('.encabezado h1').textContent =
        titulo[rol] || 'Panel principal';

    // Un paciente ve solo los suyos, así que el buscador no le sirve
    if (rol === 3) {
        document.getElementById('filtroTexto').closest('div').classList.add('oculta');
    }
}


// Datos del usuario que guardó el login
function usuarioActual() {
    try {
        return JSON.parse(sessionStorage.getItem('usuario')) || {};
    } catch (error) {
        return {};
    }
}


// Conecta el formulario de filtros con la recarga de la tabla
function prepararFiltros() {
    const formulario = document.getElementById('filtros');

    formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        cargarTurnos(filtrosActuales());
    });

    document.getElementById('limpiarFiltros').addEventListener('click', function () {
        formulario.reset();
        cargarTurnos();
    });
}


function filtrosActuales() {
    return {
        fecha: document.getElementById('filtroFecha').value,
        estado: document.getElementById('filtroEstado').value,
        texto: document.getElementById('filtroTexto').value.trim()
    };
}


// Hace que los enlaces del menú alternen las secciones
function prepararMenu() {
    const enlaces = document.querySelectorAll('#menu a[data-seccion]');

    enlaces.forEach(function (enlace) {
        enlace.addEventListener('click', function (evento) {
            evento.preventDefault();
            mostrarSeccion(enlace.dataset.seccion);
        });
    });

    // Al entrar se muestra Inicio
    mostrarSeccion('inicio');
}


function mostrarSeccion(nombre) {
    // Deja visible solo la sección elegida
    document.querySelectorAll('section[data-seccion]').forEach(function (seccion) {
        seccion.classList.toggle('oculta', seccion.dataset.seccion !== nombre);
    });

    // Y marca cuál es el enlace activo
    document.querySelectorAll('#menu a[data-seccion]').forEach(function (enlace) {
        enlace.classList.toggle('activo', enlace.dataset.seccion === nombre);
    });

    if (nombre === 'turnos' && !turnosCargados) {
        turnosCargados = true;
        cargarTurnos();
    }
}


// Muestra el email y el rol en el encabezado
function mostrarUsuario() {
    const datosUsuario = document.getElementById('datosUsuario');

    let usuario = {};

    try {
        usuario = JSON.parse(sessionStorage.getItem('usuario')) || {};
    } catch (error) {
        usuario = {};
    }

    if (usuario.email) {
        datosUsuario.textContent =
            `${usuario.email} · ${NOMBRE_ROL[usuario.id_rol] || 'Rol ' + usuario.id_rol}`;
    } else {
        datosUsuario.textContent = 'Sesión iniciada correctamente';
    }
}


// Borra la sesión y vuelve al login
function prepararCerrarSesion() {
    const botonCerrarSesion = document.getElementById('cerrarSesion');

    botonCerrarSesion.addEventListener('click', function () {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('usuario');
        window.location.href = '../index.html';
    });
}


// Pide los turnos a la API y los dibuja en la tabla
async function cargarTurnos(filtros = {}) {
    const contenedor = document.getElementById('listaTurnos');

    contenedor.innerHTML = '<p class="cargando">Cargando turnos...</p>';

    try {
        const turnos = await obtenerTurnos(token, filtros);

        if (turnos.length === 0) {
            contenedor.innerHTML = '<p class="sin-datos">No se encontraron turnos con esos criterios.</p>';
            return;
        }

        contenedor.innerHTML = `
            <p class="resumen">${turnos.length} turnos registrados</p>
            <div class="tabla-scroll">
                <table class="tabla-turnos">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>Paciente</th>
                            <th>Práctica</th>
                            <th>Servicio</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${turnos.map(armarFila).join('')}
                    </tbody>
                </table>
            </div>
        `;

    } catch (error) {
        // Si la sesión venció, no se muestra error: se vuelve al login
        if (error.sesionInvalida) {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('usuario');
            window.location.href = '../index.html';
            return;
        }

        // Si falló, se permite reintentar al volver a la sección
        turnosCargados = false;

        contenedor.innerHTML = `<p class="error-carga">${escaparHtml(error.message)}</p>`;
        console.error(error);
    }
}


function armarFila(turno) {
    // La fecha llega como timestamp y la hora con segundos: se formatean acá
    const fecha = new Date(turno.fecha_turno).toLocaleDateString('es-AR');
    const hora = String(turno.hora_turno).slice(0, 5);

    const paciente = `${turno.apellido_paciente}, ${turno.nombre_paciente}`;

    // Los turnos vencidos se muestran atenuados
    const claseFila = Number(turno.ya_paso) === 1 ? 'pasado' : '';

    // El estado se pasa a clase CSS para pintarlo con color
    const claseEstado = String(turno.estado_turno).toLowerCase();

    return `
        <tr class="${claseFila}">
            <td>${escaparHtml(fecha)}</td>
            <td>${escaparHtml(hora)}</td>
            <td>${escaparHtml(paciente)}</td>
            <td>${escaparHtml(turno.nombre_practica)}</td>
            <td>${escaparHtml(turno.nombre_servicio)}</td>
            <td><span class="estado ${claseEstado}">${escaparHtml(turno.estado_turno)}</span></td>
        </tr>
    `;
}


// Como la tabla se arma con innerHTML, el texto de la base se escapa antes
function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';

    return div.innerHTML;
}
