<?php
/**
 * StudyMate API – Week 11: Push Notification
 * ANGGOTA 3 – Notification History Endpoint
 *
 * GET /notifications/history.php
 * Header: Authorization: Bearer <token>
 * Query: ?limit=20&offset=0
 *
 * Mengembalikan riwayat notifikasi yang dikirim ke pengguna yang login.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

// Hanya terima GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(false, 'Method not allowed. Gunakan GET.', [], 405);
}

// Autentikasi
$payload = requireAuth();
$userId = (int) $payload['sub'];

// Query parameters
$limit = min(max((int) ($_GET['limit'] ?? 20), 1), 100);
$offset = max((int) ($_GET['offset'] ?? 0), 0);

try {
    $db = getDb();

    // Ambil total count
    $countStmt = $db->prepare('SELECT COUNT(*) as total FROM notification_logs WHERE user_id = ?');
    $countStmt->execute([$userId]);
    $total = (int) $countStmt->fetch()['total'];

    // Ambil data dengan pagination
    $stmt = $db->prepare(
        'SELECT id, title, body, data, status, ticket_id, created_at FROM notification_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    );
    $stmt->execute([$userId, $limit, $offset]);
    $logs = $stmt->fetchAll();

    // Parse JSON data field
    foreach ($logs as &$log) {
        $log['data'] = json_decode($log['data'], true) ?? [];
    }

    jsonResponse(true, 'Riwayat notifikasi berhasil diambil.', [
        'notifications' => $logs,
        'total' => $total,
        'limit' => $limit,
        'offset' => $offset,
    ]);

} catch (PDOException $e) {
    error_log('[StudyMate] notification history error: ' . $e->getMessage());
    jsonResponse(false, 'Gagal mengambil riwayat notifikasi.', [], 500);
}
