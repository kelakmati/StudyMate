-- ============================================================
-- StudyMate DB – Sprint 04: Secure API Integration
-- Anggota 1 – Database & Backend Setup
--
-- Langkah penggunaan:
--   1. Buka phpMyAdmin di http://localhost/phpmyadmin
--   2. Klik tab "SQL"
--   3. Paste seluruh isi file ini
--   4. Klik "Go"
-- ============================================================

-- Buat database jika belum ada
CREATE DATABASE IF NOT EXISTS `studymate_db`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `studymate_db`;

-- ── Tabel: users ──────────────────────────────────────────────────────────
-- Menyimpan data akun mahasiswa.
-- Password TIDAK disimpan sebagai plaintext; gunakan bcrypt (password_hash).
CREATE TABLE IF NOT EXISTS `users` (
    `id`         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(100)    NOT NULL,
    `email`      VARCHAR(191)    NOT NULL,
    `password`   VARCHAR(255)    NOT NULL,  -- bcrypt hash
    `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tabel: active_sessions ─────────────────────────────────────────────────
-- Menyimpan daftar sesi aktif untuk mendukung pencabutan token saat logout.
-- Strategi: Stateful JWT Revocation via DB session table.
-- Kolom token_hash menyimpan SHA-256 dari token asli (bukan token itu sendiri).
CREATE TABLE IF NOT EXISTS `active_sessions` (
    `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `user_id`     INT UNSIGNED    NOT NULL,
    `token_hash`  VARCHAR(64)     NOT NULL,   -- SHA-256 hex (64 karakter)
    `expires_at`  DATETIME        NOT NULL,
    `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_sessions_token_hash` (`token_hash`),
    KEY `idx_sessions_user_id`  (`user_id`),
    KEY `idx_sessions_expires`  (`expires_at`),
    CONSTRAINT `fk_sessions_user`
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Event: Hapus Sesi Kadaluwarsa Otomatis ─────────────────────────────────
-- Opsional: Jalankan jika MySQL Event Scheduler aktif.
-- Pembersihan otomatis setiap jam untuk sesi yang sudah expired.
-- DROP EVENT IF EXISTS `cleanup_expired_sessions`;
-- CREATE EVENT `cleanup_expired_sessions`
--     ON SCHEDULE EVERY 1 HOUR
--     DO DELETE FROM `active_sessions` WHERE `expires_at` < NOW();

-- ── Data Dummy untuk Testing ───────────────────────────────────────────────
-- Password untuk kedua akun ini adalah: "Password123"
-- Hash dibuat menggunakan: password_hash('Password123', PASSWORD_BCRYPT, ['cost' => 10])
-- Diverifikasi: password_verify('Password123', hash) = TRUE
INSERT IGNORE INTO `users` (`name`, `email`, `password`, `created_at`) VALUES
(
    'Ahmad Faiz Pratama',
    'ahmad@studymate.id',
    '$2y$10$gtY1kCmeD3pG1SrEJEyp0uehXrZOQmgFchXDzYQzqL/B9OEq31OVu',
    NOW()
),
(
    'Siti Nurhaliza',
    'siti@studymate.id',
    '$2y$10$gtY1kCmeD3pG1SrEJEyp0uehXrZOQmgFchXDzYQzqL/B9OEq31OVu',
    NOW()
);

-- ── Verifikasi ─────────────────────────────────────────────────────────────
SELECT 'Database studymate_db berhasil dibuat!' AS status;
SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = 'studymate_db';

