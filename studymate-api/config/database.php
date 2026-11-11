<?php
/**
 * StudyMate API - Database Configuration
 * ANGGOTA 1 – Backend REST API dan Database
 *
 * BUGFIX: Tambahkan error_reporting(0) dan ini_set('display_errors', '0')
 * agar PHP warning/notice tidak ter-inject ke output JSON.
 * Log tetap dikirim ke Apache error.log via log_errors=On.
 *
 * BUGFIX: Ganti DB_HOST dari 'localhost' ke '127.0.0.1'
 * Pada Windows, 'localhost' bisa mencoba koneksi via Named Pipe yang gagal
 * dengan error "socket access forbidden". '127.0.0.1' memaksa TCP/IP.
 */

// ── Suppress PHP warnings/notices dari output HTTP ────────────────────────
// WAJIB: Tanpa ini, warning PHP akan ter-inject sebelum JSON → response.json() crash
error_reporting(E_ALL);          // Tetap log semua error
ini_set('display_errors', '0');  // TIDAK tampilkan ke output HTTP
ini_set('log_errors', '1');      // Kirim ke Apache error.log

// ── Database Config ────────────────────────────────────────────────────────
// BUGFIX: Gunakan '127.0.0.1' bukan 'localhost' untuk memaksa TCP/IP di Windows
// 'localhost' di Windows sering mencoba Named Pipe → gagal dengan error 2002
define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_NAME', 'studymate_db');
define('DB_USER', 'root');
define('DB_PASS', '');         // Kosong = default XAMPP. Ganti jika menggunakan password.
define('DB_CHARSET', 'utf8mb4');

// ── JWT / Token Config ─────────────────────────────────────────────────────
// Ganti dengan string acak panjang (≥ 32 karakter) sebelum deploy.
define('JWT_SECRET', 'studymate_secret_key_2024_CHANGE_ME_IN_PRODUCTION');
define('TOKEN_EXPIRY_SECONDS', 86400); // 24 jam

// ── CORS Header helper ─────────────────────────────────────────────────────
// Dipanggil di awal setiap endpoint agar Expo Go / React Native bisa mengakses.
// BUGFIX: Tambahkan null-check untuk REQUEST_METHOD agar tidak warning saat CLI
function setCorsHeaders(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json; charset=UTF-8');
    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// ── PDO Singleton ──────────────────────────────────────────────────────────
// BUGFIX: Gunakan host=127.0.0.1;port=3306 (TCP eksplisit) bukan 'localhost'
function getDb(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        // Format DSN: host=IP;port=PORT memaksa TCP/IP di Windows
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
        );
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_TIMEOUT            => 5, // BUGFIX: timeout 5 detik agar tidak hang
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Log error ke file (tidak tampil ke output karena display_errors=0)
            error_log('[StudyMate] DB Connection Error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Koneksi database gagal. Pastikan MySQL XAMPP sedang berjalan.',
                'debug'   => 'DB Error: ' . $e->getCode(), // Kode error saja, bukan pesan lengkap
            ]);
            exit();
        }
    }
    return $pdo;
}

// ── Pure-PHP JWT (tanpa library eksternal) ─────────────────────────────────
// Implementasi JWT HS256 sederhana yang kompatibel dengan Bearer Token standard.
function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string {
    $padding = 4 - strlen($data) % 4;
    if ($padding < 4) {
        $data .= str_repeat('=', $padding);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}

/**
 * Membuat JWT access token menggunakan HMAC-SHA256.
 * Payload menyimpan user_id, email, dan waktu kadaluwarsa.
 */
function createJWT(int $userId, string $email): string {
    $header = base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));

    $issuedAt = time();
    $expiresAt = $issuedAt + TOKEN_EXPIRY_SECONDS;

    $payload = base64UrlEncode(json_encode([
        'sub'   => $userId,
        'email' => $email,
        'iat'   => $issuedAt,
        'exp'   => $expiresAt,
    ]));

    $signature = base64UrlEncode(
        hash_hmac('sha256', "$header.$payload", JWT_SECRET, true)
    );

    return "$header.$payload.$signature";
}

/**
 * Memvalidasi JWT dan mengembalikan payload jika valid, atau null jika tidak.
 * Memeriksa: format, signature, dan waktu kadaluwarsa.
 */
function verifyJWT(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }

    [$headerB64, $payloadB64, $signatureB64] = $parts;

    // Verifikasi signature
    $expectedSig = base64UrlEncode(
        hash_hmac('sha256', "$headerB64.$payloadB64", JWT_SECRET, true)
    );
    if (!hash_equals($expectedSig, $signatureB64)) {
        return null;
    }

    $payload = json_decode(base64UrlDecode($payloadB64), true);
    if (!$payload) {
        return null;
    }

    // Periksa expired
    if (isset($payload['exp']) && time() > $payload['exp']) {
        return null; // Token sudah kadaluwarsa
    }

    return $payload;
}

/**
 * Mengambil Bearer Token dari header Authorization.
 * Format: "Authorization: Bearer <token>"
 */
function getBearerToken(): ?string {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', trim($authHeader), $matches)) {
        return $matches[1];
    }
    return null;
}

/**
 * Helper: Mengembalikan response JSON dan mengakhiri eksekusi.
 */
function jsonResponse(bool $success, string $message, array $data = [], int $httpCode = 200): void {
    http_response_code($httpCode);
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $data));
    exit();
}
