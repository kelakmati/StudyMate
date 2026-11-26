-- ============================================================
-- StudyMate DB – Week 11: Push Notification
-- Tabel device_tokens untuk menyimpan Expo Push Token per perangkat
-- ============================================================

USE `studymate_db`;

-- ── Tabel: device_tokens ──────────────────────────────────────────────────
-- Menyimpan push token perangkat yang terhubung dengan akun pengguna.
-- Satu pengguna bisa memiliki beberapa perangkat (token) yang aktif.
CREATE TABLE IF NOT EXISTS `device_tokens` (
    `id`         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `user_id`    INT UNSIGNED    NOT NULL,
    `push_token` VARCHAR(255)    NOT NULL,   -- Expo Push Token (ExponentPushToken[...])
    `platform`   VARCHAR(20)     NOT NULL DEFAULT 'android', -- 'android' | 'ios'
    `is_active`  TINYINT(1)      NOT NULL DEFAULT 1,
    `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_device_token` (`push_token`),
    KEY `idx_device_user` (`user_id`),
    KEY `idx_device_active` (`is_active`),
    CONSTRAINT `fk_device_user`
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tabel: notification_logs ──────────────────────────────────────────────
-- Log semua notifikasi yang dikirim untuk audit dan debugging.
CREATE TABLE IF NOT EXISTS `notification_logs` (
    `id`         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `user_id`    INT UNSIGNED    NOT NULL,
    `title`      VARCHAR(255)    NOT NULL,
    `body`       TEXT            NOT NULL,
    `data`       JSON            NULL,       -- Data payload tambahan (type, destination, etc.)
    `status`     VARCHAR(20)     NOT NULL DEFAULT 'sent', -- 'sent' | 'failed' | 'pending'
    `ticket_id`  VARCHAR(255)    NULL,       -- Expo Push Ticket ID untuk tracking
    `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_notiflog_user` (`user_id`),
    KEY `idx_notiflog_created` (`created_at`),
    CONSTRAINT `fk_notiflog_user`
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Verifikasi ─────────────────────────────────────────────────────────────
SELECT 'Tabel device_tokens dan notification_logs berhasil dibuat!' AS status;
