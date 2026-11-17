<?php
/**
 * StudyMate API – Week 8 – Upload Avatar
 * ANGGOTA 3 – Profile Management
 * POST /users/upload-avatar.php — upload profile photo
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method tidak diizinkan. Gunakan POST.', [], 405);
}

$authPayload = requireAuth();
$userId = (int) $authPayload['sub'];

if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
    $errCode = $_FILES['avatar']['error'] ?? -1;
    jsonResponse(false, 'File avatar tidak diterima. Error code: ' . $errCode, [], 422);
}

$file = $_FILES['avatar'];
$maxSize = 5 * 1024 * 1024; // 5MB
if ($file['size'] > $maxSize) {
    jsonResponse(false, 'Ukuran file terlalu besar. Maksimal 5MB.', [], 422);
}

$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);
if (!in_array($mimeType, $allowedTypes)) {
    jsonResponse(false, 'Format file tidak didukung. Gunakan JPG, PNG, atau GIF.', [], 422);
}

$uploadDir = __DIR__ . '/../uploads/avatars/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Delete old avatar
$db = getDb();
$stmt = $db->prepare('SELECT avatar_path FROM users WHERE id = ?');
$stmt->execute([$userId]);
$userData = $stmt->fetch();
if ($userData && $userData['avatar_path']) {
    $oldFile = __DIR__ . '/../' . $userData['avatar_path'];
    if (file_exists($oldFile)) @unlink($oldFile);
}

$ext = $mimeType === 'image/png' ? 'png' : ($mimeType === 'image/gif' ? 'gif' : 'jpg');
$filename = 'avatar_' . $userId . '_' . time() . '.' . $ext;
$destPath = $uploadDir . $filename;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    jsonResponse(false, 'Gagal menyimpan file avatar ke server.', [], 500);
}

$relativePath = 'uploads/avatars/' . $filename;

// Determine base URL from server
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? '192.168.1.5';
$avatarUrl = $scheme . '://' . $host . '/studymate-api/' . $relativePath;

$stmt2 = $db->prepare('UPDATE users SET avatar_path = ? WHERE id = ?');
$stmt2->execute([$relativePath, $userId]);

jsonResponse(true, 'Foto profil berhasil diperbarui.', [
    'avatar_url'  => $avatarUrl,
    'avatar_path' => $relativePath,
]);
