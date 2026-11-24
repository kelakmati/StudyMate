<?php
/**
 * StudyMate API – Week 8 Fix – Update Profile (name + academic info)
 * PATCH /users/update-profile.php
 * Body: { name, university, major, semester }
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    jsonResponse(false, 'Method tidak diizinkan. Gunakan PATCH.', [], 405);
}

$authPayload = requireAuth();
$userId = (int) $authPayload['sub'];

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$name       = trim($body['name'] ?? '');
$university = trim($body['university'] ?? '');
$major      = trim($body['major'] ?? '');
$semester   = isset($body['semester']) && $body['semester'] !== '' ? (int) $body['semester'] : null;

if (empty($name)) jsonResponse(false, 'Nama tidak boleh kosong.', [], 422);
if (strlen($name) > 100) jsonResponse(false, 'Nama terlalu panjang (maksimal 100 karakter).', [], 422);
if (!empty($university) && strlen($university) > 150) jsonResponse(false, 'Nama universitas terlalu panjang.', [], 422);
if (!empty($major) && strlen($major) > 150) jsonResponse(false, 'Nama jurusan terlalu panjang.', [], 422);
if ($semester !== null && ($semester < 1 || $semester > 14)) jsonResponse(false, 'Semester harus antara 1 dan 14.', [], 422);

$db = getDb();

// Update nama, universitas, jurusan, semester
$stmt = $db->prepare(
    'UPDATE users SET name = ?, university = ?, major = ?, semester = ? WHERE id = ?'
);
$stmt->execute([
    $name,
    $university ?: null,
    $major ?: null,
    $semester,
    $userId,
]);

// Ambil data terbaru
$stmt2 = $db->prepare(
    'SELECT id, name, email, avatar_path, university, major, semester, created_at FROM users WHERE id = ?'
);
$stmt2->execute([$userId]);
$user = $stmt2->fetch();

jsonResponse(true, 'Profil berhasil diperbarui.', [
    'user' => [
        'id'          => (int) $user['id'],
        'name'        => $user['name'],
        'email'       => $user['email'],
        'avatar_path' => $user['avatar_path'],
        'university'  => $user['university'],
        'major'       => $user['major'],
        'semester'    => $user['semester'] !== null ? (int) $user['semester'] : null,
        'created_at'  => $user['created_at'],
    ],
]);
