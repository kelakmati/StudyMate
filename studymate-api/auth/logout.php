<?php
/**
 * StudyMate API - Logout Endpoint
 * ANGGOTA 1 – Backend REST API dan Database
 * 
 * Method: POST
 * URL:    /studymate-api/auth/logout.php
 * Header: Authorization: Bearer <token>
 * 
 * Alur Pencabutan Token (Token Revocation):
 *  1. Validasi keberadaan Bearer Token di header
 *  2. Hapus baris sesi dari tabel active_sessions berdasarkan token_hash
 *  3. Kembalikan respons sukses
 * 
 * Catatan: Karena token dihapus dari active_sessions, middleware requireAuth()
 *          akan menolak token ini meskipun JWT-nya secara kriptografis masih valid.
 *          Ini adalah mekanisme "stateful JWT revocation" yang aman.
 */

require_once __DIR__ . '/../config/database.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method tidak diizinkan. Gunakan POST.', [], 405);
}

// ── Ambil Bearer Token ─────────────────────────────────────────────────────
$token = getBearerToken();

if (!$token) {
    jsonResponse(false, 'Tidak ada token. Anda mungkin sudah logout.', [], 401);
}

// ── Verifikasi JWT signature (opsional tapi disarankan) ────────────────────
$payload = verifyJWT($token);
// Kita tetap lanjutkan penghapusan sesi bahkan jika token sudah expired,
// untuk memastikan sesi bersih di sisi server.

// ── Hapus Sesi dari Database ───────────────────────────────────────────────
$db = getDb();
$tokenHash = hash('sha256', $token);

$stmt = $db->prepare('DELETE FROM active_sessions WHERE token_hash = ?');
$stmt->execute([$tokenHash]);

$rowsDeleted = $stmt->rowCount();

// ── Response ───────────────────────────────────────────────────────────────
if ($rowsDeleted > 0) {
    jsonResponse(true, 'Logout berhasil. Sesi telah dihapus dari server.');
} else {
    // Sesi memang tidak ada atau sudah kadaluwarsa – tetap anggap logout berhasil
    jsonResponse(true, 'Logout berhasil. Sesi sudah tidak aktif.');
}

