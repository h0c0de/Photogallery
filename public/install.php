<?php
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

$configFile = __DIR__ . '/config/Database.php';
if (file_exists($configFile) && !isset($_GET['force'])) {
    // Check if database is actually configured
    if (file_exists(__DIR__ . '/.installed')) {
        die('<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sudah Terinstall</title>
    <style>
        body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f2f5; margin: 0; }
        .box { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
        .box h1 { color: #e74c3c; margin-bottom: 16px; }
        .box p { color: #666; line-height: 1.6; }
        .box code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    </style>
</head>
<body>
    <div class="box">
        <h1>⚠️ Sudah Terinstall</h1>
        <p>Sistem sudah terinstall. Untuk reinstall, hapus file <code>.installed</code> atau tambahkan parameter <code>?force=1</code> di URL.</p>
        <p style="margin-top: 20px;"><a href="admin.php" style="color: #6c63ff; text-decoration: none; font-weight: 600;">→ Ke Admin Panel</a></p>
    </div>
</body>
</html>');
    }
}

// ============================================
// STEP MANAGEMENT
// ============================================

$step = (int) ($_GET['step'] ?? $_POST['step'] ?? 1);
$step = max(1, min(4, $step));

$errors = [];
$success = [];

// ============================================
// STEP 1: SYSTEM REQUIREMENTS CHECK
// ============================================

function checkRequirements(): array
{
    $checks = [];
    
    // PHP Version
    $checks[] = [
        'name' => 'PHP Version',
        'required' => '>= 8.2.0',
        'current' => PHP_VERSION,
        'pass' => version_compare(PHP_VERSION, '8.2.0', '>='),
        'critical' => true,
    ];
    
    // Required Extensions
    $extensions = [
        'pdo' => 'PDO',
        'pdo_mysql' => 'PDO MySQL',
        'gd' => 'GD Library',
        'json' => 'JSON',
        'mbstring' => 'Multibyte String',
        'fileinfo' => 'File Info',
        'session' => 'Session',
    ];
    
    foreach ($extensions as $ext => $name) {
        $loaded = extension_loaded($ext);
        $checks[] = [
            'name' => $name . ' Extension',
            'required' => 'Enabled',
            'current' => $loaded ? 'Enabled' : 'Disabled',
            'pass' => $loaded,
            'critical' => true,
        ];
    }
    
    // WebP Support
    $webpSupport = function_exists('imagewebp');
    $checks[] = [
        'name' => 'WebP Support (GD)',
        'required' => 'Enabled',
        'current' => $webpSupport ? 'Supported' : 'Not Supported',
        'pass' => $webpSupport,
        'critical' => true,
    ];
    
    // Writable Directories
    $dirs = [
        __DIR__ => 'Root Directory',
        __DIR__ . '/uploads' => 'Uploads Directory',
        __DIR__ . '/uploads/thumbs' => 'Thumbs Directory',
        __DIR__ . '/uploads/qrcodes' => 'QR Codes Directory',
        __DIR__ . '/config' => 'Config Directory',
    ];
    
    foreach ($dirs as $dir => $name) {
        $exists = is_dir($dir);
        $writable = $exists && is_writable($dir);
        $checks[] = [
            'name' => $name . ' (Writable)',
            'required' => 'Writable',
            'current' => !$exists ? 'Not Found' : ($writable ? 'Writable' : 'Not Writable'),
            'pass' => $writable,
            'critical' => !$exists || strpos($name, 'Root') !== false || strpos($name, 'Config') !== false,
        ];
    }
    
    // Upload Size
    $uploadMax = ini_get('upload_max_filesize');
    $postMax = ini_get('post_max_size');
    $checks[] = [
        'name' => 'Upload Max Filesize',
        'required' => '>= 10M',
        'current' => $uploadMax,
        'pass' => return_bytes($uploadMax) >= 10 * 1024 * 1024,
        'critical' => false,
    ];
    
    $checks[] = [
        'name' => 'Post Max Size',
        'required' => '>= 12M',
        'current' => $postMax,
        'pass' => return_bytes($postMax) >= 12 * 1024 * 1024,
        'critical' => false,
    ];
    
    // Memory Limit
    $memoryLimit = ini_get('memory_limit');
    $checks[] = [
        'name' => 'Memory Limit',
        'required' => '>= 128M',
        'current' => $memoryLimit,
        'pass' => $memoryLimit === '-1' || return_bytes($memoryLimit) >= 128 * 1024 * 1024,
        'critical' => false,
    ];
    
    return $checks;
}

function return_bytes(string $val): int
{
    $val = trim($val);
    $last = strtolower($val[strlen($val) - 1]);
    $val = (int) $val;
    
    return match($last) {
        'g' => $val * 1024 * 1024 * 1024,
        'm' => $val * 1024 * 1024,
        'k' => $val * 1024,
        default => $val,
    };
}

// ============================================
// STEP 2: DATABASE SETUP
// ============================================

function testDatabaseConnection(string $host, string $name, string $user, string $pass): array
{
    try {
        $dsn = "mysql:host={$host};charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        
        // Check if database exists
        $stmt = $pdo->prepare('SHOW DATABASES LIKE ?');
        $stmt->execute([$name]);
        $dbExists = $stmt->fetch() !== false;
        
        if (!$dbExists) {
            // Try to create database
            $pdo->exec("CREATE DATABASE `{$name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $created = true;
        } else {
            $created = false;
        }
        
        // Test connection to the database
        $pdo->exec("USE `{$name}`");
        
        return [
            'success' => true,
            'message' => $created ? 'Database berhasil dibuat' : 'Koneksi database berhasil',
        ];
    } catch (PDOException $e) {
        return [
            'success' => false,
            'message' => 'Koneksi gagal: ' . $e->getMessage(),
        ];
    }
}

// ============================================
// STEP 3: IMPORT SCHEMA
// ============================================

function importSchema(string $host, string $name, string $user, string $pass): array
{
    try {
        $dsn = "mysql:host={$host};dbname={$name};charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        
        $schema = getSchemaSQL();
        
        // Execute schema
        $pdo->exec($schema);
        
        return [
            'success' => true,
            'message' => 'Schema database berhasil diimport',
        ];
    } catch (PDOException $e) {
        return [
            'success' => false,
            'message' => 'Import gagal: ' . $e->getMessage(),
        ];
    }
}

function getSchemaSQL(): string
{
    return <<<'SQL'
-- Photobooth Gallery Schema
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

function createAdminUser(string $host, string $name, string $user, string $pass, string $adminUser, string $adminPass): array
{
    try {
        $dsn = "mysql:host={$host};dbname={$name};charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        
        // Check if admin exists
        $stmt = $pdo->prepare('SELECT id FROM admin_users WHERE username = ?');
        $stmt->execute([$adminUser]);
        
        if ($stmt->fetch()) {
            // Update password
            $hash = password_hash($adminPass, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?');
            $stmt->execute([$hash, $adminUser]);
        } else {
            // Insert new admin
            $hash = password_hash($adminPass, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)');
            $stmt->execute([$adminUser, $hash]);
        }
        
        return [
            'success' => true,
            'message' => 'Admin user berhasil dibuat',
        ];
    } catch (PDOException $e) {
        return [
            'success' => false,
            'message' => 'Gagal membuat admin: ' . $e->getMessage(),
        ];
    }
}

function generateConfigFile(string $host, string $name, string $user, string $pass): bool
{
    $configContent = <<<PHP
<?php
declare(strict_types=1);

/**
 * Database.php - PDO Connection Manager
 * Generated by install.php
 */

class Database
{
    private static ?PDO \$instance = null;
    
    private const DB_HOST = '{$host}';
    private const DB_NAME = '{$name}';
    private const DB_USER = '{$user}';
    private const DB_PASS = '{$pass}';
    private const DB_CHARSET = 'utf8mb4';
    
    private function __construct() {}
    private function __clone() {}
    
    public static function getInstance(): PDO
    {
        if (self::\$instance === null) {
            \$dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=%s',
                self::DB_HOST,
                self::DB_NAME,
                self::DB_CHARSET
            );
            
            \$options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
                PDO::ATTR_PERSISTENT         => false,
            ];
            
            try {
                self::\$instance = new PDO(\$dsn, self::DB_USER, self::DB_PASS, \$options);
            } catch (PDOException \$e) {
                error_log('Database Connection Error: ' . \$e->getMessage());
                http_response_code(500);
                die(json_encode(['error' => 'Database connection failed']));
            }
        }
        
        return self::\$instance;
    }
    
    public static function query(string \$sql, array \$params = []): \\PDOStatement
    {
        \$stmt = self::getInstance()->prepare(\$sql);
        \$stmt->execute(\$params);
        return \$stmt;
    }
    
    public static function fetchOne(string \$sql, array \$params = []): array|false
    {
        return self::query(\$sql, \$params)->fetch();
    }
    
    public static function fetchAll(string \$sql, array \$params = []): array
    {
        return self::query(\$sql, \$params)->fetchAll();
    }
    
    public static function insert(string \$sql, array \$params = []): int
    {
        self::query(\$sql, \$params);
        return (int) self::getInstance()->lastInsertId();
    }
}
PHP;
    
    $configDir = __DIR__ . '/config';
    if (!is_dir($configDir)) {
        mkdir($configDir, 0755, true);
    }
    
    return file_put_contents($configDir . '/Database.php', $configContent) !== false;
}

function updateQrGeneratorBaseUrl(string $baseUrl): bool
{
    $qrFile = __DIR__ . '/classes/QrGenerator.php';
    if (!file_exists($qrFile)) {
        return false;
    }
    
    $content = file_get_contents($qrFile);
    $content = preg_replace(
        "/private const BASE_GALLERY_URL = '.*?';/",
        "private const BASE_GALLERY_URL = '{$baseUrl}';",
        $content
    );
    
    return file_put_contents($qrFile, $content) !== false;
}

function createDirectories(): bool
{
    $dirs = [
        __DIR__ . '/uploads',
        __DIR__ . '/uploads/thumbs',
        __DIR__ . '/uploads/qrcodes',
        __DIR__ . '/config',
    ];
    
    foreach ($dirs as $dir) {
        if (!is_dir($dir)) {
            if (!mkdir($dir, 0755, true)) {
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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'test_db') {
        $result = testDatabaseConnection(
            $_POST['db_host'] ?? 'localhost',
            $_POST['db_name'] ?? '',
            $_POST['db_user'] ?? '',
            $_POST['db_pass'] ?? ''
        );
        
        if ($result['success']) {
            $_SESSION['db_config'] = [
                'host' => $_POST['db_host'],
                'name' => $_POST['db_name'],
                'user' => $_POST['db_user'],
                'pass' => $_POST['db_pass'],
            ];
            header('Location: install.php?step=3');
            exit;
        } else {
            $errors[] = $result['message'];
        }
    }
    
    if ($action === 'import_schema') {
        if (empty($_SESSION['db_config'])) {
            header('Location: install.php?step=2');
            exit;
        }
        
        $result = importSchema(
            $_SESSION['db_config']['host'],
            $_SESSION['db_config']['name'],
            $_SESSION['db_config']['user'],
            $_SESSION['db_config']['pass']
        );
        
        if ($result['success']) {
            $success[] = $result['message'];
            header('Location: install.php?step=4');
            exit;
        } else {
            $errors[] = $result['message'];
        }
    }
    
    if ($action === 'create_admin') {
        if (empty($_SESSION['db_config'])) {
            header('Location: install.php?step=2');
            exit;
        }
        
        $adminUser = trim($_POST['admin_user'] ?? '');
        $adminPass = $_POST['admin_pass'] ?? '';
        $adminPassConfirm = $_POST['admin_pass_confirm'] ?? '';
        $baseUrl = trim($_POST['base_url'] ?? '');
        
        if (empty($adminUser) || strlen($adminPass) < 8) {
            $errors[] = 'Username wajib diisi dan password minimal 8 karakter';
        } elseif ($adminPass !== $adminPassConfirm) {
            $errors[] = 'Password konfirmasi tidak cocok';
        } else {
            // Create admin
            $result = createAdminUser(
                $_SESSION['db_config']['host'],
                $_SESSION['db_config']['name'],
                $_SESSION['db_config']['user'],
                $_SESSION['db_config']['pass'],
                $adminUser,
                $adminPass
            );
            
            if ($result['success']) {
                // Generate config
                if (!generateConfigFile(
                    $_SESSION['db_config']['host'],
                    $_SESSION['db_config']['name'],
                    $_SESSION['db_config']['user'],
                    $_SESSION['db_config']['pass']
                )) {
                    $errors[] = 'Gagal generate config file';
                } else {
                    // Update QR base URL
                    if (!empty($baseUrl)) {
                        updateQrGeneratorBaseUrl($baseUrl);
                    }
                    
                    // Create directories
                    createDirectories();
                    
                    // Mark as installed
                    markAsInstalled();
                    
                    // Clear session
                    session_destroy();
                    
                    header('Location: install.php?step=5');
                    exit;
                }
            } else {
                $errors[] = $result['message'];
            }
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
    <title>Installer - Photobooth Gallery</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .container { max-width: 700px; width: 100%; }
        .card { background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
        .header { background: linear-gradient(135deg, #6c63ff, #8b5cf6); color: white; padding: 32px; text-align: center; }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .header p { opacity: 0.9; font-size: 14px; }
        .content { padding: 32px; }
        
        /* Progress Bar */
        .progress { display: flex; justify-content: space-between; margin-bottom: 32px; position: relative; }
        .progress::before { content: ''; position: absolute; top: 20px; left: 0; right: 0; height: 2px; background: #e0e0e0; z-index: 0; }
        .progress-step { flex: 1; text-align: center; position: relative; z-index: 1; }
        .progress-circle { width: 40px; height: 40px; border-radius: 50%; background: #e0e0e0; color: #999; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; margin-bottom: 8px; transition: all 0.3s; }
        .progress-step.active .progress-circle { background: #6c63ff; color: white; box-shadow: 0 4px 12px rgba(108,99,255,0.4); }
        .progress-step.completed .progress-circle { background: #10b981; color: white; }
        .progress-label { font-size: 12px; color: #666; font-weight: 500; }
        .progress-step.active .progress-label { color: #6c63ff; font-weight: 600; }
        
        /* Requirements */
        .req-list { list-style: none; }
        .req-item { display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #f0f0f0; }
        .req-item:last-child { border-bottom: none; }
        .req-icon { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 14px; }
        .req-icon.pass { background: #d1fae5; color: #10b981; }
        .req-icon.fail { background: #fee2e2; color: #ef4444; }
        .req-icon.warn { background: #fef3c7; color: #f59e0b; }
        .req-info { flex: 1; }
        .req-name { font-weight: 600; font-size: 14px; color: #1a1a2e; }
        .req-detail { font-size: 12px; color: #666; margin-top: 2px; }
        .req-status { font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 4px; }
        .req-status.pass { background: #d1fae5; color: #10b981; }
        .req-status.fail { background: #fee2e2; color: #ef4444; }
        .req-status.warn { background: #fef3c7; color: #f59e0b; }
        
        /* Forms */
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #1a1a2e; }
        .form-group input { width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 15px; transition: border-color 0.2s; }
        .form-group input:focus { outline: none; border-color: #6c63ff; }
        .form-group .hint { font-size: 12px; color: #666; margin-top: 4px; }
        
        /* Buttons */
        .btn { display: inline-block; padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; text-decoration: none; }
        .btn-primary { background: #6c63ff; color: white; }
        .btn-primary:hover { background: #5a52d5; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(108,99,255,0.4); }
        .btn-secondary { background: #f0f0f0; color: #666; }
        .btn-secondary:hover { background: #e0e0e0; }
        .btn-success { background: #10b981; color: white; }
        .btn-success:hover { background: #059669; }
        .btn-group { display: flex; gap: 12px; margin-top: 24px; }
        
        /* Alerts */
        .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .alert-error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .alert-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
        
        /* Success Page */
        .success-box { text-align: center; padding: 40px 20px; }
        .success-icon { font-size: 64px; margin-bottom: 20px; }
        .success-box h2 { color: #10b981; margin-bottom: 12px; }
        .success-box p { color: #666; line-height: 1.6; margin-bottom: 24px; }
        .success-links { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        
        @media (max-width: 600px) {
            .content { padding: 20px; }
            .header { padding: 24px; }
            .header h1 { font-size: 22px; }
            .progress-label { font-size: 10px; }
            .btn-group { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <h1>📸 Photobooth Gallery Installer</h1>
                <p>Setup wizard untuk instalasi sistem galeri foto</p>
            </div>
            
            <div class="content">
                <?php if ($step === 5): ?>
                    <!-- SUCCESS PAGE -->
                    <div class="success-box">
                        <div class="success-icon">✅</div>
                        <h2>Instalasi Berhasil!</h2>
                        <p>Sistem Photobooth Gallery telah berhasil diinstall.<br>
                        <strong>PENTING:</strong> Hapus file <code>install.php</code> dari server untuk keamanan!</p>
                        
                        <div class="success-links">
                            <a href="admin.php" class="btn btn-primary">🔐 Ke Admin Panel</a>
                            <a href="index.php?event=sample-wedding" class="btn btn-secondary">👁️ Preview Gallery</a>
                        </div>
                        
                        <div style="margin-top: 32px; padding: 16px; background: #fef3c7; border-radius: 8px; text-align: left;">
                            <p style="font-weight: 600; color: #92400e; margin-bottom: 8px;">⚠️ Checklist Setelah Install:</p>
                            <ul style="color: #78350f; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                                <li>Hapus file <code>install.php</code></li>
                                <li>Ganti password admin jika perlu</li>
                                <li>Update base URL di <code>classes/QrGenerator.php</code></li>
                                <li>Test upload foto pertama</li>
                                <li>Generate QR code untuk event</li>
                            </ul>
                        </div>
                    </div>
                
                <?php else: ?>
                    <!-- PROGRESS BAR -->
                    <div class="progress">
                        <div class="progress-step <?= $step >= 1 ? ($step > 1 ? 'completed' : 'active') : '' ?>">
                            <div class="progress-circle"><?= $step > 1 ? '✓' : '1' ?></div>
                            <div class="progress-label">Requirements</div>
                        </div>
                        <div class="progress-step <?= $step >= 2 ? ($step > 2 ? 'completed' : 'active') : '' ?>">
                            <div class="progress-circle"><?= $step > 2 ? '✓' : '2' ?></div>
                            <div class="progress-label">Database</div>
                        </div>
                        <div class="progress-step <?= $step >= 3 ? ($step > 3 ? 'completed' : 'active') : '' ?>">
                            <div class="progress-circle"><?= $step > 3 ? '✓' : '3' ?></div>
                            <div class="progress-label">Schema</div>
                        </div>
                        <div class="progress-step <?= $step >= 4 ? 'active' : '' ?>">
                            <div class="progress-circle">4</div>
                            <div class="progress-label">Admin</div>
                        </div>
                    </div>
                    
                    <!-- ERRORS -->
                    <?php if (!empty($errors)): ?>
                        <?php foreach ($errors as $error): ?>
                            <div class="alert alert-error">❌ <?= htmlspecialchars($error) ?></div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    
                    <!-- SUCCESS -->
                    <?php if (!empty($success)): ?>
                        <?php foreach ($success as $msg): ?>
                            <div class="alert alert-success">✅ <?= htmlspecialchars($msg) ?></div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    
                    <?php if ($step === 1): ?>
                        <!-- STEP 1: REQUIREMENTS -->
                        <h2 style="margin-bottom: 20px; font-size: 20px;">🔍 Cek Requirement Sistem</h2>
                        
                        <ul class="req-list">
                            <?php foreach (checkRequirements() as $check): ?>
                                <li class="req-item">
                                    <div class="req-icon <?= $check['pass'] ? 'pass' : ($check['critical'] ? 'fail' : 'warn') ?>">
                                        <?= $check['pass'] ? '✓' : ($check['critical'] ? '✗' : '⚠') ?>
                                    </div>
                                    <div class="req-info">
                                        <div class="req-name"><?= $check['name'] ?></div>
                                        <div class="req-detail">
                                            Required: <?= $check['required'] ?> | 
                                            Current: <?= $check['current'] ?>
                                        </div>
                                    </div>
                                    <div class="req-status <?= $check['pass'] ? 'pass' : ($check['critical'] ? 'fail' : 'warn') ?>">
                                        <?= $check['pass'] ? 'PASS' : ($check['critical'] ? 'FAIL' : 'WARN') ?>
                                    </div>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                        
                        <div class="btn-group">
                            <?php
                            $allCriticalPass = true;
                            foreach (checkRequirements() as $check) {
                                if ($check['critical'] && !$check['pass']) {
                                    $allCriticalPass = false;
                                    break;
                                }
                            }
                            ?>
                            <?php if ($allCriticalPass): ?>
                                <a href="install.php?step=2" class="btn btn-primary">Lanjutkan →</a>
                            <?php else: ?>
                                <button class="btn btn-secondary" disabled>Perbaiki requirement terlebih dahulu</button>
                            <?php endif; ?>
                        </div>
                    
                    <?php elseif ($step === 2): ?>
                        <!-- STEP 2: DATABASE -->
                        <h2 style="margin-bottom: 20px; font-size: 20px;">🗄️ Konfigurasi Database</h2>
                        
                        <form method="POST" action="install.php?step=2">
                            <input type="hidden" name="action" value="test_db">
                            
                            <div class="form-group">
                                <label>Database Host</label>
                                <input type="text" name="db_host" value="<?= htmlspecialchars($_POST['db_host'] ?? 'localhost') ?>" required>
                                <div class="hint">Biasanya: localhost atau 127.0.0.1</div>
                            </div>
                            
                            <div class="form-group">
                                <label>Database Name</label>
                                <input type="text" name="db_name" value="<?= htmlspecialchars($_POST['db_name'] ?? 'photobooth_gallery') ?>" required>
                                <div class="hint">Nama database (akan dibuat jika belum ada)</div>
                            </div>
                            
                            <div class="form-group">
                                <label>Database Username</label>
                                <input type="text" name="db_user" value="<?= htmlspecialchars($_POST['db_user'] ?? '') ?>" required>
                                <div class="hint">Username MySQL dari cPanel</div>
                            </div>
                            
                            <div class="form-group">
                                <label>Database Password</label>
                                <input type="password" name="db_pass" value="" required>
                                <div class="hint">Password MySQL dari cPanel</div>
                            </div>
                            
                            <div class="btn-group">
                                <a href="install.php?step=1" class="btn btn-secondary">← Kembali</a>
                                <button type="submit" class="btn btn-primary">Test & Lanjutkan →</button>
                            </div>
                        </form>
                    
                    <?php elseif ($step === 3): ?>
                        <!-- STEP 3: IMPORT SCHEMA -->
                        <h2 style="margin-bottom: 20px; font-size: 20px;">📊 Import Database Schema</h2>
                        
                        <p style="color: #666; margin-bottom: 20px; line-height: 1.6;">
                            Sistem akan membuat tabel-tabel yang diperlukan di database Anda:
                        </p>
                        
                        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                            <p style="font-weight: 600; margin-bottom: 8px;">Tabel yang akan dibuat:</p>
                            <ul style="padding-left: 20px; color: #666; line-height: 1.8;">
                                <li><code>events</code> - Data event/galeri</li>
                                <li><code>photos</code> - Data foto yang diupload</li>
                                <li><code>admin_users</code> - User admin</li>
                            </ul>
                        </div>
                        
                        <form method="POST" action="install.php?step=3">
                            <input type="hidden" name="action" value="import_schema">
                            
                            <div class="btn-group">
                                <a href="install.php?step=2" class="btn btn-secondary">← Kembali</a>
                                <button type="submit" class="btn btn-primary">Import Schema →</button>
                            </div>
                        </form>
                    
                    <?php elseif ($step === 4): ?>
                        <!-- STEP 4: CREATE ADMIN -->
                        <h2 style="margin-bottom: 20px; font-size: 20px;">👤 Setup Admin & Konfigurasi</h2>
                        
                        <form method="POST" action="install.php?step=4">
                            <input type="hidden" name="action" value="create_admin">
                            
                            <div class="form-group">
                                <label>Admin Username</label>
                                <input type="text" name="admin_user" value="<?= htmlspecialchars($_POST['admin_user'] ?? 'admin') ?>" required>
                                <div class="hint">Username untuk login ke admin panel</div>
                            </div>
                            
                            <div class="form-group">
                                <label>Admin Password</label>
                                <input type="password" name="admin_pass" required minlength="8">
                                <div class="hint">Minimal 8 karakter</div>
                            </div>
                            
                            <div class="form-group">
                                <label>Konfirmasi Password</label>
                                <input type="password" name="admin_pass_confirm" required minlength="8">
                            </div>
                            
                            <div class="form-group">
                                <label>Base URL Gallery</label>
                                <input type="url" name="base_url" value="<?= htmlspecialchars($_POST['base_url'] ?? 'https://' . ($_SERVER['HTTP_HOST'] ?? 'yourdomain.com') . '/gallery/') ?>" required>
                                <div class="hint">URL untuk QR code (contoh: https://yourdomain.com/gallery/)</div>
                            </div>
                            
                            <div class="btn-group">
                                <a href="install.php?step=3" class="btn btn-secondary">← Kembali</a>
                                <button type="submit" class="btn btn-success">🚀 Install Sekarang</button>
                            </div>
                        </form>
                    <?php endif; ?>
                <?php endif; ?>
            </div>
        </div>
        
        <p style="text-align: center; color: rgba(255,255,255,0.8); margin-top: 20px; font-size: 13px;">
            Photobooth Gallery Installer v1.0 | PHP <?= PHP_VERSION ?>
        </p>
    </div>
</body>
</html>
