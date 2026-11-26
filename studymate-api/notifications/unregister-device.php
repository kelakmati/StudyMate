<?php
/**
 * StudyMate API – Week 11: Push Notification
 * ANGGOTA 1 – Device Unregistration Endpoint
 *
 * POST /notifications/unregister-device.php
 * Header: Authorization: Bearer <token>
 * Body: { "push_token": "ExponentPushToken[...]" }
 *
 * Menonaktifkan push token perangkat saat user logout.
 * Token tidak dihapus, hanya dinonaktifkan (is_active = 0)
 * agar histori tetap tersimpan.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

// Hanya terima POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method not allowed. Gunakan POST.', [], 405);
}

// Autentikasi – ambil user_id dari JWT
$payload = requireAuth();
$userId = (int) $payload['sub'];

// Parsing body JSON
$input = json_decode(file_get_contents('php://input'), true);
$pushToken = trim($input['push_token'] ?? '');

if (empty($pushToken)) {
    // Jika token tidak dikirim, nonaktifkan SEMUA token milik user ini
    try {
        $db = getDb();
        $stmt = $db->prepare('UPDATE device_tokens SET is_active = 0, updated_at = NOW() WHERE user_id = ?');
        $stmt->execute([$userId]);

        jsonResponse(true, 'Semua push token untuk user ini berhasil dinonaktifkan.', [
            'deactivated_count' => $stmt->rowCount(),
        ]);
    } catch (PDOException $e) {
        error_log('[StudyMate] unregister-device (all) error: ' . $e->getMessage());
        jsonResponse(false, 'Gagal menonaktifkan push token.', [], 500);
    }
} else {
    // Nonaktifkan token spesifik
    try {
        $db = getDb();
        $stmt = $db->prepare(
            'UPDATE device_tokens SET is_active = 0, updated_at = NOW() WHERE push_token = ? AND user_id = ?'
        );
        $stmt->execute([$pushToken, $userId]);

        if ($stmt->rowCount() > 0) {
            jsonResponse(true, 'Push token berhasil dinonaktifkan.');
        } else {
            jsonResponse(true, 'Push token tidak ditemukan atau sudah nonaktif.');
        }
    } catch (PDOException $e) {
        error_log('[StudyMate] unregister-device error: ' . $e->getMessage());
        jsonResponse(false, 'Gagal menonaktifkan push token.', [], 500);
    }
}
