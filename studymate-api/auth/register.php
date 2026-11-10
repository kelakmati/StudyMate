<?php
/**
 * StudyMate API - Register Endpoint
 * ANGGOTA 1 – Backend REST API dan Database
 * 
 * Method: POST
 * URL:    /studymate-api/auth/register.php
 * Body:   { "name": "...", "email": "...", "password": "..." }
 * 
 * Alur:
 *  1. Validasi input (name, email, password)
 *  2. Cek duplikat email
 *  3. Hash password dengan password_hash() (bcrypt)
 *  4. Simpan user baru ke tabel users
 *  5. Kembalikan response JSON sukses / gagal
 */

require_once __DIR__ . '/../config/database.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method tidak diizinkan. Gunakan POST.', [], 405);
}

// ── Ambil dan decode body JSON ─────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);

$name     = trim($body['name']     ?? '');
$email    = strtolower(trim($body['email']    ?? ''));
$password = trim($body['password'] ?? '');

// ── Validasi Input ─────────────────────────────────────────────────────────
if (empty($name) || empty($email) || empty($password)) {
    jsonResponse(false, 'Semua field wajib diisi: name, email, password.', [], 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, 'Format email tidak valid.', [], 422);
}

if (strlen($password) < 6) {
    jsonResponse(false, 'Password minimal 6 karakter.', [], 422);
}

if (strlen($name) < 2) {
    jsonResponse(false, 'Nama minimal 2 karakter.', [], 422);
}

// ── Database Operation ─────────────────────────────────────────────────────
$db = getDb();

// Cek duplikat email (prepared statement → anti SQL Injection)
$stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    jsonResponse(false, 'Email sudah terdaftar. Gunakan email lain atau login.', [], 409);
}

// Hash password menggunakan bcrypt (TIDAK disimpan sebagai plaintext)
$hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

// Simpan user baru
$stmt = $db->prepare(
    'INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, NOW())'
);
$stmt->execute([$name, $email, $hashedPassword]);
$newUserId = (int) $db->lastInsertId();

// ── Response ───────────────────────────────────────────────────────────────
jsonResponse(true, 'Registrasi berhasil! Silakan login untuk melanjutkan.', [
    'user' => [
        'id'    => $newUserId,
        'name'  => $name,
        'email' => $email,
    ],
], 201);

