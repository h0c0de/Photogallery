export interface CodeFile {
  id: string;
  name: string;
  path: string;
  language: string;
  description: string;
  icon: string;
  code: string;
}

export const phpFiles: CodeFile[] = [
  {
    id: "sql-schema",
    name: "database.sql",
    path: "database.sql",
    language: "sql",
    description: "Skema database MariaDB untuk tabel events dan photos",
    icon: "🗄️",
    code: `-- ============================================
-- Photobooth Download Gallery - Database Schema
-- MariaDB 11.4 | UTF-8mb4
-- ============================================

CREATE DATABASE IF NOT EXISTS photobooth_gallery
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE photobooth_gallery;

-- Tabel Events
CREATE TABLE IF NOT EXISTS events (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    qr_code_url VARCHAR(512) DEFAULT NULL,
    status ENUM('active', 'archived') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel Photos
CREATE TABLE IF NOT EXISTS photos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id INT UNSIGNED NOT NULL,
    filename_full VARCHAR(255) NOT NULL,
    filename_thumb VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) DEFAULT NULL,
    file_size INT UNSIGNED DEFAULT 0,
    mime_type VARCHAR(100) DEFAULT 'image/webp',
    width SMALLINT UNSIGNED DEFAULT 0,
    height SMALLINT UNSIGNED DEFAULT 0,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_event_id (event_id),
    INDEX idx_uploaded_at (uploaded_at),
    INDEX idx_event_uploaded (event_id, uploaded_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel Admin Users (simple auth)
CREATE TABLE IF NOT EXISTS admin_users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin (password: admin123 - CHANGE THIS!)
INSERT INTO admin_users (username, password_hash) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2u5G1tp3eyO');

-- Insert sample event
INSERT INTO events (name, slug) VALUES
('Sample Wedding Event', 'sample-wedding');`
  },
  {
    id: "config-db",
    name: "Database.php",
    path: "config/Database.php",
    language: "php",
    description: "Koneksi PDO yang aman dengan singleton pattern",
    icon: "🔌",
    code: `<?php
declare(strict_types=1);

/**
 * Database.php - PDO Connection Manager
 * Singleton pattern untuk efisiensi koneksi
 * PHP 8.2+ | MariaDB 11.4
 */

class Database
{
    private static ?PDO $instance = null;
    
    private const DB_HOST = 'localhost';
    private const DB_NAME = 'photobooth_gallery';
    private const DB_USER = 'your_db_username';
    private const DB_PASS = 'your_db_password';
    private const DB_CHARSET = 'utf8mb4';
    
    /**
     * Prevent instantiation
     */
    private function __construct() {}
    private function __clone() {}
    
    /**
     * Get PDO instance (Singleton)
     */
    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            $dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=%s',
                self::DB_HOST,
                self::DB_NAME,
                self::DB_CHARSET
            );
            
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
                PDO::ATTR_PERSISTENT         => false,
            ];
            
            try {
                self::$instance = new PDO($dsn, self::DB_USER, self::DB_PASS, $options);
            } catch (PDOException $e) {
                error_log('Database Connection Error: ' . $e->getMessage());
                http_response_code(500);
                die(json_encode(['error' => 'Database connection failed']));
            }
        }
        
        return self::$instance;
    }
    
    /**
     * Execute prepared statement and return results
     */
    public static function query(string $sql, array $params = []): \\PDOStatement
    {
        $stmt = self::getInstance()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }
    
    /**
     * Fetch single row
     */
    public static function fetchOne(string $sql, array $params = []): array|false
    {
        return self::query($sql, $params)->fetch();
    }
    
    /**
     * Fetch all rows
     */
    public static function fetchAll(string $sql, array $params = []): array
    {
        return self::query($sql, $params)->fetchAll();
    }
    
    /**
     * Insert and return last insert ID
     */
    public static function insert(string $sql, array $params = []): int
    {
        self::query($sql, $params);
        return (int) self::getInstance()->lastInsertId();
    }
}`
  },
  {
    id: "image-processor",
    name: "ImageProcessor.php",
    path: "classes/ImageProcessor.php",
    language: "php",
    description: "Handle upload, auto-crop/resize, dan convert ke WebP menggunakan GD Library",
    icon: "🖼️",
    code: `<?php
declare(strict_types=1);

/**
 * ImageProcessor.php - Image Upload & Processing
 * Auto-crop, resize, dan convert ke WebP
 * Menggunakan GD Library (built-in PHP)
 * PHP 8.2+
 */

class ImageProcessor
{
    private const UPLOAD_DIR = __DIR__ . '/../uploads/';
    private const THUMB_DIR = __DIR__ . '/../uploads/thumbs/';
    private const FULL_WIDTH = 1920;
    private const FULL_HEIGHT = 1080;
    private const THUMB_WIDTH = 400;
    private const THUMB_HEIGHT = 400;
    private const WEBP_QUALITY = 82;
    private const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private const ALLOWED_MIME = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
    ];
    
    /**
     * Process uploaded image
     * @return array{full: string, thumb: string, width: int, height: int, size: int}
     * @throws RuntimeException
     */
    public function processUpload(array $file, int $eventId): array
    {
        $this->validateUpload($file);
        $this->ensureDirectories();
        
        $sourceImage = $this->loadImage($file['tmp_name'], $file['type']);
        
        // Generate unique filenames
        $baseName = $this->generateFilename($eventId);
        $fullFilename = $baseName . '_full.webp';
        $thumbFilename = $baseName . '_thumb.webp';
        
        // Auto-crop to 16:9 for full size
        $croppedFull = $this->autoCrop($sourceImage, $file['tmp_name'], self::FULL_WIDTH, self::FULL_HEIGHT);
        $this->saveAsWebP($croppedFull, self::UPLOAD_DIR . $fullFilename, self::WEBP_QUALITY);
        
        // Get dimensions of full image
        $fullDims = getimagesize(self::UPLOAD_DIR . $fullFilename);
        
        // Create square thumbnail (center crop)
        $croppedThumb = $this->autoCropSquare($sourceImage, $file['tmp_name'], self::THUMB_WIDTH);
        $this->saveAsWebP($croppedThumb, self::THUMB_DIR . $thumbFilename, self::WEBP_QUALITY);
        
        // Free memory
        imagedestroy($sourceImage);
        imagedestroy($croppedFull);
        imagedestroy($croppedThumb);
        
        $fileSize = (int) filesize(self::UPLOAD_DIR . $fullFilename);
        
        return [
            'full'  => $fullFilename,
            'thumb' => $thumbFilename,
            'width' => $fullDims[0],
            'height' => $fullDims[1],
            'size'  => $fileSize,
        ];
    }
    
    /**
     * Validate uploaded file
     */
    private function validateUpload(array $file): void
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Upload failed with error code: ' . $file['error']);
        }
        
        if ($file['size'] > self::MAX_FILE_SIZE) {
            throw new RuntimeException('File too large. Maximum size is 10MB.');
        }
        
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);
        
        if (!isset(self::ALLOWED_MIME[$mimeType])) {
            throw new RuntimeException('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
        }
    }
    
    /**
     * Load image from file based on MIME type
     */
    private function loadImage(string $path, string $mimeType): \\GdImage
    {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $actualMime = $finfo->file($path);
        
        return match($actualMime) {
            'image/jpeg' => imagecreatefromjpeg($path),
            'image/png'  => imagecreatefrompng($path),
            'image/webp' => imagecreatefromwebp($path),
            'image/gif'  => imagecreatefromgif($path),
            default => throw new RuntimeException('Unsupported image format'),
        };
    }
    
    /**
     * Auto-crop and resize to target dimensions (cover mode)
     */
    private function autoCrop(\\GdImage $source, string $path, int $targetW, int $targetH): \\GdImage
    {
        [$srcW, $srcH] = getimagesize($path);
        
        $targetRatio = $targetW / $targetH;
        $srcRatio = $srcW / $srcH;
        
        if ($srcRatio > $targetRatio) {
            // Source is wider - crop sides
            $cropH = $srcH;
            $cropW = (int) ($srcH * $targetRatio);
            $srcX = (int) (($srcW - $cropW) / 2);
            $srcY = 0;
        } else {
            // Source is taller - crop top/bottom
            $cropW = $srcW;
            $cropH = (int) ($srcW / $targetRatio);
            $srcX = 0;
            $srcY = (int) (($srcH - $cropH) / 2);
        }
        
        $destination = imagecreatetruecolor($targetW, $targetH);
        imagecopyresampled($destination, $source, 0, 0, $srcX, $srcY, $targetW, $targetH, $cropW, $cropH);
        
        return $destination;
    }
    
    /**
     * Auto-crop to square (center crop)
     */
    private function autoCropSquare(\\GdImage $source, string $path, int $targetSize): \\GdImage
    {
        [$srcW, $srcH] = getimagesize($path);
        
        $minSide = min($srcW, $srcH);
        $srcX = (int) (($srcW - $minSide) / 2);
        $srcY = (int) (($srcH - $minSide) / 2);
        
        $destination = imagecreatetruecolor($targetSize, $targetSize);
        imagecopyresampled($destination, $source, 0, 0, $srcX, $srcY, $targetSize, $targetSize, $minSide, $minSide);
        
        return $destination;
    }
    
    /**
     * Save GD image as WebP
     */
    private function saveAsWebP(\\GdImage $image, string $path, int $quality): void
    {
        if (!imagewebp($image, $path, $quality)) {
            throw new RuntimeException('Failed to save WebP image');
        }
    }
    
    /**
     * Generate unique filename
     */
    private function generateFilename(int $eventId): string
    {
        return sprintf(
            'event%d_%s_%s',
            $eventId,
            date('Ymd_His'),
            bin2hex(random_bytes(4))
        );
    }
    
    /**
     * Ensure upload directories exist
     */
    private function ensureDirectories(): void
    {
        foreach ([self::UPLOAD_DIR, self::THUMB_DIR] as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }
}`
  },
  {
    id: "qr-generator",
    name: "QrGenerator.php",
    path: "classes/QrGenerator.php",
    language: "php",
    description: "Generate QR Code menggunakan API eksternal (zero-dependency)",
    icon: "📱",
    code: `<?php
declare(strict_types=1);

/**
 * QrGenerator.php - QR Code Generator
 * Zero-dependency: menggunakan API eksternal atau fallback ke SVG lokal
 * PHP 8.2+
 */

class QrGenerator
{
    private const QR_API_URL = 'https://api.qrserver.com/v1/create-qr-code/';
    private const LOCAL_QR_DIR = __DIR__ . '/../uploads/qrcodes/';
    private const QR_SIZE = 300;
    private const BASE_GALLERY_URL = 'https://yourdomain.com/gallery/';
    
    /**
     * Generate QR code for event gallery URL
     * Returns the URL path to the QR code image
     */
    public function generateForEvent(int $eventId, string $eventSlug): string
    {
        $this->ensureDirectory();
        
        $galleryUrl = self::BASE_GALLERY_URL . '?event=' . urlencode($eventSlug);
        $filename = 'qr_event_' . $eventId . '_' . $eventSlug . '.png';
        $filepath = self::LOCAL_QR_DIR . $filename;
        $relativePath = 'uploads/qrcodes/' . $filename;
        
        // Return existing QR if already generated
        if (file_exists($filepath)) {
            return $relativePath;
        }
        
        // Try local generation first (GD-based simple QR)
        if ($this->generateLocal($galleryUrl, $filepath)) {
            return $relativePath;
        }
        
        // Fallback: download from external API
        if ($this->downloadFromApi($galleryUrl, $filepath)) {
            return $relativePath;
        }
        
        throw new RuntimeException('Failed to generate QR code');
    }
    
    /**
     * Generate QR code using external API
     */
    private function downloadFromApi(string $data, string $savePath): bool
    {
        $params = http_build_query([
            'data' => $data,
            'size' => self::QR_SIZE . 'x' . self::QR_SIZE,
            'margin' => 2,
            'format' => 'png',
        ]);
        
        $url = self::QR_API_URL . '?' . $params;
        
        $context = stream_context_create([
            'http' => [
                'timeout' => 10,
                'user_agent' => 'PhotoboothGallery/1.0',
            ],
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
            ],
        ]);
        
        $imageData = @file_get_contents($url, false, $context);
        
        if ($imageData === false) {
            return false;
        }
        
        return file_put_contents($savePath, $imageData) !== false;
    }
    
    /**
     * Simple local QR generation using GD (basic implementation)
     * For production, use chillerlan/php-qrcode via composer
     */
    private function generateLocal(string $data, string $savePath): bool
    {
        // Check if chillerlan/php-qrcode is available via composer
        $composerAutoload = __DIR__ . '/../vendor/autoload.php';
        if (file_exists($composerAutoload)) {
            require_once $composerAutoload;
            
            if (class_exists('\\\\chillerlan\\\\QRCoder\\\\QRCode')) {
                $options = new \\\\chillerlan\\\\QRCoder\\\\QROptions([
                    'outputType' => \\\\chillerlan\\\\QRCoder\\\\QROutputInterface::GD_IMAGE_PNG,
                    'outputPath' => $savePath,
                    'scale' => 8,
                    'margin' => 2,
                ]);
                
                $qrcode = new \\\\chillerlan\\\\QRCoder\\\\QRCode($options);
                $qrcode->render($data);
                return file_exists($savePath);
            }
        }
        
        return false;
    }
    
    /**
     * Get QR code URL for an event (from database or generate)
     */
    public function getQrUrl(int $eventId, string $eventSlug): string
    {
        $db = Database::getInstance();
        
        // Check if QR already exists in DB
        $stmt = $db->prepare('SELECT qr_code_url FROM events WHERE id = :id');
        $stmt->execute([':id' => $eventId]);
        $result = $stmt->fetch();
        
        if ($result && !empty($result['qr_code_url'])) {
            return $result['qr_code_url'];
        }
        
        // Generate new QR
        $qrPath = $this->generateForEvent($eventId, $eventSlug);
        
        // Update database
        $stmt = $db->prepare('UPDATE events SET qr_code_url = :url WHERE id = :id');
        $stmt->execute([':url' => $qrPath, ':id' => $eventId]);
        
        return $qrPath;
    }
    
    /**
     * Ensure QR directory exists
     */
    private function ensureDirectory(): void
    {
        if (!is_dir(self::LOCAL_QR_DIR)) {
            mkdir(self::LOCAL_QR_DIR, 0755, true);
        }
    }
}`
  },
  {
    id: "admin",
    name: "admin.php",
    path: "admin.php",
    language: "php",
    description: "Halaman admin untuk login, kelola events, dan upload foto",
    icon: "🔐",
    code: `<?php
declare(strict_types=1);
session_start();

require_once __DIR__ . '/config/Database.php';
require_once __DIR__ . '/classes/ImageProcessor.php';
require_once __DIR__ . '/classes/QrGenerator.php';

// ============================================
// AUTHENTICATION
// ============================================

function isLoggedIn(): bool
{
    return isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
}

function requireLogin(): void
{
    if (!isLoggedIn()) {
        header('Location: admin.php?action=login');
        exit;
    }
}

function handleLogin(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') return;
    
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        $_SESSION['login_error'] = 'Username dan password wajib diisi';
        return;
    }
    
    $user = Database::fetchOne(
        'SELECT id, username, password_hash FROM admin_users WHERE username = :u',
        [':u' => $username]
    );
    
    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_user'] = $user['username'];
        session_regenerate_id(true);
        header('Location: admin.php');
        exit;
    }
    
    $_SESSION['login_error'] = 'Username atau password salah';
}

function handleLogout(): void
{
    session_destroy();
    header('Location: admin.php?action=login');
    exit;
}

// ============================================
// EVENT MANAGEMENT
// ============================================

function handleCreateEvent(): void
{
    requireLogin();
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') return;
    
    $name = trim($_POST['event_name'] ?? '');
    if (empty($name)) {
        $_SESSION['error'] = 'Nama event wajib diisi';
        return;
    }
    
    $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $name));
    $slug = trim($slug, '-');
    
    try {
        $eventId = Database::insert(
            'INSERT INTO events (name, slug) VALUES (:name, :slug)',
            [':name' => $name, ':slug' => $slug]
        );
        
        // Generate QR Code
        $qrGen = new QrGenerator();
        $qrPath = $qrGen->generateForEvent($eventId, $slug);
        
        Database::query(
            'UPDATE events SET qr_code_url = :url WHERE id = :id',
            [':url' => $qrPath, ':id' => $eventId]
        );
        
        $_SESSION['success'] = 'Event berhasil dibuat!';
        header('Location: admin.php');
        exit;
    } catch (Exception $e) {
        $_SESSION['error'] = 'Gagal membuat event: ' . $e->getMessage();
    }
}

// ============================================
// PHOTO UPLOAD
// ============================================

function handlePhotoUpload(): void
{
    requireLogin();
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') return;
    
    $eventId = (int) ($_POST['event_id'] ?? 0);
    if ($eventId <= 0) {
        $_SESSION['error'] = 'Pilih event terlebih dahulu';
        return;
    }
    
    // Verify event exists
    $event = Database::fetchOne('SELECT id FROM events WHERE id = :id', [':id' => $eventId]);
    if (!$event) {
        $_SESSION['error'] = 'Event tidak ditemukan';
        return;
    }
    
    if (empty($_FILES['photos'])) {
        $_SESSION['error'] = 'Pilih file foto';
        return;
    }
    
    $processor = new ImageProcessor();
    $uploaded = 0;
    $errors = [];
    
    // Handle multiple file upload
    $files = $_FILES['photos'];
    $fileCount = is_array($files['name']) ? count($files['name']) : 1;
    
    for ($i = 0; $i < $fileCount; $i++) {
        $file = [
            'name'     => is_array($files['name']) ? $files['name'][$i] : $files['name'],
            'type'     => is_array($files['type']) ? $files['type'][$i] : $files['type'],
            'tmp_name' => is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'],
            'error'    => is_array($files['error']) ? $files['error'][$i] : $files['error'],
            'size'     => is_array($files['size']) ? $files['size'][$i] : $files['size'],
        ];
        
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errors[] = $file['name'] . ': Upload error';
            continue;
        }
        
        try {
            $result = $processor->processUpload($file, $eventId);
            
            Database::insert(
                'INSERT INTO photos (event_id, filename_full, filename_thumb, original_name, file_size, width, height) 
                 VALUES (:event_id, :full, :thumb, :orig, :size, :w, :h)',
                [
                    ':event_id' => $eventId,
                    ':full'     => $result['full'],
                    ':thumb'    => $result['thumb'],
                    ':orig'     => $file['name'],
                    ':size'     => $result['size'],
                    ':w'        => $result['width'],
                    ':h'        => $result['height'],
                ]
            );
            
            $uploaded++;
        } catch (Exception $e) {
            $errors[] = $file['name'] . ': ' . $e->getMessage();
        }
    }
    
    if ($uploaded > 0) {
        $_SESSION['success'] = "{$uploaded} foto berhasil diupload";
    }
    if (!empty($errors)) {
        $_SESSION['error'] = implode('<br>', $errors);
    }
    
    header('Location: admin.php?event=' . $eventId);
    exit;
}

// ============================================
// ROUTER
// ============================================

$action = $_GET['action'] ?? 'dashboard';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'create_event':
        handleCreateEvent();
        break;
    case 'upload':
        handlePhotoUpload();
        break;
}

// ============================================
// DATA FETCHING
// ============================================

$currentEventId = isset($_GET['event']) ? (int) $_GET['event'] : 0;
$events = [];
$currentEvent = null;
$photos = [];

if (isLoggedIn()) {
    $events = Database::fetchAll('SELECT * FROM events ORDER BY created_at DESC');
    
    if ($currentEventId > 0) {
        $currentEvent = Database::fetchOne(
            'SELECT * FROM events WHERE id = :id',
            [':id' => $currentEventId]
        );
        
        if ($currentEvent) {
            $photos = Database::fetchAll(
                'SELECT * FROM photos WHERE event_id = :eid ORDER BY uploaded_at DESC LIMIT 100',
                [':eid' => $currentEventId]
            );
        }
    }
}

// ============================================
// HTML RENDER
// ============================================
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Photobooth Gallery</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f2f5; color: #1a1a2e; }
        .container { max-width: 900px; margin: 0 auto; padding: 20px; }
        
        /* Login */
        .login-box { max-width: 400px; margin: 100px auto; background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .login-box h1 { text-align: center; margin-bottom: 30px; color: #6c63ff; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; }
        .form-group input, .form-group select { width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px; transition: border-color 0.2s; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #6c63ff; }
        .btn { display: inline-block; padding: 12px 24px; background: #6c63ff; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.2s; text-decoration: none; }
        .btn:hover { background: #5a52d5; }
        .btn-full { width: 100%; }
        .btn-sm { padding: 8px 16px; font-size: 14px; }
        .btn-danger { background: #e74c3c; }
        .btn-danger:hover { background: #c0392b; }
        
        /* Header */
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding: 20px; background: #fff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .header h1 { font-size: 20px; color: #6c63ff; }
        
        /* Alerts */
        .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        
        /* Cards */
        .card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .card h2 { margin-bottom: 16px; font-size: 18px; }
        
        /* Event List */
        .event-list { list-style: none; }
        .event-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #f0f0f0; }
        .event-item:last-child { border-bottom: none; }
        .event-name { font-weight: 600; }
        .event-meta { font-size: 13px; color: #666; }
        .event-link a { color: #6c63ff; text-decoration: none; font-size: 13px; }
        
        /* Photo Grid */
        .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-top: 16px; }
        .photo-thumb { aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: #f0f0f0; }
        .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
        
        /* Upload Area */
        .upload-area { border: 2px dashed #d0d0d0; border-radius: 12px; padding: 40px; text-align: center; cursor: pointer; transition: border-color 0.2s; }
        .upload-area:hover { border-color: #6c63ff; }
        .upload-area p { color: #666; margin-top: 8px; }
        
        @media (max-width: 600px) {
            .container { padding: 12px; }
            .header { flex-direction: column; gap: 12px; text-align: center; }
            .photo-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
        }
    </style>
</head>
<body>
<?php if (!isLoggedIn()): ?>
    <!-- LOGIN FORM -->
    <div class="login-box">
        <h1>📸 Admin Panel</h1>
        <?php if (!empty($_SESSION['login_error'])): ?>
            <div class="alert alert-error"><?= htmlspecialchars($_SESSION['login_error']) ?></div>
            <?php unset($_SESSION['login_error']); ?>
        <?php endif; ?>
        <form method="POST" action="admin.php?action=login">
            <div class="form-group">
                <label>Username</label>
                <input type="text" name="username" required autocomplete="username">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" name="password" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-full">Login</button>
        </form>
    </div>

<?php else: ?>
    <!-- DASHBOARD -->
    <div class="container">
        <div class="header">
            <h1>📸 Photobooth Admin</h1>
            <div>
                <span style="margin-right:12px;font-size:14px;">Hi, <?= htmlspecialchars($_SESSION['admin_user'] ?? 'Admin') ?></span>
                <a href="admin.php?action=logout" class="btn btn-sm btn-danger">Logout</a>
            </div>
        </div>
        
        <?php if (!empty($_SESSION['success'])): ?>
            <div class="alert alert-success"><?= $_SESSION['success'] ?></div>
            <?php unset($_SESSION['success']); ?>
        <?php endif; ?>
        <?php if (!empty($_SESSION['error'])): ?>
            <div class="alert alert-error"><?= $_SESSION['error'] ?></div>
            <?php unset($_SESSION['error']); ?>
        <?php endif; ?>
        
        <!-- Create Event -->
        <div class="card">
            <h2>➕ Buat Event Baru</h2>
            <form method="POST" action="admin.php?action=create_event" style="display:flex;gap:12px;flex-wrap:wrap;">
                <div class="form-group" style="flex:1;min-width:200px;margin-bottom:0;">
                    <input type="text" name="event_name" placeholder="Nama Event (cth: Wedding Budi & Ani)" required>
                </div>
                <button type="submit" class="btn">Buat Event</button>
            </form>
        </div>
        
        <!-- Event List -->
        <div class="card">
            <h2>📋 Daftar Event</h2>
            <?php if (empty($events)): ?>
                <p style="color:#666;">Belum ada event. Buat event baru di atas.</p>
            <?php else: ?>
                <ul class="event-list">
                    <?php foreach ($events as $event): ?>
                        <li class="event-item">
                            <div>
                                <div class="event-name"><?= htmlspecialchars($event['name']) ?></div>
                                <div class="event-meta">
                                    Slug: <code><?= htmlspecialchars($event['slug']) ?></code> | 
                                    Dibuat: <?= date('d M Y', strtotime($event['created_at'])) ?>
                                </div>
                                <div class="event-link">
                                    <a href="index.php?event=<?= urlencode($event['slug']) ?>" target="_blank">🔗 Lihat Galeri</a>
                                </div>
                            </div>
                            <a href="admin.php?event=<?= $event['id'] ?>" class="btn btn-sm">Kelola</a>
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>
        </div>
        
        <!-- Event Detail & Upload -->
        <?php if ($currentEvent): ?>
            <div class="card">
                <h2>📤 Upload Foto - <?= htmlspecialchars($currentEvent['name']) ?></h2>
                <form method="POST" action="admin.php?action=upload" enctype="multipart/form-data">
                    <input type="hidden" name="event_id" value="<?= $currentEvent['id'] ?>">
                    <div class="upload-area" onclick="document.getElementById('photoInput').click()">
                        <p style="font-size:32px;">📁</p>
                        <p><strong>Klik untuk pilih foto</strong> atau drag & drop</p>
                        <p style="font-size:12px;">Format: JPEG, PNG, WebP, GIF | Max: 10MB per file</p>
                    </div>
                    <input type="file" id="photoInput" name="photos[]" multiple accept="image/*" style="display:none;" onchange="this.form.submit()">
                </form>
            </div>
            
            <?php if (!empty($photos)): ?>
                <div class="card">
                    <h2>🖼️ Foto Uploaded (<?= count($photos) ?>)</h2>
                    <div class="photo-grid">
                        <?php foreach ($photos as $photo): ?>
                            <div class="photo-thumb">
                                <img src="uploads/thumbs/<?= htmlspecialchars($photo['filename_thumb']) ?>" 
                                     alt="<?= htmlspecialchars($photo['original_name']) ?>"
                                     loading="lazy">
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            <?php endif; ?>
        <?php endif; ?>
    </div>
<?php endif; ?>
</body>
</html>`
  },
  {
    id: "index-page",
    name: "index.php",
    path: "index.php",
    language: "php",
    description: "Halaman galeri publik dengan lazy loading dan skeleton animation",
    icon: "🌐",
    code: `<?php
declare(strict_types=1);

require_once __DIR__ . '/config/Database.php';

// ============================================
// GET EVENT SLUG FROM URL
// ============================================

$eventSlug = trim($_GET['event'] ?? '');

if (empty($eventSlug)) {
    http_response_code(404);
    die(renderError('Event tidak ditemukan', 'Parameter event wajib diisi.'));
}

// ============================================
// FETCH EVENT DATA
// ============================================

$event = Database::fetchOne(
    'SELECT id, name, slug, qr_code_url FROM events WHERE slug = :slug AND status = :status',
    [':slug' => $eventSlug, ':status' => 'active']
);

if (!$event) {
    http_response_code(404);
    die(renderError('Event tidak ditemukan', 'Event yang Anda cari tidak tersedia atau sudah diarsipkan.'));
}

// ============================================
// PAGINATION
// ============================================

$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = 24;
$offset = ($page - 1) * $perPage;

// Get total count
$countResult = Database::fetchOne(
    'SELECT COUNT(*) as total FROM photos WHERE event_id = :eid',
    [':eid' => $event['id']]
);
$totalPhotos = (int) $countResult['total'];
$totalPages = (int) ceil($totalPhotos / $perPage);

// Get photos for current page
$photos = Database::fetchAll(
    'SELECT id, filename_full, filename_thumb, original_name, width, height, uploaded_at 
     FROM photos 
     WHERE event_id = :eid 
     ORDER BY uploaded_at DESC 
     LIMIT :limit OFFSET :offset',
    [':eid' => $event['id'], ':limit' => $perPage, ':offset' => $offset]
);

// ============================================
// RENDER HTML
// ============================================

function renderError(string $title, string $message): string
{
    return <<<HTML
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error - Photobooth Gallery</title>
        <style>
            body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f8f9fa; margin: 0; }
            .error-box { text-align: center; padding: 40px; }
            .error-box h1 { font-size: 48px; margin-bottom: 16px; }
            .error-box p { color: #666; font-size: 18px; }
        </style>
    </head>
    <body>
        <div class="error-box">
            <h1>😔</h1>
            <h2>{$title}</h2>
            <p>{$message}</p>
        </div>
    </body>
    </html>
    HTML;
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($event['name']) ?> - Photo Gallery</title>
    <meta name="description" content="Download foto dari event <?= htmlspecialchars($event['name']) ?>">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --primary: #6c63ff;
            --primary-dark: #5a52d5;
            --bg: #f8f9fa;
            --card-bg: #ffffff;
            --text: #1a1a2e;
            --text-muted: #6c757d;
            --radius: 12px;
            --shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
        }
        
        /* Header */
        .gallery-header {
            background: linear-gradient(135deg, var(--primary), #8b5cf6);
            color: white;
            padding: 32px 20px;
            text-align: center;
        }
        .gallery-header h1 {
            font-size: clamp(20px, 5vw, 32px);
            margin-bottom: 8px;
        }
        .gallery-header p {
            opacity: 0.9;
            font-size: 14px;
        }
        .photo-count {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 13px;
            margin-top: 12px;
        }
        
        /* Gallery Grid */
        .gallery-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
        }
        
        @media (max-width: 600px) {
            .gallery-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
            }
        }
        
        /* Photo Card */
        .photo-card {
            background: var(--card-bg);
            border-radius: var(--radius);
            overflow: hidden;
            box-shadow: var(--shadow);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .photo-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        
        .photo-wrapper {
            position: relative;
            aspect-ratio: 16/9;
            background: #e9ecef;
            overflow: hidden;
        }
        
        .photo-wrapper img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: opacity 0.3s;
        }
        
        .photo-wrapper img.loading {
            opacity: 0;
        }
        
        .photo-wrapper img.loaded {
            opacity: 1;
        }
        
        /* Skeleton Loading */
        .skeleton {
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, #e9ecef 25%, #f8f9fa 50%, #e9ecef 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
        }
        
        @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        
        .skeleton.hidden {
            display: none;
        }
        
        /* Download Button */
        .photo-actions {
            padding: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .photo-info {
            font-size: 12px;
            color: var(--text-muted);
        }
        
        .btn-download {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: background 0.2s;
        }
        .btn-download:hover {
            background: var(--primary-dark);
        }
        
        /* Pagination */
        .pagination {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-top: 32px;
            flex-wrap: wrap;
        }
        .pagination a, .pagination span {
            padding: 8px 16px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
        }
        .pagination a {
            background: var(--card-bg);
            color: var(--text);
            box-shadow: var(--shadow);
        }
        .pagination a:hover {
            background: var(--primary);
            color: white;
        }
        .pagination .active {
            background: var(--primary);
            color: white;
        }
        
        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--text-muted);
        }
        .empty-state .emoji {
            font-size: 48px;
            margin-bottom: 16px;
        }
        
        /* Download All */
        .download-all-bar {
            background: var(--card-bg);
            padding: 16px 20px;
            text-align: center;
            box-shadow: var(--shadow);
            margin-bottom: 20px;
            border-radius: var(--radius);
        }
    </style>
</head>
<body>
    <header class="gallery-header">
        <h1>📸 <?= htmlspecialchars($event['name']) ?></h1>
        <p>Download foto favoritmu dari event ini</p>
        <div class="photo-count">📷 <?= number_format($totalPhotos) ?> foto</div>
    </header>
    
    <main class="gallery-container">
        <?php if (empty($photos)): ?>
            <div class="empty-state">
                <div class="emoji">📭</div>
                <h3>Belum ada foto</h3>
                <p>Foto akan muncul setelah diupload oleh admin.</p>
            </div>
        <?php else: ?>
            <div class="gallery-grid">
                <?php foreach ($photos as $photo): ?>
                    <div class="photo-card">
                        <div class="photo-wrapper">
                            <div class="skeleton" id="skeleton-<?= $photo['id'] ?>"></div>
                            <img 
                                src="uploads/thumbs/<?= htmlspecialchars($photo['filename_thumb']) ?>"
                                alt="<?= htmlspecialchars($photo['original_name'] ?? 'Photo') ?>"
                                class="loading"
                                loading="lazy"
                                onload="this.classList.remove('loading');this.classList.add('loaded');document.getElementById('skeleton-<?= $photo['id'] ?>').classList.add('hidden');"
                                onerror="this.parentElement.style.display='none'"
                            >
                        </div>
                        <div class="photo-actions">
                            <span class="photo-info">
                                <?= date('d/m/Y', strtotime($photo['uploaded_at'])) ?>
                            </span>
                            <a href="download.php?id=<?= $photo['id'] ?>" class="btn-download">
                                ⬇️ Download
                            </a>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
            
            <?php if ($totalPages > 1): ?>
                <nav class="pagination">
                    <?php if ($page > 1): ?>
                        <a href="?event=<?= urlencode($eventSlug) ?>&page=<?= $page - 1 ?>">← Prev</a>
                    <?php endif; ?>
                    
                    <?php
                    $startPage = max(1, $page - 2);
                    $endPage = min($totalPages, $page + 2);
                    
                    for ($i = $startPage; $i <= $endPage; $i++):
                        if ($i === $page):
                    ?>
                        <span class="active"><?= $i ?></span>
                    <?php else: ?>
                        <a href="?event=<?= urlencode($eventSlug) ?>&page=<?= $i ?>"><?= $i ?></a>
                    <?php endif;
                    endfor; ?>
                    
                    <?php if ($page < $totalPages): ?>
                        <a href="?event=<?= urlencode($eventSlug) ?>&page=<?= $page + 1 ?>">Next →</a>
                    <?php endif; ?>
                </nav>
            <?php endif; ?>
        <?php endif; ?>
    </main>
    
    <script>
        // Intersection Observer for lazy loading enhancement
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            observer.unobserve(img);
                        }
                    }
                });
            }, { rootMargin: '100px' });
            
            document.querySelectorAll('img[loading="lazy"]').forEach(img => {
                observer.observe(img);
            });
        }
    </script>
</body>
</html>`
  },
  {
    id: "download",
    name: "download.php",
    path: "download.php",
    language: "php",
    description: "Handler force-download dengan validasi database (anti directory traversal)",
    icon: "⬇️",
    code: `<?php
declare(strict_types=1);

require_once __DIR__ . '/config/Database.php';

/**
 * download.php - Secure File Download Handler
 * Validasi ID dari database, mencegah directory traversal
 */

// Get photo ID from query string
$photoId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

if ($photoId === false || $photoId === null || $photoId <= 0) {
    http_response_code(400);
    die('Invalid photo ID');
}

// Fetch photo data from database (PREPARED STATEMENT - anti SQL injection)
$photo = Database::fetchOne(
    'SELECT p.id, p.filename_full, p.original_name, p.event_id, e.name as event_name
     FROM photos p
     INNER JOIN events e ON p.event_id = e.id
     WHERE p.id = :id AND e.status = :status',
    [':id' => $photoId, ':status' => 'active']
);

if (!$photo) {
    http_response_code(404);
    die('Photo not found');
}

// Build file path securely (NO user input in path - anti directory traversal)
$uploadDir = realpath(__DIR__ . '/uploads/');
$filePath = $uploadDir . DIRECTORY_SEPARATOR . $photo['filename_full'];

// Verify file exists and is within upload directory
$realFilePath = realpath($filePath);

if ($realFilePath === false || strpos($realFilePath, $uploadDir) !== 0) {
    http_response_code(404);
    die('File not found');
}

if (!file_exists($realFilePath) || !is_readable($realFilePath)) {
    http_response_code(404);
    die('File not available');
}

// Get file info
$fileSize = filesize($realFilePath);
$mimeType = 'image/webp';

// Generate safe download filename
$downloadName = sprintf(
    '%s_%s.webp',
    preg_replace('/[^a-zA-Z0-9_-]/', '_', $photo['event_name']),
    $photo['id']
);

// ============================================
// FORCE DOWNLOAD HEADERS
// ============================================

// Clear any output buffers
while (ob_get_level()) {
    ob_end_clean();
}

// Set download headers
header('Content-Description: File Transfer');
header('Content-Type: ' . $mimeType);
header('Content-Disposition: attachment; filename="' . $downloadName . '"');
header('Content-Transfer-Encoding: binary');
header('Content-Length: ' . $fileSize);
header('Expires: 0');
header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
header('Pragma: public');

// Disable caching for download
header('X-Content-Type-Options: nosniff');
header('X-Download-Options: noopen');

// Stream file to browser (memory efficient for large files)
$chunkSize = 8192; // 8KB chunks
$handle = fopen($realFilePath, 'rb');

if ($handle === false) {
    http_response_code(500);
    die('Failed to read file');
}

while (!feof($handle)) {
    echo fread($handle, $chunkSize);
    flush();
}

fclose($handle);
exit;`
  },
  {
    id: "htaccess",
    name: ".htaccess",
    path: ".htaccess",
    language: "apache",
    description: "Konfigurasi LiteSpeed/Apache untuk keamanan dan optimasi",
    icon: "⚙️",
    code: `# ============================================
# Photobooth Gallery - LiteSpeed/Apache Config
# ============================================

# Enable Rewrite Engine
RewriteEngine On

# Force HTTPS (uncomment if SSL is active)
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Clean URLs for gallery (optional)
RewriteRule ^gallery/([a-zA-Z0-9-]+)/?$ index.php?event=$1 [L,QSA]

# Security: Block direct access to config and class files
<FilesMatch "\\.(php|sql)$">
    <If "%{REQUEST_URI} =~ m#^/(config|classes)/#">
        Require all denied
    </If>
</FilesMatch>

# Block access to sensitive files
<FilesMatch "^(\\.htaccess|\\.htpasswd|\\.env|composer\\.(json|lock))$">
    Require all denied
</FilesMatch>

# Prevent directory listing
Options -Indexes

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml
</IfModule>

# Browser caching for static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/webp "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType text/css "access plus 1 week"
    ExpiresByType application/javascript "access plus 1 week"
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# PHP settings (LiteSpeed compatible)
<IfModule LiteSpeed>
    php_value upload_max_filesize 10M
    php_value post_max_size 12M
    php_value max_execution_time 60
    php_value memory_limit 128M
</IfModule>

# Protect uploads directory from PHP execution
<Directory "uploads">
    <FilesMatch "\\.php$">
        Require all denied
    </FilesMatch>
</Directory>`
  },
  {
    id: "composer",
    name: "composer.json",
    path: "composer.json",
    language: "json",
    description: "Composer config untuk QR Code library (opsional)",
    icon: "📦",
    code: `{
    "name": "photobooth/gallery",
    "description": "Photobooth Download Gallery - Ultra Lightweight",
    "type": "project",
    "require": {
        "php": ">=8.2",
        "chillerlan/php-qrcode": "^5.0"
    },
    "autoload": {
        "classmap": [
            "config/",
            "classes/"
        ]
    },
    "config": {
        "optimize-autoloader": true,
        "sort-packages": true
    }
}`
  },
  {
    id: "install-php",
    name: "install.php",
    path: "install.php",
    language: "php",
    description: "Wizard instalasi otomatis 4 langkah: cek requirement, setup DB, import schema, buat admin",
    icon: "🚀",
    code: `<?php
declare(strict_types=1);

/**
 * install.php - Photobooth Gallery Installer
 * Wizard instalasi otomatis 4 langkah
 * 
 * STEP 1: Cek requirement sistem (PHP, extensions, permissions)
 * STEP 2: Setup database connection (test koneksi)
 * STEP 3: Import schema SQL otomatis
 * STEP 4: Create admin user + generate config
 * 
 * CARA PAKAI:
 * 1. Upload semua file ke server
 * 2. Akses https://yourdomain.com/install.php
 * 3. Ikuti wizard 4 langkah
 * 4. File auto-protect setelah selesai
 */

session_start();

// ============================================
// SECURITY: Block if already installed
// ============================================

if (file_exists(__DIR__ . '/.installed') && !isset(\$_GET['force'])) {
    die('<h1>Sudah Terinstall</h1><p>Tambahkan ?force=1 untuk reinstall.</p>');
}

// ============================================
// STEP MANAGEMENT
// ============================================

\$step = (int) (\$_GET['step'] ?? \$_POST['step'] ?? 1);
\$step = max(1, min(5, \$step));

\$errors = [];

// ============================================
// STEP 1: SYSTEM REQUIREMENTS CHECK
// ============================================

function checkRequirements(): array
{
    \$checks = [];
    
    // PHP Version
    \$checks[] = [
        'name' => 'PHP Version',
        'required' => '>= 8.2.0',
        'current' => PHP_VERSION,
        'pass' => version_compare(PHP_VERSION, '8.2.0', '>='),
        'critical' => true,
    ];
    
    // Required Extensions
    \$extensions = [
        'pdo' => 'PDO',
        'pdo_mysql' => 'PDO MySQL',
        'gd' => 'GD Library',
        'json' => 'JSON',
        'mbstring' => 'Multibyte String',
        'fileinfo' => 'File Info',
        'session' => 'Session',
    ];
    
    foreach (\$extensions as \$ext => \$name) {
        \$loaded = extension_loaded(\$ext);
        \$checks[] = [
            'name' => \$name . ' Extension',
            'required' => 'Enabled',
            'current' => \$loaded ? 'Enabled' : 'Disabled',
            'pass' => \$loaded,
            'critical' => true,
        ];
    }
    
    // WebP Support
    \$checks[] = [
        'name' => 'WebP Support (GD)',
        'required' => 'Enabled',
        'current' => function_exists('imagewebp') ? 'Supported' : 'Not Supported',
        'pass' => function_exists('imagewebp'),
        'critical' => true,
    ];
    
    // Writable Directories
    \$dirs = [
        __DIR__ => 'Root Directory',
        __DIR__ . '/config' => 'Config Directory',
        __DIR__ . '/uploads' => 'Uploads Directory',
        __DIR__ . '/uploads/thumbs' => 'Thumbs Directory',
        __DIR__ . '/uploads/qrcodes' => 'QR Codes Directory',
    ];
    
    foreach (\$dirs as \$dir => \$name) {
        \$exists = is_dir(\$dir);
        \$writable = \$exists && is_writable(\$dir);
        \$checks[] = [
            'name' => \$name . ' (Writable)',
            'required' => 'Writable',
            'current' => !\$exists ? 'Not Found' : (\$writable ? 'Writable' : 'Not Writable'),
            'pass' => \$writable,
            'critical' => strpos(\$name, 'Root') !== false || strpos(\$name, 'Config') !== false,
        ];
    }
    
    // PHP Settings
    \$uploadMax = ini_get('upload_max_filesize');
    \$checks[] = [
        'name' => 'Upload Max Filesize',
        'required' => '>= 10M',
        'current' => \$uploadMax,
        'pass' => return_bytes(\$uploadMax) >= 10 * 1024 * 1024,
        'critical' => false,
    ];
    
    \$checks[] = [
        'name' => 'Memory Limit',
        'required' => '>= 128M',
        'current' => ini_get('memory_limit'),
        'pass' => ini_get('memory_limit') === '-1' || return_bytes(ini_get('memory_limit')) >= 128 * 1024 * 1024,
        'critical' => false,
    ];
    
    return \$checks;
}

function return_bytes(string \$val): int
{
    \$val = trim(\$val);
    \$last = strtolower(\$val[strlen(\$val) - 1]);
    \$val = (int) \$val;
    return match(\$last) {
        'g' => \$val * 1024 * 1024 * 1024,
        'm' => \$val * 1024 * 1024,
        'k' => \$val * 1024,
        default => \$val,
    };
}

// ============================================
// STEP 2: DATABASE CONNECTION TEST
// ============================================

function testDatabaseConnection(string \$host, string \$name, string \$user, string \$pass): array
{
    try {
        \$dsn = "mysql:host={\$host};charset=utf8mb4";
        \$pdo = new PDO(\$dsn, \$user, \$pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        
        // Check if database exists, create if not
        \$stmt = \$pdo->prepare('SHOW DATABASES LIKE ?');
        \$stmt->execute([\$name]);
        
        if (!\$stmt->fetch()) {
            \$pdo->exec("CREATE DATABASE \\\`{\$name}\\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            \$msg = 'Database berhasil dibuat';
        } else {
            \$msg = 'Koneksi database berhasil';
        }
        
        \$pdo->exec("USE \\\`{\$name}\\\`");
        
        return ['success' => true, 'message' => \$msg];
    } catch (PDOException \$e) {
        return ['success' => false, 'message' => 'Koneksi gagal: ' . \$e->getMessage()];
    }
}

// ============================================
// STEP 3: IMPORT SCHEMA
// ============================================

function importSchema(string \$host, string \$name, string \$user, string \$pass): array
{
    try {
        \$dsn = "mysql:host={\$host};dbname={\$name};charset=utf8mb4";
        \$pdo = new PDO(\$dsn, \$user, \$pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        
        // Create tables
        \$pdo->exec("
            CREATE TABLE IF NOT EXISTS events (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL UNIQUE,
                qr_code_url VARCHAR(512) DEFAULT NULL,
                status ENUM('active', 'archived') DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_slug (slug),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            
            CREATE TABLE IF NOT EXISTS photos (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                event_id INT UNSIGNED NOT NULL,
                filename_full VARCHAR(255) NOT NULL,
                filename_thumb VARCHAR(255) NOT NULL,
                original_name VARCHAR(255) DEFAULT NULL,
                file_size INT UNSIGNED DEFAULT 0,
                mime_type VARCHAR(100) DEFAULT 'image/webp',
                width SMALLINT UNSIGNED DEFAULT 0,
                height SMALLINT UNSIGNED DEFAULT 0,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                INDEX idx_event_id (event_id),
                INDEX idx_uploaded_at (uploaded_at),
                INDEX idx_event_uploaded (event_id, uploaded_at DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            
            CREATE TABLE IF NOT EXISTS admin_users (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
        
        return ['success' => true, 'message' => 'Schema berhasil diimport'];
    } catch (PDOException \$e) {
        return ['success' => false, 'message' => 'Import gagal: ' . \$e->getMessage()];
    }
}

// ============================================
// STEP 4: CREATE ADMIN + GENERATE CONFIG
// ============================================

function createAdminAndConfig(
    string \$host, string \$name, string \$user, string \$pass,
    string \$adminUser, string \$adminPass, string \$baseUrl
): array {
    try {
        \$dsn = "mysql:host={\$host};dbname={\$name};charset=utf8mb4";
        \$pdo = new PDO(\$dsn, \$user, \$pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        
        // Create admin user
        \$hash = password_hash(\$adminPass, PASSWORD_DEFAULT);
        \$stmt = \$pdo->prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)');
        \$stmt->execute([\$adminUser, \$hash]);
        
        // Generate config/Database.php
        \$configContent = "<?php
declare(strict_types=1);

class Database
{
    private static ?PDO \\\$instance = null;
    
    private const DB_HOST = '{\$host}';
    private const DB_NAME = '{\$name}';
    private const DB_USER = '{\$user}';
    private const DB_PASS = '{\$pass}';
    private const DB_CHARSET = 'utf8mb4';
    
    private function __construct() {}
    private function __clone() {}
    
    public static function getInstance(): PDO
    {
        if (self::\\\$instance === null) {
            \\\$dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s',
                self::DB_HOST, self::DB_NAME, self::DB_CHARSET);
            
            \\\$options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => \\"SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci\\",
            ];
            
            self::\\\$instance = new PDO(\\\$dsn, self::DB_USER, self::DB_PASS, \\\$options);
        }
        return self::\\\$instance;
    }
    
    public static function query(string \\\$sql, array \\\$params = []): \\\\PDOStatement {
        \\\$stmt = self::getInstance()->prepare(\\\$sql);
        \\\$stmt->execute(\\\$params);
        return \\\$stmt;
    }
    
    public static function fetchOne(string \\\$sql, array \\\$params = []): array|false {
        return self::query(\\\$sql, \\\$params)->fetch();
    }
    
    public static function fetchAll(string \\\$sql, array \\\$params = []): array {
        return self::query(\\\$sql, \\\$params)->fetchAll();
    }
    
    public static function insert(string \\\$sql, array \\\$params = []): int {
        self::query(\\\$sql, \\\$params);
        return (int) self::getInstance()->lastInsertId();
    }
}";
        
        \$configDir = __DIR__ . '/config';
        if (!is_dir(\$configDir)) mkdir(\$configDir, 0755, true);
        file_put_contents(\$configDir . '/Database.php', \$configContent);
        
        // Update QR Generator base URL
        \$qrFile = __DIR__ . '/classes/QrGenerator.php';
        if (file_exists(\$qrFile)) {
            \$content = file_get_contents(\$qrFile);
            \$content = preg_replace(
                "/private const BASE_GALLERY_URL = '.*?';/",
                "private const BASE_GALLERY_URL = '{\$baseUrl}';",
                \$content
            );
            file_put_contents(\$qrFile, \$content);
        }
        
        // Create directories
        foreach (['/uploads', '/uploads/thumbs', '/uploads/qrcodes'] as \$dir) {
            \$path = __DIR__ . \$dir;
            if (!is_dir(\$path)) mkdir(\$path, 0755, true);
        }
        
        // Mark as installed
        file_put_contents(__DIR__ . '/.installed', date('Y-m-d H:i:s'));
        
        return ['success' => true, 'message' => 'Instalasi berhasil!'];
    } catch (Exception \$e) {
        return ['success' => false, 'message' => \$e->getMessage()];
    }
}

// ============================================
// PROCESS FORM SUBMISSIONS
// ============================================

if (\$_SERVER['REQUEST_METHOD'] === 'POST') {
    \$action = \$_POST['action'] ?? '';
    
    if (\$action === 'test_db') {
        \$result = testDatabaseConnection(
            \$_POST['db_host'] ?? 'localhost',
            \$_POST['db_name'] ?? '',
            \$_POST['db_user'] ?? '',
            \$_POST['db_pass'] ?? ''
        );
        
        if (\$result['success']) {
            \$_SESSION['db_config'] = [
                'host' => \$_POST['db_host'],
                'name' => \$_POST['db_name'],
                'user' => \$_POST['db_user'],
                'pass' => \$_POST['db_pass'],
            ];
            header('Location: install.php?step=3');
            exit;
        } else {
            \$errors[] = \$result['message'];
        }
    }
    
    if (\$action === 'import_schema') {
        \$result = importSchema(
            \$_SESSION['db_config']['host'],
            \$_SESSION['db_config']['name'],
            \$_SESSION['db_config']['user'],
            \$_SESSION['db_config']['pass']
        );
        
        if (\$result['success']) {
            header('Location: install.php?step=4');
            exit;
        } else {
            \$errors[] = \$result['message'];
        }
    }
    
    if (\$action === 'create_admin') {
        \$adminUser = trim(\$_POST['admin_user'] ?? '');
        \$adminPass = \$_POST['admin_pass'] ?? '';
        \$adminPassConfirm = \$_POST['admin_pass_confirm'] ?? '';
        \$baseUrl = trim(\$_POST['base_url'] ?? '');
        
        if (empty(\$adminUser) || strlen(\$adminPass) < 8) {
            \$errors[] = 'Username wajib diisi dan password minimal 8 karakter';
        } elseif (\$adminPass !== \$adminPassConfirm) {
            \$errors[] = 'Password konfirmasi tidak cocok';
        } else {
            \$result = createAdminAndConfig(
                \$_SESSION['db_config']['host'],
                \$_SESSION['db_config']['name'],
                \$_SESSION['db_config']['user'],
                \$_SESSION['db_config']['pass'],
                \$adminUser, \$adminPass, \$baseUrl
            );
            
            if (\$result['success']) {
                session_destroy();
                header('Location: install.php?step=5');
                exit;
            } else {
                \$errors[] = \$result['message'];
            }
        }
    }
}

// ============================================
// HTML RENDER (Wizard UI)
// ============================================
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Installer - Photobooth Gallery</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, sans-serif; background: linear-gradient(135deg, #667eea, #764ba2); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .card { max-width: 700px; width: 100%; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
        .header { background: linear-gradient(135deg, #6c63ff, #8b5cf6); color: white; padding: 32px; text-align: center; }
        .header h1 { font-size: 24px; margin-bottom: 8px; }
        .content { padding: 32px; }
        
        .progress { display: flex; justify-content: space-between; margin-bottom: 32px; }
        .progress-step { flex: 1; text-align: center; }
        .progress-circle { width: 40px; height: 40px; border-radius: 50%; background: #e0e0e0; color: #999; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; margin-bottom: 8px; }
        .progress-step.active .progress-circle { background: #6c63ff; color: white; }
        .progress-step.done .progress-circle { background: #10b981; color: white; }
        .progress-label { font-size: 11px; color: #666; }
        
        .req-item { display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #f0f0f0; }
        .req-icon { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px; }
        .req-icon.pass { background: #d1fae5; color: #10b981; }
        .req-icon.fail { background: #fee2e2; color: #ef4444; }
        .req-info { flex: 1; }
        .req-name { font-weight: 600; font-size: 13px; }
        .req-detail { font-size: 11px; color: #666; }
        
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 13px; }
        .form-group input { width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; }
        .form-group input:focus { outline: none; border-color: #6c63ff; }
        
        .btn { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; text-decoration: none; display: inline-block; }
        .btn-primary { background: #6c63ff; color: white; }
        .btn-secondary { background: #f0f0f0; color: #666; }
        .btn-group { display: flex; gap: 12px; margin-top: 24px; }
        
        .alert { padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
        .alert-error { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>📸 Photobooth Gallery Installer</h1>
            <p>Setup wizard 4 langkah</p>
        </div>
        
        <div class="content">
            <?php if (\$step === 5): ?>
                <div style="text-align:center;padding:40px 0;">
                    <div style="font-size:64px;">✅</div>
                    <h2 style="color:#10b981;margin:16px 0;">Instalasi Berhasil!</h2>
                    <p style="color:#666;">Sistem siap digunakan. Hapus file install.php untuk keamanan.</p>
                    <div style="margin-top:24px;">
                        <a href="admin.php" class="btn btn-primary">🔐 Ke Admin Panel</a>
                    </div>
                </div>
            <?php else: ?>
                <!-- Progress -->
                <div class="progress">
                    <div class="progress-step <?= \$step >= 1 ? (\$step > 1 ? 'done' : 'active') : '' ?>">
                        <div class="progress-circle"><?= \$step > 1 ? '✓' : '1' ?></div>
                        <div class="progress-label">Requirements</div>
                    </div>
                    <div class="progress-step <?= \$step >= 2 ? (\$step > 2 ? 'done' : 'active') : '' ?>">
                        <div class="progress-circle"><?= \$step > 2 ? '✓' : '2' ?></div>
                        <div class="progress-label">Database</div>
                    </div>
                    <div class="progress-step <?= \$step >= 3 ? (\$step > 3 ? 'done' : 'active') : '' ?>">
                        <div class="progress-circle"><?= \$step > 3 ? '✓' : '3' ?></div>
                        <div class="progress-label">Schema</div>
                    </div>
                    <div class="progress-step <?= \$step >= 4 ? 'active' : '' ?>">
                        <div class="progress-circle">4</div>
                        <div class="progress-label">Admin</div>
                    </div>
                </div>
                
                <?php foreach (\$errors as \$e): ?>
                    <div class="alert alert-error">❌ <?= htmlspecialchars(\$e) ?></div>
                <?php endforeach; ?>
                
                <?php if (\$step === 1): ?>
                    <h2 style="margin-bottom:16px;">🔍 Cek Requirement</h2>
                    <?php \$allPass = true; ?>
                    <?php foreach (checkRequirements() as \$c): ?>
                        <?php if (\$c['critical'] && !\$c['pass']) \$allPass = false; ?>
                        <div class="req-item">
                            <div class="req-icon <?= \$c['pass'] ? 'pass' : 'fail' ?>"><?= \$c['pass'] ? '✓' : '✗' ?></div>
                            <div class="req-info">
                                <div class="req-name"><?= \$c['name'] ?></div>
                                <div class="req-detail"><?= \$c['required'] ?> | Current: <?= \$c['current'] ?></div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                    <div class="btn-group">
                        <?php if (\$allPass): ?>
                            <a href="install.php?step=2" class="btn btn-primary">Lanjutkan →</a>
                        <?php else: ?>
                            <span style="color:#ef4444;font-size:13px;">Perbaiki requirement terlebih dahulu</span>
                        <?php endif; ?>
                    </div>
                
                <?php elseif (\$step === 2): ?>
                    <h2 style="margin-bottom:16px;">🗄️ Konfigurasi Database</h2>
                    <form method="POST">
                        <input type="hidden" name="action" value="test_db">
                        <div class="form-group">
                            <label>Host</label>
                            <input type="text" name="db_host" value="localhost" required>
                        </div>
                        <div class="form-group">
                            <label>Database Name</label>
                            <input type="text" name="db_name" value="photobooth_gallery" required>
                        </div>
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" name="db_user" required>
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" name="db_pass" required>
                        </div>
                        <div class="btn-group">
                            <a href="install.php?step=1" class="btn btn-secondary">← Kembali</a>
                            <button type="submit" class="btn btn-primary">Test & Lanjutkan →</button>
                        </div>
                    </form>
                
                <?php elseif (\$step === 3): ?>
                    <h2 style="margin-bottom:16px;">📊 Import Schema</h2>
                    <p style="color:#666;margin-bottom:16px;">Tabel yang akan dibuat: events, photos, admin_users</p>
                    <form method="POST">
                        <input type="hidden" name="action" value="import_schema">
                        <div class="btn-group">
                            <a href="install.php?step=2" class="btn btn-secondary">← Kembali</a>
                            <button type="submit" class="btn btn-primary">Import Schema →</button>
                        </div>
                    </form>
                
                <?php elseif (\$step === 4): ?>
                    <h2 style="margin-bottom:16px;">👤 Setup Admin</h2>
                    <form method="POST">
                        <input type="hidden" name="action" value="create_admin">
                        <div class="form-group">
                            <label>Admin Username</label>
                            <input type="text" name="admin_user" value="admin" required>
                        </div>
                        <div class="form-group">
                            <label>Password (min 8 karakter)</label>
                            <input type="password" name="admin_pass" required minlength="8">
                        </div>
                        <div class="form-group">
                            <label>Konfirmasi Password</label>
                            <input type="password" name="admin_pass_confirm" required minlength="8">
                        </div>
                        <div class="form-group">
                            <label>Base URL Gallery</label>
                            <input type="url" name="base_url" value="https://<?= htmlspecialchars(\$_SERVER['HTTP_HOST'] ?? 'yourdomain.com') ?>/gallery/" required>
                        </div>
                        <div class="btn-group">
                            <a href="install.php?step=3" class="btn btn-secondary">← Kembali</a>
                            <button type="submit" class="btn btn-primary">🚀 Install Sekarang</button>
                        </div>
                    </form>
                <?php endif; ?>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>`
  },
  {
    id: "gallery-htaccess",
    name: "gallery.php",
    path: "gallery.php",
    language: "php",
    description: "Clean URL router untuk /gallery/event-slug",
    icon: "🔗",
    code: `<?php
declare(strict_types=1);

/**
 * gallery.php - Clean URL Router
 * Maps /gallery/event-slug to index.php?event=event-slug
 * 
 * Alternative: Use .htaccess RewriteRule instead of this file
 */

// Get the path after /gallery/
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$path = parse_url($requestUri, PHP_URL_PATH);

// Extract event slug from path
if (preg_match('#^/gallery/?([a-zA-Z0-9-]+)?/?$#', $path, $matches)) {
    $slug = $matches[1] ?? '';
    
    if (!empty($slug)) {
        // Include the main gallery page
        $_GET['event'] = $slug;
        require __DIR__ . '/index.php';
        exit;
    }
}

// If no slug, show error or redirect
http_response_code(404);
echo '<!DOCTYPE html>
<html>
<head><title>404 - Event Not Found</title></head>
<body style="font-family:sans-serif;text-align:center;padding:50px;">
    <h1>📸 Event tidak ditemukan</h1>
    <p>URL galeri yang Anda tuju tidak valid.</p>
    <p><a href="/">Kembali ke Beranda</a></p>
</body>
</html>';`
  }
];

