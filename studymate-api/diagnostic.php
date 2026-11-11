<?php
/**
 * StudyMate API - Diagnostic Endpoint
 * Gunakan untuk mendiagnosis masalah koneksi dari HP/Postman
 * Akses: http://[IP-LAPTOP]/studymate-api/diagnostic.php
 *
 * HAPUS FILE INI SETELAH DEBUG SELESAI!
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

$results = [];

// 1. PHP Version
$results['php_version'] = PHP_VERSION;

// 2. display_errors setting
$results['display_errors'] = ini_get('display_errors');

// 3. MySQL Connection Test
$host = '127.0.0.1';
$port = '3306';
$dbname = 'studymate_db';
$user = 'root';
$pass = '';

try {
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE  => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT  => 5,
    ]);
    $results['mysql_status'] = 'CONNECTED';
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM users");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $results['users_count'] = (int)$row['cnt'];

    $stmt2 = $pdo->query("SELECT COUNT(*) as cnt FROM active_sessions");
    $row2 = $stmt2->fetch(PDO::FETCH_ASSOC);
    $results['active_sessions_count'] = (int)$row2['cnt'];
} catch (Exception $e) {
    $results['mysql_status'] = 'FAILED';
    $results['mysql_error'] = $e->getMessage();
    $results['mysql_error_code'] = $e->getCode();
}

// 4. Apache info
$results['server_software'] = $_SERVER['SERVER_SOFTWARE'] ?? 'unknown';
$results['server_addr']     = $_SERVER['SERVER_ADDR'] ?? 'unknown';
$results['request_method']  = $_SERVER['REQUEST_METHOD'] ?? 'unknown';
$results['client_ip']       = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

// 5. File existence checks
$basePath = __DIR__;
$results['files'] = [
    'config/database.php'   => file_exists($basePath . '/config/database.php'),
    'auth/register.php'     => file_exists($basePath . '/auth/register.php'),
    'auth/login.php'        => file_exists($basePath . '/auth/login.php'),
    'auth/logout.php'       => file_exists($basePath . '/auth/logout.php'),
    'users/me.php'          => file_exists($basePath . '/users/me.php'),
    'middleware/auth.php'   => file_exists($basePath . '/middleware/auth.php'),
];

// 6. CORS Headers check
$results['cors_headers'] = [
    'Access-Control-Allow-Origin set' => true,
    'Content-Type' => 'application/json',
];

// 7. Timestamp
$results['server_time'] = date('Y-m-d H:i:s');
$results['timezone'] = date_default_timezone_get();

echo json_encode(['success' => true, 'diagnostic' => $results], JSON_PRETTY_PRINT);

