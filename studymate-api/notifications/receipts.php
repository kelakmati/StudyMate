<?php
/**
 * StudyMate API – Week 11: Push Notification
 * ANGGOTA 2 – Expo Push Receipt Checker Endpoint
 *
 * POST /notifications/receipts.php
 * Header: Authorization: Bearer <token>
 * Body: { "ticket_ids": ["xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"] }
 *
 * Memeriksa status pengiriman (push receipt) dari Expo Push Service
 * untuk membedakan apakah request hanya diterima oleh provider atau
 * sudah diproses/dikirim ke layanan OS perangkat (FCM/APNs).
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method not allowed. Gunakan POST.', [], 405);
}

$payload = requireAuth();
$userId = (int) $payload['sub'];

$input = json_decode(file_get_contents('php://input'), true);
$ticketIds = $input['ticket_ids'] ?? [];

if (!is_array($ticketIds) || empty($ticketIds)) {
    jsonResponse(false, 'Field "ticket_ids" wajib berupa array berisi minimal 1 ticket ID.', [], 400);
}

// Sanitasi ticket IDs
$cleanIds = array_values(array_filter(array_map('trim', $ticketIds), fn($id) => !empty($id)));
if (empty($cleanIds)) {
    jsonResponse(false, 'Tidak ada ticket ID yang valid.', [], 400);
}

$ch = curl_init('https://exp.host/--/api/v2/push/getReceipts');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'Accept-Encoding: gzip, deflate',
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode(['ids' => $cleanIds]),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    error_log('[StudyMate] Expo Push receipts curl error: ' . $curlError);
    jsonResponse(false, 'Gagal menghubungi Expo Push Receipt API: ' . $curlError, [], 502);
}

$responseData = json_decode($response, true);
if (!is_array($responseData)) {
    jsonResponse(false, 'Response tidak valid dari Expo Push Receipt API.', [
        'expo_response_code' => $httpCode,
    ], 502);
}

jsonResponse(true, 'Push receipts berhasil diperiksa.', [
    'requested_by_user_id' => $userId,
    'expo_response_code' => $httpCode,
    'receipts' => $responseData['data'] ?? [],
]);