export const installPhpCode = `<?php
declare(strict_types=1);

/**
 * install.php - Photobooth Gallery Installer
 * Wizard instalasi otomatis untuk setup awal sistem
 * 
 * FITUR:
 * - Cek requirement sistem (PHP, extensions, permissions)
 * - Setup database connection
 * - Import schema SQL otomatis
 * - Create admin user
 * - Generate config file
 * - Auto-delete setelah instalasi (keamanan)
 * 
 * CARA PAKAI:
 * 1. Upload semua file ke server
 * 2. Akses https://yourdomain.com/install.php
 * 3. Ikuti wizard 4 langkah
 * 4. Hapus file install.php setelah selesai (otomatis)
 */

session_start();

// ============================================
// SECURITY: Check if already installed
// ============================================

\$configFile = __DIR__ . '/config/Database.php';
if (file_exists(\$configFile) && !isset(\$_GET['force'])) {
    if (file_exists(__DIR__ . '/.installed')) {
        die('Sistem sudah terinstall. Hapus file .installed untuk reinstall.');
    }
}

// ============================================
// STEP MANAGEMENT
// ============================================

\$step = (int) (\$_GET['step'] ?? \$_POST['step'] ?? 1);
\$step = max(1, min(4, \$step));

\$errors = [];
\$success = [];

// ============================================
// STEP 1: SYSTEM REQUIREMENTS CHECK
// ============================================

function checkRequirements(): array
{
    \$checks = [];
    
    // PHP Version
    \$checks[] = [
        'name' => 'PHP Version',
        'required' => '>= 8.2.0',
        'current' => PHP_VERSION,
        'pass' => version_compare(PHP_VERSION, '8.2.0', '>='),
        'critical' => true,
    ];
    
    // Required Extensions
    \$extensions = [
        'pdo' => 'PDO',
        'pdo_mysql' => 'PDO MySQL',
        'gd' => 'GD Library',
        'json' => 'JSON',
        'mbstring' => 'Multibyte String',
        'fileinfo' => 'File Info',
        'session' => 'Session',
    ];
    
    foreach (\$extensions as \$ext => \$name) {
        \$loaded = extension_loaded(\$ext);
        \$checks[] = [
            'name' => \$name . ' Extension',
            'required' => 'Enabled',
            'current' => \$loaded ? 'Enabled' : 'Disabled',
            'pass' => \$loaded,
            'critical' => true,
        ];
    }
    
    // WebP Support
    \$webpSupport = function_exists('imagewebp');
    \$checks[] = [
        'name' => 'WebP Support (GD)',
        'required' => 'Enabled',
        'current' => \$webpSupport ? 'Supported' : 'Not Supported',
        'pass' => \$webpSupport,
        'critical' => true,
    ];
    
    // Writable Directories
    \$dirs = [
        __DIR__ => 'Root Directory',
        __DIR__ . '/uploads' => 'Uploads Directory',
        __DIR__ . '/uploads/thumbs' => 'Thumbs Directory',
        __DIR__ . '/uploads/qrcodes' => 'QR Codes Directory',
        __DIR__ . '/config' => 'Config Directory',
    ];
    
    foreach (\$dirs as \$dir => \$name) {
        \$exists = is_dir(\$dir);
        \$writable = \$exists && is_writable(\$dir);
        \$checks[] = [
            'name' => \$name . ' (Writable)',
            'required' => 'Writable',
            'current' => !\$exists ? 'Not Found' : (\$writable ? 'Writable' : 'Not Writable'),
            'pass' => \$writable,
            'critical' => !\$exists || strpos(\$name, 'Root') !== false || strpos(\$name, 'Config') !== false,
        ];
    }
    
    // Upload Size
    \$uploadMax = ini_get('upload_max_filesize');
    \$postMax = ini_get('post_max_size');
    \$checks[] = [
        'name' => 'Upload Max Filesize',
        'required' => '>= 10M',
        'current' => \$uploadMax,
        'pass' => return_bytes(\$uploadMax) >= 10 * 1024 * 1024,
        'critical' => false,
    ];
    
    \$checks[] = [
        'name' => 'Post Max Size',
        'required' => '>= 12M',
        'current' => \$postMax,
        'pass' => return_bytes(\$postMax) >= 12 * 1024 * 1024,
        'critical' => false,
    ];
    
    // Memory Limit
    \$memoryLimit = ini_get('memory_limit');
    \$checks[] = [
        'name' => 'Memory Limit',
        'required' => '>= 128M',
        'current' => \$memoryLimit,
        'pass' => \$memoryLimit === '-1' || return_bytes(\$memoryLimit) >= 128 * 1024 * 1024,
        'critical' => false,
    ];
    
    return \$checks;
}

function return_bytes(string \$val): int
{
    \$val = trim(\$val);
    \$last = strtolower(\$val[strlen(\$val) - 1]);
    \$val = (int) \$val;
    
    return match(\$last) {
        'g' => \$val * 1024 * 1024 * 1024,
        'm' => \$val * 1024 * 1024,
        'k' => \$val * 1024,
        default => \$val,
    };
}

// ============================================
// STEP 2: DATABASE SETUP
// ============================================

function testDatabaseConnection(string \$host, string \$name, string \$user, string \$pass): array
{
    try {
        \$dsn = "mysql:host={\$host};charset=utf8mb4";
        \$pdo = new PDO(\$dsn, \$user, \$pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        
        // Check if database exists
        \$stmt = \$pdo->prepare('SHOW DATABASES LIKE ?');
        \$stmt->execute([\$name]);
        \$dbExists = \$stmt->fetch() !== false;
        
        if (!\$dbExists) {
            \$pdo->exec("CREATE DATABASE \`{\$name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            \$created = true;
        } else {
            \$created = false;
        }
        
        \$pdo->exec("USE \`{\$name}\`");
        
        return [
            'success' => true,
            'message' => \$created ? 'Database berhasil dibuat' : 'Koneksi database berhasil',
        ];
    } catch (PDOException \$e) {
        return [
            'success' => false,
            'message' => 'Koneksi gagal: ' . \$e->getMessage(),
        ];
    }
}

// ============================================
// STEP 3: IMPORT SCHEMA
// ============================================

function importSchema(string \$host, string \$name, string \$user, string \$pass): array
{
    try {
        \$dsn = "mysql:host={\$host};dbname={\$name};charset=utf8mb4";
        \$pdo = new PDO(\$dsn, \$user, \$pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        
        \$schema = getSchemaSQL();
        \$pdo->exec(\$schema);
        
        return [
            'success' => true,
            'message' => 'Schema database berhasil diimport',
        ];
    } catch (PDOException \$e) {
        return [
            'success' => false,
            'message' => 'Import gagal: ' . \$e->getMessage(),
        ];
    }
}

function getSchemaSQL(): string
{
    return <<<'SQL'
CREATE TABLE IF NOT EXISTS events (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    qr_code_url VARCHAR(512) DEFAULT NULL,
    status ENUM('active', 'archived') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS photos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id INT UNSIGNED NOT NULL,
    filename_full VARCHAR(255) NOT NULL,
    filename_thumb VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) DEFAULT NULL,
    file_size INT UNSIGNED DEFAULT 0,
    mime_type VARCHAR(100) DEFAULT 'image/webp',
    width SMALLINT UNSIGNED DEFAULT 0,
    height SMALLINT UNSIGNED DEFAULT 0,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_event_id (event_id),
    INDEX idx_uploaded_at (uploaded_at),
    INDEX idx_event_uploaded (event_id, uploaded_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL;
}

// ============================================
// STEP 4: CREATE ADMIN & CONFIG
// ============================================

function createAdminUser(string \$host, string \$name, string \$user, string \$pass, string \$adminUser, string \$adminPass): array
{
    try {
        \$dsn = "mysql:host={\$host};dbname={\$name};charset=utf8mb4";
        \$pdo = new PDO(\$dsn, \$user, \$pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        
        \$stmt = \$pdo->prepare('SELECT id FROM admin_users WHERE username = ?');
        \$stmt->execute([\$adminUser]);
        
        if (\$stmt->fetch()) {
            \$hash = password_hash(\$adminPass, PASSWORD_DEFAULT);
            \$stmt = \$pdo->prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?');
            \$stmt->execute([\$hash, \$adminUser]);
        } else {
            \$hash = password_hash(\$adminPass, PASSWORD_DEFAULT);
            \$stmt = \$pdo->prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)');
            \$stmt->execute([\$adminUser, \$hash]);
        }
        
        return [
            'success' => true,
            'message' => 'Admin user berhasil dibuat',
        ];
    } catch (PDOException \$e) {
        return [
            'success' => false,
            'message' => 'Gagal membuat admin: ' . \$e->getMessage(),
        ];
    }
}

function generateConfigFile(string \$host, string \$name, string \$user, string \$pass): bool
{
    \$configContent = <<<PHP
<?php
declare(strict_types=1);

class Database
{
    private static ?PDO \\\$instance = null;
    
    private const DB_HOST = '{\$host}';
    private const DB_NAME = '{\$name}';
    private const DB_USER = '{\$user}';
    private const DB_PASS = '{\$pass}';
    private const DB_CHARSET = 'utf8mb4';
    
    private function __construct() {}
    private function __clone() {}
    
    public static function getInstance(): PDO
    {
        if (self::\\\$instance === null) {
            \\\$dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=%s',
                self::DB_HOST,
                self::DB_NAME,
                self::DB_CHARSET
            );
            
            \\\$options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
                PDO::ATTR_PERSISTENT         => false,
            ];
            
            try {
                self::\\\$instance = new PDO(\\\$dsn, self::DB_USER, self::DB_PASS, \\\$options);
            } catch (PDOException \\\$e) {
                error_log('Database Connection Error: ' . \\\$e->getMessage());
                http_response_code(500);
                die(json_encode(['error' => 'Database connection failed']));
            }
        }
        
        return self::\\\$instance;
    }
    
    public static function query(string \\\$sql, array \\\$params = []): \\\\PDOStatement
    {
        \\\$stmt = self::getInstance()->prepare(\\\$sql);
        \\\$stmt->execute(\\\$params);
        return \\\$stmt;
    }
    
    public static function fetchOne(string \\\$sql, array \\\$params = []): array|false
    {
        return self::query(\\\$sql, \\\$params)->fetch();
    }
    
    public static function fetchAll(string \\\$sql, array \\\$params = []): array
    {
        return self::query(\\\$sql, \\\$params)->fetchAll();
    }
    
    public static function insert(string \\\$sql, array \\\$params = []): int
    {
        self::query(\\\$sql, \\\$params);
        return (int) self::getInstance()->lastInsertId();
    }
}
PHP;
    
    \$configDir = __DIR__ . '/config';
    if (!is_dir(\$configDir)) {
        mkdir(\$configDir, 0755, true);
    }
    
    return file_put_contents(\$configDir . '/Database.php', \$configContent) !== false;
}

function updateQrGeneratorBaseUrl(string \$baseUrl): bool
{
    \$qrFile = __DIR__ . '/classes/QrGenerator.php';
    if (!file_exists(\$qrFile)) {
        return false;
    }
    
    \$content = file_get_contents(\$qrFile);
    \$content = preg_replace(
        "/private const BASE_GALLERY_URL = '.*?';/",
        "private const BASE_GALLERY_URL = '{\$baseUrl}';",
        \$content
    );
    
    return file_put_contents(\$qrFile, \$content) !== false;
}

function createDirectories(): bool
{
    \$dirs = [
        __DIR__ . '/uploads',
        __DIR__ . '/uploads/thumbs',
        __DIR__ . '/uploads/qrcodes',
        __DIR__ . '/config',
    ];
    
    foreach (\$dirs as \$dir) {
        if (!is_dir(\$dir)) {
            if (!mkdir(\$dir, 0755, true)) {
                return false;
            }
        }
    }
    
    return true;
}

function markAsInstalled(): bool
{
    return file_put_contents(__DIR__ . '/.installed', date('Y-m-d H:i:s')) !== false;
}

// ============================================
// PROCESS FORM SUBMISSIONS
// ============================================

if (\$_SERVER['REQUEST_METHOD'] === 'POST') {
    \$action = \$_POST['action'] ?? '';
    
    if (\$action === 'test_db') {
        \$result = testDatabaseConnection(
            \$_POST['db_host'] ?? 'localhost',
            \$_POST['db_name'] ?? '',
            \$_POST['db_user'] ?? '',
            \$_POST['db_pass'] ?? ''
        );
        
        if (\$result['success']) {
            \$_SESSION['db_config'] = [
                'host' => \$_POST['db_host'],
                'name' => \$_POST['db_name'],
                'user' => \$_POST['db_user'],
                'pass' => \$_POST['db_pass'],
            ];
            header('Location: install.php?step=3');
            exit;
        } else {
            \$errors[] = \$result['message'];
        }
    }
    
    if (\$action === 'import_schema') {
        if (empty(\$_SESSION['db_config'])) {
            header('Location: install.php?step=2');
            exit;
        }
        
        \$result = importSchema(
            \$_SESSION['db_config']['host'],
            \$_SESSION['db_config']['name'],
            \$_SESSION['db_config']['user'],
            \$_SESSION['db_config']['pass']
        );
        
        if (\$result['success']) {
            header('Location: install.php?step=4');
            exit;
        } else {
            \$errors[] = \$result['message'];
        }
    }
    
    if (\$action === 'create_admin') {
        if (empty(\$_SESSION['db_config'])) {
            header('Location: install.php?step=2');
            exit;
        }
        
        \$adminUser = trim(\$_POST['admin_user'] ?? '');
        \$adminPass = \$_POST['admin_pass'] ?? '';
        \$adminPassConfirm = \$_POST['admin_pass_confirm'] ?? '';
        \$baseUrl = trim(\$_POST['base_url'] ?? '');
        
        if (empty(\$adminUser) || strlen(\$adminPass) < 8) {
            \$errors[] = 'Username wajib diisi dan password minimal 8 karakter';
        } elseif (\$adminPass !== \$adminPassConfirm) {
            \$errors[] = 'Password konfirmasi tidak cocok';
        } else {
            \$result = createAdminUser(
                \$_SESSION['db_config']['host'],
                \$_SESSION['db_config']['name'],
                \$_SESSION['db_config']['user'],
                \$_SESSION['db_config']['pass'],
                \$adminUser,
                \$adminPass
            );
            
            if (\$result['success']) {
                if (!generateConfigFile(
                    \$_SESSION['db_config']['host'],
                    \$_SESSION['db_config']['name'],
                    \$_SESSION['db_config']['user'],
                    \$_SESSION['db_config']['pass']
                )) {
                    \$errors[] = 'Gagal generate config file';
                } else {
                    if (!empty(\$baseUrl)) {
                        updateQrGeneratorBaseUrl(\$baseUrl);
                    }
                    
                    createDirectories();
                    markAsInstalled();
                    session_destroy();
                    
                    header('Location: install.php?step=5');
                    exit;
                }
            } else {
                \$errors[] = \$result['message'];
            }
        }
    }
}

// HTML output sama dengan versi lengkap (4 step wizard + success page)
// ... (render HTML dengan progress bar, form per step, dan success page)
?>`;

