# Sistema de Gestión de Turnos Médicos

Aplicación web para administrar los turnos de un centro médico: pacientes, médicos, prácticas, equipos y la reserva de turnos, con cuentas de usuario y permisos según el perfil.

**Programación III — CENT 35 · 2026**

---

## Tecnologías

**Backend:** Node.js · Express · MySQL (mysql2)
**Seguridad:** JWT · bcrypt
**Correo:** Nodemailer
**Frontend:** HTML · CSS · JavaScript

---

## Cómo ejecutarlo

**1.** Iniciar MySQL desde XAMPP.

**2.** Importar la base, en este orden:

```
database/turnos.sql
database/registro-email.sql
```

**3.** Instalar las dependencias:

```bash
npm install
```

**4.** Crear el archivo `backend/.env`:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=gestion_turnos
DB_PORT=3306
JWT_SECRET=una_clave_larga_cualquiera
FRONTEND_URL=http://localhost:3000
```

**5.** Levantar el servidor:

```bash
npm start
```

**6.** Abrir **http://localhost:3000**

---

## Estructura

```
backend/     API REST: rutas, middlewares, controladores, servicios y validaciones
frontend/    Páginas, estilos y scripts del navegador
database/    Scripts SQL de la base
```

---

## Funcionalidades

- Registro de pacientes y médicos con verificación del correo
- Inicio de sesión con token JWT
- Tres perfiles con permisos distintos: administrador, médico y paciente
- Alta, consulta, reprogramación, confirmación, cancelación y eliminación de turnos
- Búsqueda y filtros por fecha, estado y paciente
- Validaciones de las reglas del centro antes de guardar un turno

---

## Documentación

El archivo `apuntes.md` detalla la estructura del proyecto, el flujo del sistema y los permisos de cada perfil.
