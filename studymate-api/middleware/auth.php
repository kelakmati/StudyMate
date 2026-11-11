<?php
/**
 * StudyMate API - Auth Middleware
 * ANGGOTA 1 – Token Validation Middleware
 * 
 * Dipanggil oleh setiap protected endpoint untuk memvalidasi Bearer Token.
 * Mengembalikan payload user jika token valid.
 * Menolak request dengan 401 Unauthorized jika token tidak valid / tidak ada.
 */

require_once __DIR__ . '/../config/database.php';

/**
 * Memvalidasi token dari Authorization header DAN memeriksa apakah
 * token terdaftar di tabel active_sessions (tidak diblacklist / logout).
 * 
 * Dua lapis keamanan:
 *  1. Verifikasi signature JWT (kriptografis – tanpa DB query)
 *  2. Pengecekan session aktif di DB (memungkinkan invalidasi setelah logout)
 * 
 * @return array Payload JWT yang sudah terverifikasi
 */
function requireAuth(): array {
    $token = getBearerToken();

    if (!$token) {
        jsonResponse(false, 'Unauthorized: Token tidak ditemukan. Silakan login terlebih dahulu.', [], 401);
    }

    // Layer 1: Verifikasi JWT signature & expiry
    $payload = verifyJWT($token);
    if (!$payload) {
        jsonResponse(false, 'Unauthorized: Token tidak valid atau sudah kadaluwarsa.', [], 401);
    }

    // Layer 2: Cek apakah token masih aktif di database (belum di-logout)
    $db = getDb();
    $stmt = $db->prepare(
        'SELECT id FROM active_sessions WHERE user_id = ? AND token_hash = ? AND expires_at > NOW()'
    );
    $tokenHash = hash('sha256', $token); // Simpan hash, bukan token asli
    $stmt->execute([$payload['sub'], $tokenHash]);

    if (!$stmt->fetch()) {
        jsonResponse(false, 'Unauthorized: Sesi tidak ditemukan atau sudah berakhir. Silakan login ulang.', [], 401);
    }

    return $payload;
}

