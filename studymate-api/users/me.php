<?php
/**
 * StudyMate API - Protected Endpoint: GET /users/me.php
 * ANGGOTA 3 – Protected API, Integrasi, dan Pengujian
 * Week 8 Fix: Tambah university, major, semester ke response
 *
 * Method: GET
 * URL:    /studymate-api/users/me.php
 * Header: Authorization: Bearer <token>
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(false, 'Method tidak diizinkan. Gunakan GET.', [], 405);
}

// ── Validasi Token (WAJIB: tanpa token = 401) ─────────────────────────────
$authPayload = requireAuth();

// ── Ambil Data User dari Database ─────────────────────────────────────────
$db = getDb();
$stmt = $db->prepare(
    'SELECT id, name, email, avatar_path, university, major, semester, created_at FROM users WHERE id = ? LIMIT 1'
);
$stmt->execute([$authPayload['sub']]);
$user = $stmt->fetch();

if (!$user) {
    jsonResponse(false, 'User tidak ditemukan.', [], 404);
}

// ── Response Data User yang Login ─────────────────────────────────────────
jsonResponse(true, 'Data pengguna berhasil diambil.', [
    'user' => [
        'id'          => (int) $user['id'],
        'name'        => $user['name'],
        'email'       => $user['email'],
        'avatar_path' => $user['avatar_path'],
        'university'  => $user['university'],
        'major'       => $user['major'],
        'semester'    => $user['semester'] !== null ? (int) $user['semester'] : null,
        'created_at'  => $user['created_at'],
    ],
    'token_info' => [
        'issued_at'  => date('Y-m-d H:i:s', $authPayload['iat']),
        'expires_at' => date('Y-m-d H:i:s', $authPayload['exp']),
    ],
]);
