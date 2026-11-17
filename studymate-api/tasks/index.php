<?php
/**
 * StudyMate API – Week 8 – Tasks CRUD (Async Todo List)
 * ANGGOTA 1 – User Data Isolation & ANGGOTA 2 – Async API
 *
 * GET    /tasks/index.php           → list user's tasks
 * POST   /tasks/index.php           → create task
 * PATCH  /tasks/index.php?id={id}   → update task (partial: completed, title, etc.)
 * DELETE /tasks/index.php?id={id}   → delete task
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();
$authPayload = requireAuth();
$userId = (int) $authPayload['sub'];
$db = getDb();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $db->prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY completed ASC, deadline ASC, created_at DESC');
    $stmt->execute([$userId]);
    $tasks = $stmt->fetchAll();
    foreach ($tasks as &$t) {
        $t['id'] = (int)$t['id'];
        $t['user_id'] = (int)$t['user_id'];
        $t['completed'] = (bool)$t['completed'];
        $t['course_id'] = $t['course_id'] ? (int)$t['course_id'] : null;
    }
    jsonResponse(true, 'Berhasil mengambil data tugas.', ['tasks' => $tasks]);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $title = trim($body['title'] ?? '');
    if (empty($title)) jsonResponse(false, 'Judul tugas wajib diisi.', [], 422);

    $stmt = $db->prepare('INSERT INTO tasks (user_id, course_id, course_name, title, description, deadline, priority, completed) VALUES (?,?,?,?,?,?,?,?)');
    $stmt->execute([
        $userId,
        ($body['course_id'] ?? null) ? (int)$body['course_id'] : null,
        trim($body['course_name'] ?? ''),
        $title,
        trim($body['description'] ?? ''),
        (!empty($body['deadline']) ? $body['deadline'] : null),
        trim($body['priority'] ?? 'Sedang'),
        0,
    ]);
    $newId = (int)$db->lastInsertId();
    $stmt2 = $db->prepare('SELECT * FROM tasks WHERE id = ?');
    $stmt2->execute([$newId]);
    $task = $stmt2->fetch();
    $task['id'] = (int)$task['id'];
    $task['completed'] = (bool)$task['completed'];
    $task['course_id'] = $task['course_id'] ? (int)$task['course_id'] : null;
    jsonResponse(true, 'Tugas berhasil ditambahkan.', ['task' => $task], 201);
}

if ($method === 'PATCH') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(false, 'ID tugas diperlukan.', [], 422);

    // Verify ownership
    $check = $db->prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?');
    $check->execute([$id, $userId]);
    if (!$check->fetch()) jsonResponse(false, 'Tugas tidak ditemukan atau akses ditolak.', [], 404);

    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    // Build dynamic SET clause for partial update
    $sets = [];
    $params = [];

    if (array_key_exists('completed', $body)) { $sets[] = 'completed = ?'; $params[] = $body['completed'] ? 1 : 0; }
    if (array_key_exists('title', $body) && trim($body['title']) !== '') { $sets[] = 'title = ?'; $params[] = trim($body['title']); }
    if (array_key_exists('description', $body)) { $sets[] = 'description = ?'; $params[] = trim($body['description'] ?? ''); }
    if (array_key_exists('deadline', $body)) { $sets[] = 'deadline = ?'; $params[] = !empty($body['deadline']) ? $body['deadline'] : null; }
    if (array_key_exists('priority', $body)) { $sets[] = 'priority = ?'; $params[] = trim($body['priority'] ?? 'Sedang'); }
    if (array_key_exists('course_name', $body)) { $sets[] = 'course_name = ?'; $params[] = trim($body['course_name'] ?? ''); }
    if (array_key_exists('course_id', $body)) { $sets[] = 'course_id = ?'; $params[] = $body['course_id'] ? (int)$body['course_id'] : null; }

    if (empty($sets)) jsonResponse(false, 'Tidak ada field yang diperbarui.', [], 422);

    $params[] = $id;
    $params[] = $userId;
    $db->prepare('UPDATE tasks SET ' . implode(', ', $sets) . ' WHERE id = ? AND user_id = ?')->execute($params);

    $stmt2 = $db->prepare('SELECT * FROM tasks WHERE id = ?');
    $stmt2->execute([$id]);
    $task = $stmt2->fetch();
    $task['id'] = (int)$task['id'];
    $task['completed'] = (bool)$task['completed'];
    jsonResponse(true, 'Tugas berhasil diperbarui.', ['task' => $task]);
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(false, 'ID tugas diperlukan.', [], 422);

    $stmt = $db->prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    if ($stmt->rowCount() === 0) jsonResponse(false, 'Tugas tidak ditemukan atau akses ditolak.', [], 404);
    jsonResponse(true, 'Tugas berhasil dihapus.');
}

jsonResponse(false, 'Method tidak diizinkan.', [], 405);
