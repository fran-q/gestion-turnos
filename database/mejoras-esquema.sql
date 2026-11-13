-- ============================================================
-- Mejoras de integridad para la base `consultorio`
--
-- ESTE ARCHIVO NO ESTA APLICADO. Es opcional.
-- Las validaciones ya funcionan desde Node
-- (backend/validators/turnoValidator.js).
-- Esto agrega la misma proteccion a nivel base de datos, para que
-- tampoco entre basura desde Workbench, phpMyAdmin u otro cliente.
--
-- Para aplicarlo: ejecutar este archivo completo en MySQL/MariaDB.
-- Probado contra MariaDB 10.4 (XAMPP): los CHECK se aplican de verdad
-- desde la version 10.2, asi que en esta version funcionan.
-- ============================================================

USE `consultorio`;


-- ------------------------------------------------------------
-- 1) estado_turno: que no acepte cualquier texto ni NULL
--    Hoy es varchar(30) DEFAULT NULL, sin ninguna restriccion.
--    Las 31 filas actuales ya tienen un valor valido, asi que
--    el NOT NULL entra sin conflictos.
-- ------------------------------------------------------------

ALTER TABLE `turno`
    MODIFY `estado_turno` VARCHAR(30) NOT NULL;

ALTER TABLE `turno`
    ADD CONSTRAINT `chk_estado_turno`
    CHECK (`estado_turno` IN ('Reservado', 'Confirmado', 'Cancelado'));


-- ------------------------------------------------------------
-- 2) medio_solicitado: misma idea que estado_turno
--    Las 31 filas usan Web (20), Telefono (9) o WhatsApp (2),
--    ninguna esta en NULL, asi que el NOT NULL entra sin conflictos.
-- ------------------------------------------------------------

ALTER TABLE `turno`
    MODIFY `medio_solicitado` VARCHAR(50) NOT NULL;

ALTER TABLE `turno`
    ADD CONSTRAINT `chk_medio_solicitado`
    CHECK (`medio_solicitado` IN ('Web', 'Teléfono', 'WhatsApp'));


-- ------------------------------------------------------------
-- 3) medico_confirmacion: que solo acepte matriculas reales
--    Es la unica columna de referencia de `turno` que quedo sin
--    foreign key, por eso hoy entra cualquier numero.
--    Verificado: 0 filas huerfanas, el ALTER entra sin limpiar nada.
--    Queda nullable a proposito: un turno Reservado o Cancelado
--    no tiene medico confirmador.
-- ------------------------------------------------------------

ALTER TABLE `turno`
    ADD CONSTRAINT `fk_turno_medico_confirmacion`
    FOREIGN KEY (`medico_confirmacion`) REFERENCES `medico` (`matricula_medico`);


-- ------------------------------------------------------------
-- 4) Turno no duplicado, a nivel base de datos
--    Corresponde al "-BD" de la consigna. Impide que un mismo
--    paciente tenga dos turnos en la misma fecha y hora.
--    Verificado: 0 duplicados en las 31 filas actuales.
--
--    OJO, DIFERENCIA CON LA VALIDACION DE NODE:
--    En Node los turnos Cancelados NO ocupan la franja, asi que
--    un paciente puede cancelar y volver a sacar turno a la misma
--    hora. Este indice es mas estricto: no distingue estados, y
--    bloquearia ese caso. MySQL/MariaDB no soporta indices unicos
--    parciales (con WHERE), por eso no se puede replicar la regla
--    exacta. Aplicarlo solo si se acepta ese comportamiento.
-- ------------------------------------------------------------

ALTER TABLE `turno`
    ADD UNIQUE KEY `uq_turno_paciente_franja` (`dni_paciente`, `fecha_turno`, `hora_turno`);


-- ------------------------------------------------------------
-- NO SE PUEDEN HACER A NIVEL BASE DE DATOS:
--
-- * "fecha no anterior a hoy": un CHECK no admite funciones no
--   determinísticas como CURDATE(). Ademas 30 de los 31 turnos
--   actuales son historicos y quedarian invalidos. Va solo en Node.
--
-- * "franja horaria L-V 8-20, sabados 8-14": mismo problema, depende
--   de calcular el dia de la semana. Va solo en Node.
--
-- * "equipo no duplicado en el mismo horario": necesitaria un UNIQUE
--   sobre (id_equipo, fecha_turno, hora_turno), pero id_equipo admite
--   NULL y varios turnos sin equipo convivirian mal con el indice.
--   Va solo en Node.
-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- Para revertir todo, si hiciera falta:
--
-- ALTER TABLE `turno` DROP INDEX `uq_turno_paciente_franja`;
-- ALTER TABLE `turno` DROP FOREIGN KEY `fk_turno_medico_confirmacion`;
-- ALTER TABLE `turno` DROP CONSTRAINT `chk_medio_solicitado`;
-- ALTER TABLE `turno` DROP CONSTRAINT `chk_estado_turno`;
-- ALTER TABLE `turno` MODIFY `medio_solicitado` VARCHAR(50) DEFAULT NULL;
-- ALTER TABLE `turno` MODIFY `estado_turno` VARCHAR(30) DEFAULT NULL;
-- ------------------------------------------------------------
