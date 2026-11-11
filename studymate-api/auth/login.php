<?php
/**
 * StudyMate API - Login Endpoint
 * ANGGOTA 1 – Backend REST API dan Database
 * 
 * Method: POST
 * URL:    /studymate-api/auth/login.php
 * Body:   { "email": "...", "password": "..." }
 * 
 * Alur:
 *  1. Validasi input
 *  2. Cari user berdasarkan email (prepared statement)
 *  3. Verifikasi password menggunakan password_verify()
 *  4. Buat JWT access token
 *  5. Simpan sesi aktif ke tabel active_sessions (untuk revokasi saat logout)
 *  6. Kembalikan token dan data user
 */

require_once __DIR__ . '/../config/database.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method tidak diizinkan. Gunakan POST.', [], 405);
}

// ── Ambil dan decode body JSON ─────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);

$email    = strtolower(trim($body['email']    ?? ''));
$password = trim($body['password'] ?? '');

// ── Validasi Input ─────────────────────────────────────────────────────────
if (empty($email) || empty($password)) {
    jsonResponse(false, 'Email dan password wajib diisi.', [], 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, 'Format email tidak valid.', [], 422);
}

// ── Database Operation ─────────────────────────────────────────────────────
$db = getDb();

// Cari user berdasarkan email
$stmt = $db->prepare('SELECT id, name, email, password FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

// Verifikasi password menggunakan password_verify() (bcrypt-aware)
// PENTING: Jangan beri tahu user apakah email atau password yang salah (timing attack prevention)
if (!$user || !password_verify($password, $user['password'])) {
    jsonResponse(false, 'Email atau password salah.', [], 401);
}

// ── Buat Access Token (JWT HS256) ──────────────────────────────────────────
$userId      = (int) $user['id'];
$accessToken = createJWT($userId, $user['email']);
$tokenHash   = hash('sha256', $accessToken); // Simpan hash-nya di DB
$expiresAt   = date('Y-m-d H:i:s', time() + TOKEN_EXPIRY_SECONDS);

// ── Simpan Sesi Aktif ──────────────────────────────────────────────────────
// Hapus sesi lama user ini agar tidak menumpuk (opsional: izinkan multi-device)
$db->prepare('DELETE FROM active_sessions WHERE user_id = ?')->execute([$userId]);

// Simpan sesi baru
$stmt = $db->prepare(
    'INSERT INTO active_sessions (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, NOW())'
);
$stmt->execute([$userId, $tokenHash, $expiresAt]);

// ── Response ───────────────────────────────────────────────────────────────
jsonResponse(true, 'Login berhasil!', [
    'access_token' => $accessToken,
    'token_type'   => 'Bearer',
    'expires_in'   => TOKEN_EXPIRY_SECONDS,
    'user'         => [
        'id'    => $userId,
        'name'  => $user['name'],
        'email' => $user['email'],
    ],
]);

