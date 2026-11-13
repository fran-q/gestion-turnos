-- ============================================================
-- Registro de usuarios y verificacion por email
--
-- A DIFERENCIA DE mejoras-esquema.sql, ESTE SI HAY QUE APLICARLO:
-- sin estos cambios el registro y la verificacion no funcionan.
--
-- Para aplicarlo: ejecutar este archivo completo en MySQL/MariaDB.
-- ============================================================

USE `gestion_turnos`;


-- ------------------------------------------------------------
-- 1) Marca si el usuario ya confirmo su correo.
--    Los que se registran nacen en 0 y no pueden iniciar sesion
--    hasta abrir el enlace que les llega por mail.
-- ------------------------------------------------------------

ALTER TABLE `usuario`
    ADD COLUMN `email_verificado` TINYINT(1) NOT NULL DEFAULT 0;


-- El admin ya existia antes de esta funcionalidad: si queda en 0
-- se queda afuera del sistema.
UPDATE `usuario`
    SET `email_verificado` = 1
    WHERE `email` = 'admin@turnos.com';


-- ------------------------------------------------------------
-- 2) Tokens de un solo uso para verificar el correo y, mas
--    adelante, para recuperar la contrasena.
--
--    Guarda el SHA-256 del token, nunca el token original: si
--    alguien lee la tabla no puede usar los enlaces.
--    CHAR(64) es el largo exacto de un SHA-256 en hexadecimal.
--
--    ON DELETE CASCADE: si se borra el usuario, se van sus tokens.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `token_cuenta` (
    `id_token` INT AUTO_INCREMENT PRIMARY KEY,
    `id_usuario` INT NOT NULL,
    `token_hash` CHAR(64) NOT NULL UNIQUE,
    `tipo` ENUM(
        'VERIFICACION_EMAIL',
        'RECUPERACION_PASSWORD'
    ) NOT NULL,
    `fecha_expiracion` DATETIME NOT NULL,
    `usado` TINYINT(1) NOT NULL DEFAULT 0,
    `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY `idx_token_usuario_tipo` (`id_usuario`, `tipo`, `usado`),

    CONSTRAINT `fk_token_usuario`
        FOREIGN KEY (`id_usuario`)
        REFERENCES `usuario` (`id_usuario`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ------------------------------------------------------------
-- Para revertir, si hiciera falta:
--
-- DROP TABLE `token_cuenta`;
-- ALTER TABLE `usuario` DROP COLUMN `email_verificado`;
-- ------------------------------------------------------------
