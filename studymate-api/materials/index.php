<?php
/**
 * StudyMate API – Week 8 – Materials CRUD
 * ANGGOTA 1 – User Data Isolation
 *
 * GET    /materials/index.php           → list user's materials
 * POST   /materials/index.php           → create material
 * PUT    /materials/index.php?id={id}   → update material
 * DELETE /materials/index.php?id={id}   → delete material
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();
$authPayload = requireAuth();
$userId = (int) $authPayload['sub'];
$db = getDb();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $db->prepare('SELECT * FROM materials WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$userId]);
    $materials = $stmt->fetchAll();
    foreach ($materials as &$m) {
        $m['id'] = (int)$m['id'];
        $m['user_id'] = (int)$m['user_id'];
        $m['course_id'] = $m['course_id'] ? (int)$m['course_id'] : null;
        $m['meeting_number'] = (int)$m['meeting_number'];
        $m['is_studied'] = (bool)$m['is_studied'];
        $m['is_scanned'] = (bool)$m['is_scanned'];
    }
    jsonResponse(true, 'Berhasil mengambil data materi.', ['materials' => $materials]);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $title = trim($body['title'] ?? '');
    if (empty($title)) jsonResponse(false, 'Judul materi wajib diisi.', [], 422);

    $stmt = $db->prepare('INSERT INTO materials (user_id, course_id, course_name, meeting_number, meeting_topic, title, file_type, file_name, file_size, is_studied, user_notes, photo_uri, is_scanned) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $stmt->execute([
        $userId,
        ($body['course_id'] ?? null) ? (int)$body['course_id'] : null,
        trim($body['course_name'] ?? ''),
        (int)($body['meeting_number'] ?? 1),
        trim($body['meeting_topic'] ?? ''),
        $title,
        trim($body['file_type'] ?? 'PDF'),
        trim($body['file_name'] ?? ''),
        trim($body['file_size'] ?? ''),
        ($body['is_studied'] ?? false) ? 1 : 0,
        trim($body['user_notes'] ?? ''),
        trim($body['photo_uri'] ?? '') ?: null,
        ($body['is_scanned'] ?? false) ? 1 : 0,
    ]);
    $newId = (int)$db->lastInsertId();
    $stmt2 = $db->prepare('SELECT * FROM materials WHERE id = ?');
    $stmt2->execute([$newId]);
    $mat = $stmt2->fetch();
    $mat['id'] = (int)$mat['id'];
    $mat['is_studied'] = (bool)$mat['is_studied'];
    $mat['is_scanned'] = (bool)$mat['is_scanned'];
    $mat['meeting_number'] = (int)$mat['meeting_number'];
    jsonResponse(true, 'Materi berhasil ditambahkan.', ['material' => $mat], 201);
}

if ($method === 'PUT') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(false, 'ID materi diperlukan.', [], 422);

    $check = $db->prepare('SELECT id FROM materials WHERE id = ? AND user_id = ?');
    $check->execute([$id, $userId]);
    if (!$check->fetch()) jsonResponse(false, 'Materi tidak ditemukan atau akses ditolak.', [], 404);

    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $sets = [];
    $params = [];
    if (array_key_exists('is_studied', $body)) { $sets[] = 'is_studied = ?'; $params[] = $body['is_studied'] ? 1 : 0; }
    if (array_key_exists('user_notes', $body)) { $sets[] = 'user_notes = ?'; $params[] = trim($body['user_notes'] ?? ''); }
    if (array_key_exists('title', $body)) { $sets[] = 'title = ?'; $params[] = trim($body['title'] ?? ''); }
    if (array_key_exists('meeting_topic', $body)) { $sets[] = 'meeting_topic = ?'; $params[] = trim($body['meeting_topic'] ?? ''); }
    if (array_key_exists('meeting_number', $body)) { $sets[] = 'meeting_number = ?'; $params[] = (int)$body['meeting_number']; }

    if (empty($sets)) jsonResponse(false, 'Tidak ada field yang diperbarui.', [], 422);

    $params[] = $id;
    $params[] = $userId;
    $db->prepare('UPDATE materials SET ' . implode(', ', $sets) . ' WHERE id = ? AND user_id = ?')->execute($params);
    jsonResponse(true, 'Materi berhasil diperbarui.');
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(false, 'ID materi diperlukan.', [], 422);

    $stmt = $db->prepare('DELETE FROM materials WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    if ($stmt->rowCount() === 0) jsonResponse(false, 'Materi tidak ditemukan atau akses ditolak.', [], 404);
    jsonResponse(true, 'Materi berhasil dihapus.');
}

jsonResponse(false, 'Method tidak diizinkan.', [], 405);
