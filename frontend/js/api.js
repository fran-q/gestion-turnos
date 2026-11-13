// ============================================================
// api.js
// Reúne todas las llamadas al backend. Es el único archivo del
// frontend que usa fetch: las pantallas llaman a estas funciones
// y no se enteran de URLs ni de headers.
// ============================================================

const API_URL = 'http://localhost:3000/api';


// Devuelve los datos del usuario y el token si las credenciales sirven
async function iniciarSesion(email, password) {
    const respuesta = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.error || 'No se pudo iniciar sesión');
    }

    return datos;
}


// Las dos altas cambian solo la ruta, así que comparten el envío
async function registrarPaciente(datos) {
    return enviarRegistro('/auth/registro/paciente', datos);
}


async function registrarMedico(datos) {
    return enviarRegistro('/auth/registro/medico', datos);
}


async function enviarRegistro(ruta, datos) {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos)
    });

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(resultado.error || 'No se pudo completar el registro');
    }

    return resultado;
}


// Activa la cuenta con el token que venía en el enlace del correo
async function verificarEmail(token) {
    const respuesta = await fetch(
        `${API_URL}/auth/verificar-email?token=${encodeURIComponent(token)}`
    );

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(resultado.error || 'No se pudo verificar el correo');
    }

    return resultado;
}


// Trae los turnos; los filtros son opcionales y van por querystring
async function obtenerTurnos(token, filtros = {}) {
    const parametros = new URLSearchParams();

    // Los filtros vacíos no se mandan, para no ensuciar la URL
    for (const [clave, valor] of Object.entries(filtros)) {
        if (valor) parametros.append(clave, valor);
    }

    const consulta = parametros.toString();
    const url = consulta ? `${API_URL}/turnos?${consulta}` : `${API_URL}/turnos`;

    // El token viaja en el header en cada pedido
    const respuesta = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    // Se marca aparte para que la pantalla mande al login en vez de mostrar un error
    if (respuesta.status === 401 || respuesta.status === 403) {
        const error = new Error('Tu sesión venció. Iniciá sesión de nuevo.');
        error.sesionInvalida = true;
        throw error;
    }

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.error || 'No se pudieron obtener los turnos');
    }

    return datos;
}
