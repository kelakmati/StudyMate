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
    'sprint'      => 'Sprint 04 – Secure API Integration',
    'database'    => $dbStatus,
    'server_time' => date('Y-m-d H:i:s'),
    'endpoints'   => [
        'POST /auth/register.php' => 'Registrasi pengguna baru',
        'POST /auth/login.php'    => 'Login dan mendapatkan access token',
        'POST /auth/logout.php'   => 'Logout dan pencabutan token',
        'GET  /users/me.php'      => 'Protected: data pengguna yang login',
    ],
]);

