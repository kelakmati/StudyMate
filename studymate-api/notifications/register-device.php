<?php
/**
 * StudyMate API – Week 11: Push Notification
 * ANGGOTA 1 – Device Registration Endpoint
 *
 * POST /notifications/register-device.php
 * Header: Authorization: Bearer <token>
 * Body: { "push_token": "ExponentPushToken[...]", "platform": "android"|"ios" }
 *
 * Menyimpan push token perangkat ke tabel device_tokens.
 * Jika token sudah ada, update user_id dan aktifkan kembali.
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
$platform = strtolower(trim($input['platform'] ?? 'android'));

// Validasi input
if (empty($pushToken)) {
    jsonResponse(false, 'push_token wajib diisi.', [], 400);
}

if (!in_array($platform, ['android', 'ios'])) {
    $platform = 'android';
}

// Validasi format Expo Push Token
if (!preg_match('/^ExponentPushToken\[.+\]$/', $pushToken) &&
    !preg_match('/^ExpoPushToken\[.+\]$/', $pushToken)) {
    jsonResponse(false, 'Format push_token tidak valid. Harus berformat ExponentPushToken[...].', [], 400);
}

try {
    $db = getDb();

    // Cek apakah token sudah terdaftar
    $stmt = $db->prepare('SELECT id, user_id, is_active FROM device_tokens WHERE push_token = ?');
    $stmt->execute([$pushToken]);
    $existing = $stmt->fetch();

    if ($existing) {
        // Token sudah ada – update user_id (mungkin user lain login di perangkat yang sama)
        // dan aktifkan kembali
        $update = $db->prepare(
            'UPDATE device_tokens SET user_id = ?, platform = ?, is_active = 1, updated_at = NOW() WHERE id = ?'
        );
        $update->execute([$userId, $platform, $existing['id']]);

        jsonResponse(true, 'Push token berhasil diperbarui.', [
            'token_id' => (int) $existing['id'],
            'is_new' => false,
        ]);
    } else {
        // Token baru – insert
        $insert = $db->prepare(
            'INSERT INTO device_tokens (user_id, push_token, platform, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())'
        );
        $insert->execute([$userId, $pushToken, $platform]);
        $newId = (int) $db->lastInsertId();

        jsonResponse(true, 'Push token berhasil didaftarkan.', [
            'token_id' => $newId,
            'is_new' => true,
        ]);
    }
} catch (PDOException $e) {
    error_log('[StudyMate] register-device error: ' . $e->getMessage());
    jsonResponse(false, 'Gagal menyimpan push token ke database.', [], 500);
}
