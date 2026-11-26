<?php
/**
 * StudyMate API – Week 11: Push Notification
 * ANGGOTA 2 – Server Push Notification Endpoint
 *
 * POST /notifications/send.php
 * Header: Authorization: Bearer <token>
 * Body: {
 *   "target_user_id": 1,       (opsional, default = user yang login)
 *   "title": "Reminder Tugas",
 *   "body": "Deadline tugas Mobile Programming besok!",
 *   "data": { "type": "task_reminder", "destination": "Tasks" }
 * }
 *
 * Mengirim push notification ke perangkat pengguna target melalui Expo Push Service.
 * Jika target_user_id tidak diberikan, mengirim ke diri sendiri (user yang login).
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

// Hanya terima POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method not allowed. Gunakan POST.', [], 405);
}

// Autentikasi
$payload = requireAuth();
$senderId = (int) $payload['sub'];

// Parsing body
$input = json_decode(file_get_contents('php://input'), true);
$targetUserId = (int) ($input['target_user_id'] ?? $senderId);
$title = trim($input['title'] ?? '');
$body = trim($input['body'] ?? '');
$data = $input['data'] ?? [];

// Validasi
if (empty($title)) {
    jsonResponse(false, 'Field "title" wajib diisi.', [], 400);
}
if (empty($body)) {
    jsonResponse(false, 'Field "body" wajib diisi.', [], 400);
}

try {
    $db = getDb();

    // Ambil semua token aktif milik target user
    $stmt = $db->prepare(
        'SELECT push_token FROM device_tokens WHERE user_id = ? AND is_active = 1'
    );
    $stmt->execute([$targetUserId]);
    $tokens = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (empty($tokens)) {
        // Log notifikasi meskipun tidak ada token terdaftar
        $logStmt = $db->prepare(
            'INSERT INTO notification_logs (user_id, title, body, data, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())'
        );
        $logStmt->execute([$targetUserId, $title, $body, json_encode($data), 'no_device']);

        jsonResponse(false, 'Tidak ada perangkat terdaftar untuk pengguna target.', [
            'target_user_id' => $targetUserId,
            'tokens_found' => 0,
        ], 404);
    }

    // Siapkan payload untuk Expo Push Service
    $messages = [];
    foreach ($tokens as $token) {
        $messages[] = [
            'to' => $token,
            'sound' => 'default',
            'title' => $title,
            'body' => $body,
            'data' => !empty($data) ? $data : new \stdClass(),
            'priority' => 'high',
            'channelId' => 'studymate-notifications',
        ];
    }

    // Kirim ke Expo Push Service
    $ch = curl_init('https://exp.host/--/api/v2/push/send');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Accept-Encoding: gzip, deflate',
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode($messages),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        error_log('[StudyMate] Expo Push curl error: ' . $curlError);

        $logStmt = $db->prepare(
            'INSERT INTO notification_logs (user_id, title, body, data, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())'
        );
        $logStmt->execute([$targetUserId, $title, $body, json_encode($data), 'failed']);

        jsonResponse(false, 'Gagal menghubungi Expo Push Service: ' . $curlError, [], 502);
    }

    $responseData = json_decode($response, true);

    // Extract ticket IDs dari response
    $ticketIds = [];
    $failedTokens = [];
    if (isset($responseData['data']) && is_array($responseData['data'])) {
        foreach ($responseData['data'] as $i => $ticket) {
            if (($ticket['status'] ?? '') === 'ok') {
                $ticketIds[] = $ticket['id'] ?? 'unknown';
            } else {
                $failedTokens[] = [
                    'token' => $tokens[$i] ?? 'unknown',
                    'error' => $ticket['message'] ?? $ticket['details']['error'] ?? 'unknown error',
                ];
            }
        }
    }

    // Log notifikasi ke database
    $status = empty($failedTokens) ? 'sent' : (empty($ticketIds) ? 'failed' : 'partial');
    $ticketIdStr = implode(',', $ticketIds);

    $logStmt = $db->prepare(
        'INSERT INTO notification_logs (user_id, title, body, data, status, ticket_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())'
    );
    $logStmt->execute([$targetUserId, $title, $body, json_encode($data), $status, $ticketIdStr]);

    jsonResponse(true, 'Push notification berhasil dikirim.', [
        'target_user_id' => $targetUserId,
        'tokens_sent' => count($ticketIds),
        'tokens_failed' => count($failedTokens),
        'tickets' => $ticketIds,
        'failed_details' => $failedTokens,
        'expo_response_code' => $httpCode,
    ]);

} catch (PDOException $e) {
    error_log('[StudyMate] send notification error: ' . $e->getMessage());
    jsonResponse(false, 'Gagal mengirim notifikasi.', [], 500);
}