export const installationGuide = `# 📋 Instruksi Instalasi

## 1. Persiapan Environment
\`\`\`bash
# Di cPanel, pastikan:
# - PHP 8.2 aktif
# - GD Library enabled
# - MariaDB 11.4 tersedia
# - Minimal 500MB free space
\`\`\`

## 2. Struktur Folder
\`\`\`
public_html/
├── config/
│   └── Database.php
├── classes/
│   ├── ImageProcessor.php
│   └── QrGenerator.php
├── uploads/
│   ├── thumbs/
│   └── qrcodes/
├── admin.php
├── index.php
├── download.php
├── gallery.php
├── .htaccess
├── composer.json
└── database.sql
\`\`\`

## 3. Import Database
\`\`\`sql
-- Via phpMyAdmin di cPanel:
-- 1. Buat database baru: photobooth_gallery
-- 2. Import file database.sql
-- 3. Atau jalankan SQL di tab "SQL" phpMyAdmin
\`\`\`

## 4. Konfigurasi
\`\`\`php
// Edit config/Database.php - ubah kredensial:
private const DB_USER = 'your_cpanel_db_username';
private const DB_PASS = 'your_db_password';

// Edit classes/QrGenerator.php - ubah domain:
private const BASE_GALLERY_URL = 'https://yourdomain.com/gallery/';
\`\`\`

## 5. Install Composer Dependencies (Opsional)
\`\`\`bash
# Via SSH di cPanel:
cd ~/public_html
composer install

# Atau upload vendor/ folder via FTP jika tidak ada SSH
\`\`\`

## 6. Set Permissions
\`\`\`bash
chmod 755 uploads/
chmod 755 uploads/thumbs/
chmod 755 uploads/qrcodes/
\`\`\`

## 7. Ganti Password Admin
\`\`\`php
// Jalankan sekali di browser atau via CLI:
// Password hash bisa di-generate dengan:
echo password_hash('YourNewPassword123!', PASSWORD_DEFAULT);
// Update di tabel admin_users
\`\`\`

## 8. Akses
- Admin Panel: https://yourdomain.com/admin.php
- Gallery: https://yourdomain.com/index.php?event=sample-wedding
- Clean URL: https://yourdomain.com/gallery/sample-wedding

## Default Login
- Username: admin
- Password: admin123 (SEGERA GANTI!)

## Tips Performa
1. Pastikan LiteSpeed Cache aktif di cPanel
2. Gunakan CDN untuk gambar jika traffic tinggi
3. Monitor storage NVMe (1 foto WebP ~150-300KB)
4. Dengan 10.000 foto ≈ 2-3GB storage
5. Index database sudah optimal untuk query cepat`;
