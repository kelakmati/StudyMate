<?php
/**
 * StudyMate API – Week 8 – Courses CRUD
 * ANGGOTA 1 – User Data Isolation
 *
 * GET    /courses/index.php           → list user's courses
 * POST   /courses/index.php           → create course
 * PUT    /courses/index.php?id={id}   → update course
 * DELETE /courses/index.php?id={id}   → delete course
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();
$authPayload = requireAuth();
$userId = (int) $authPayload['sub'];
$db = getDb();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $db->prepare('SELECT * FROM courses WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$userId]);
    $courses = $stmt->fetchAll();
    // Convert numeric types
    foreach ($courses as &$c) {
        $c['id'] = (int)$c['id'];
        $c['user_id'] = (int)$c['user_id'];
        $c['sks'] = (int)$c['sks'];
    }
    jsonResponse(true, 'Berhasil mengambil data mata kuliah.', ['courses' => $courses]);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $name = trim($body['name'] ?? '');
    if (empty($name)) jsonResponse(false, 'Nama mata kuliah wajib diisi.', [], 422);

    $stmt = $db->prepare('INSERT INTO courses (user_id, code, name, lecturer, day, time, room, sks, color) VALUES (?,?,?,?,?,?,?,?,?)');
    $stmt->execute([
        $userId,
        trim($body['code'] ?? ''),
        $name,
        trim($body['lecturer'] ?? ''),
        trim($body['day'] ?? ''),
        trim($body['time'] ?? ''),
        trim($body['room'] ?? ''),
        (int)($body['sks'] ?? 3),
        trim($body['color'] ?? '#4F46E5'),
    ]);
    $newId = (int)$db->lastInsertId();
    $stmt2 = $db->prepare('SELECT * FROM courses WHERE id = ?');
    $stmt2->execute([$newId]);
    $course = $stmt2->fetch();
    $course['id'] = (int)$course['id'];
    $course['user_id'] = (int)$course['user_id'];
    $course['sks'] = (int)$course['sks'];
    jsonResponse(true, 'Mata kuliah berhasil ditambahkan.', ['course' => $course], 201);
}

if ($method === 'PUT') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(false, 'ID mata kuliah diperlukan.', [], 422);

    // Verify ownership
    $check = $db->prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?');
    $check->execute([$id, $userId]);
    if (!$check->fetch()) jsonResponse(false, 'Mata kuliah tidak ditemukan atau akses ditolak.', [], 404);

    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $name = trim($body['name'] ?? '');
    if (empty($name)) jsonResponse(false, 'Nama mata kuliah wajib diisi.', [], 422);

    $stmt = $db->prepare('UPDATE courses SET code=?, name=?, lecturer=?, day=?, time=?, room=?, sks=?, color=? WHERE id=? AND user_id=?');
    $stmt->execute([
        trim($body['code'] ?? ''),
        $name,
        trim($body['lecturer'] ?? ''),
        trim($body['day'] ?? ''),
        trim($body['time'] ?? ''),
        trim($body['room'] ?? ''),
        (int)($body['sks'] ?? 3),
        trim($body['color'] ?? '#4F46E5'),
        $id, $userId,
    ]);
    jsonResponse(true, 'Mata kuliah berhasil diperbarui.');
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(false, 'ID mata kuliah diperlukan.', [], 422);

    $stmt = $db->prepare('DELETE FROM courses WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    if ($stmt->rowCount() === 0) jsonResponse(false, 'Mata kuliah tidak ditemukan atau akses ditolak.', [], 404);
    jsonResponse(true, 'Mata kuliah berhasil dihapus.');
}

jsonResponse(false, 'Method tidak diizinkan.', [], 405);
