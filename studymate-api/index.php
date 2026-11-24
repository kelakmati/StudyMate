<?php
/**
 * StudyMate API - Index / Health Check
 * 
 * Method: GET
 * URL:    /studymate-api/index.php
 * 
 * Digunakan untuk memverifikasi bahwa backend API berjalan.
 * Berguna saat pertama kali konfigurasi XAMPP.
 */

require_once __DIR__ . '/config/database.php';

setCorsHeaders();

$dbStatus = 'disconnected';
try {
    $db = getDb();
    $db->query('SELECT 1');
    $dbStatus = 'connected';
} catch (Exception $e) {
    $dbStatus = 'error: ' . $e->getMessage();
}

jsonResponse(true, 'StudyMate API berjalan dengan baik.', [
    'version'     => '1.0.0',
    'sprint'      => 'Week 8 – User Data Isolation & Profile Management',
    'database'    => $dbStatus,
    'server_time' => date('Y-m-d H:i:s'),
    'endpoints'   => [
        // ── Auth ──────────────────────────────────────────────────────────
        'POST  /auth/register.php'           => 'Registrasi pengguna baru',
        'POST  /auth/login.php'              => 'Login dan mendapatkan access token',
        'POST  /auth/logout.php'             => 'Logout dan pencabutan token',
        // ── Users (Protected) ──────────────────────────────────────────
        'GET   /users/me.php'                => 'Protected: data pengguna yang login (incl. avatar_path)',
        'PATCH /users/update-profile.php'    => 'Protected: update nama profil pengguna',
        'POST  /users/upload-avatar.php'     => 'Protected: upload foto profil (multipart/form-data, field: avatar)',
        // ── Courses (Protected, per-user) ──────────────────────────────
        'GET   /courses/index.php'           => 'Protected: list mata kuliah milik user',
        'POST  /courses/index.php'           => 'Protected: tambah mata kuliah baru',
        'PUT   /courses/index.php?id={id}'   => 'Protected: update mata kuliah (full replace)',
        'DELETE /courses/index.php?id={id}'  => 'Protected: hapus mata kuliah',
        // ── Tasks (Protected, per-user) ────────────────────────────────
        'GET   /tasks/index.php'             => 'Protected: list tugas milik user',
        'POST  /tasks/index.php'             => 'Protected: tambah tugas baru',
        'PATCH /tasks/index.php?id={id}'     => 'Protected: update tugas (partial: completed, title, dll)',
        'DELETE /tasks/index.php?id={id}'    => 'Protected: hapus tugas',
        // ── Materials (Protected, per-user) ────────────────────────────
        'GET   /materials/index.php'         => 'Protected: list materi milik user',
        'POST  /materials/index.php'         => 'Protected: tambah materi baru',
        'PUT   /materials/index.php?id={id}' => 'Protected: update materi (is_studied, notes, dll)',
        'DELETE /materials/index.php?id={id}' => 'Protected: hapus materi',
    ],
]);

