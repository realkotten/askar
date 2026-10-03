<?php
/**
 * 🪙 Premium Hallmark Verification PHP API Backend Router
 * Bypasses foreign internet filters & Node.js hosting limitations.
 * Compatible with cPanel, Plesk, DirectAdmin, Apache, and LiteSpeed out of the box.
 * 
 * Supports two modes:
 * 1. Offline JSON local store (data.json inside api folder with .htaccess security shields)
 * 2. cPanel local MySQL Server (fill in DB configuration below to active MySQL mode)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Process preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// ==========================================
// 🛠️ DATABASE CONFIGURATION (cPanel MySQL)
// ==========================================
// Please fill in these constants if you'd like to use your local cPanel MySQL database.
// If left empty, it will automatically fallback to the local secure file data.json!
define('DB_HOST', '');      // Database host (e.g., 'localhost' or '127.0.0.1')
define('DB_USER', '');      // cPanel Database User name
define('DB_PASS', '');      // cPanel Database Password
define('DB_NAME', '');      // cPanel Database Name
define('DB_PORT', '3306');  // Standard MySQL port

// Initialize MySQL pool if configured
$pdo = null;
$mysqlError = null;

if (defined('DB_HOST') && DB_HOST !== '') {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";port=" . DB_PORT . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        
        // Ensure standard certificates table exists locally
        $createTableSql = "
            CREATE TABLE IF NOT EXISTS certificates (
              id VARCHAR(50) PRIMARY KEY,
              certificateNo VARCHAR(100) NOT NULL,
              ownerName VARCHAR(255),
              assayDate VARCHAR(50),
              metalType VARCHAR(20) DEFAULT 'gold',
              declaredPurity VARCHAR(100),
              testedPurity DOUBLE,
              weight DOUBLE,
              inspector VARCHAR(255),
              status VARCHAR(20) DEFAULT 'approved',
              itemType VARCHAR(255),
              labBranch VARCHAR(255),
              qrValue VARCHAR(255),
              remarks TEXT,
              sendSms TINYINT(1) DEFAULT 1,
              showGoldWeight_reg TINYINT(1) DEFAULT 1,
              showCustomerName TINYINT(1) DEFAULT 1,
              showWeight TINYINT(1) DEFAULT 1,
              sampleRegistered VARCHAR(255),
              showSampleWeight TINYINT(1) DEFAULT 1,
              showActive TINYINT(1) DEFAULT 1,
              showGoldWeight TINYINT(1) DEFAULT 1,
              showPrepTime TINYINT(1) DEFAULT 1,
              prepTime VARCHAR(100),
              showTitle TINYINT(1) DEFAULT 1,
              titleSelect VARCHAR(255),
              wageType VARCHAR(20),
              wageAmount VARCHAR(100),
              documentType VARCHAR(20),
              packetNumber VARCHAR(100),
              createdAt VARCHAR(100)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        $pdo->exec($createTableSql);

        // Ensure standard gallery table exists locally
        $createGallerySql = "
            CREATE TABLE IF NOT EXISTS gallery (
              id VARCHAR(50) PRIMARY KEY,
              title VARCHAR(255) NOT NULL,
              subtitle VARCHAR(255),
              imageUrl LONGTEXT NOT NULL,
              description TEXT,
              category VARCHAR(50),
              sort_order INT DEFAULT 999999,
              createdAt VARCHAR(100)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        $pdo->exec($createGallerySql);
    } catch (PDOException $e) {
        $mysqlError = $e->getMessage();
        $pdo = null; // Fallback to file storage on initialization error
    }
}

// Normalizer to guarantee proper type-safety for React frontend
function mapRowToCertificate($row) {
    if (!$row) return null;
    $row['testedPurity'] = isset($row['testedPurity']) ? floatval($row['testedPurity']) : 0;
    $row['weight'] = isset($row['weight']) ? floatval($row['weight']) : 0;
    
    // Normalize SQL TinyInt columns back to real JavaScript Booleans
    $boolFields = [
        'sendSms', 'showGoldWeight_reg', 'showCustomerName', 'showWeight', 
        'showSampleWeight', 'showActive', 'showGoldWeight', 'showPrepTime', 'showTitle'
    ];
    foreach ($boolFields as $field) {
        if (isset($row[$field])) {
            $row[$field] = ($row[$field] == 1 || $row[$field] === true || $row[$field] === "1");
        }
    }
    return $row;
}


// ==========================================
// 🛣️ HTTP API REQUEST ROUTER
// ==========================================
$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Parse URL pathway
$path = parse_url($requestUri, PHP_URL_PATH);

// Remove /api prefix dynamically to safely support nested subdirectories in cPanel public_html!
$apiPos = strpos($path, '/api');
if ($apiPos !== false) {
    $path = substr($path, $apiPos + 4); 
}

$path = trim($path, '/');
$parts = explode('/', $path);

$resource = isset($parts[0]) ? $parts[0] : '';
$id = isset($parts[1]) ? $parts[1] : '';


// 1️⃣ Database Config & Connection Health Status Endpoint
if ($method === 'GET' && $resource === 'db-status') {
    echo json_encode([
        'configured' => (DB_HOST !== ''),
        'connected' => ($pdo !== null),
        'error' => $mysqlError,
        'details' => (DB_HOST !== '') ? [
            'host' => DB_HOST,
            'database' => DB_NAME,
            'user' => DB_USER,
            'port' => DB_PORT
        ] : null,
        'firebase' => [
            'initialized' => false,
            'projectId' => null,
            'databaseId' => null
        ],
        'php_mode' => ($pdo !== null) ? "mysql" : "json",
        'storage_info' => ($pdo !== null) ? "Connected to cPanel local MySQL" : "Local PHP storage.json safe active",
        'status_msg' => "Iran Local cPanel server operating at full capacity (PHP native)"
    ]);
    exit;
}


// 2️⃣ GET /api/certificates - Load all certificates
if ($method === 'GET' && $resource === 'certificates' && $id === '') {
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT * FROM certificates ORDER BY id DESC");
            $rows = $stmt->fetchAll();
            $mapped = array_map('mapRowToCertificate', $rows);
            echo json_encode($mapped);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'cPanel MySQL GET Error: ' . $e->getMessage()]);
            exit;
        }
    } else {
        // Simple data.json fallback
        $dbFile = __DIR__ . '/data.json';
        if (!file_exists($dbFile)) {
            file_put_contents($dbFile, json_encode(new stdClass()));
        }
        $raw = file_get_contents($dbFile);
        $certs = json_decode($raw, true);
        if (!is_array($certs)) {
            $certs = [];
        }
        krsort($certs); // Sort by ATC key string in descending order
        echo json_encode(array_values($certs));
        exit;
    }
}


// 3️⃣ GET /api/certificates/{id} - Query specific certificate
if ($method === 'GET' && $resource === 'certificates' && $id !== '') {
    $key = strtoupper(urldecode($id));
    
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM certificates WHERE UPPER(id) = ?");
            $stmt->execute([$key]);
            $row = $stmt->fetch();
            if ($row) {
                echo json_encode(mapRowToCertificate($row));
            } else {
                echo json_encode(null);
            }
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'cPanel MySQL Single-GET Error: ' . $e->getMessage()]);
            exit;
        }
    } else {
        $dbFile = __DIR__ . '/data.json';
        if (!file_exists($dbFile)) {
            file_put_contents($dbFile, json_encode(new stdClass()));
        }
        $raw = file_get_contents($dbFile);
        $certs = json_decode($raw, true);
        if (!is_array($certs)) {
            $certs = [];
        }
        if (isset($certs[$key])) {
            echo json_encode($certs[$key]);
        } else {
            echo json_encode(null);
        }
        exit;
    }
}


// 4️⃣ POST /api/certificates - Insert or update certificate
if ($method === 'POST' && $resource === 'certificates') {
    $input = file_get_contents('php://input');
    $cert = json_decode($input, true);
    
    if (!$cert || !isset($cert['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Certificate ID is required']);
        exit;
    }
    
    $key = strtoupper($cert['id']);
    
    if ($pdo) {
        try {
            $sql = "
                INSERT INTO certificates (
                    id, certificateNo, ownerName, assayDate, metalType,
                    declaredPurity, testedPurity, weight, inspector, status,
                    itemType, labBranch, qrValue, remarks, sendSms,
                    showGoldWeight_reg, showCustomerName, showWeight, sampleRegistered, showSampleWeight,
                    showActive, showGoldWeight, showPrepTime, prepTime, showTitle,
                    titleSelect, wageType, wageAmount, documentType, packetNumber, createdAt
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                ) ON DUPLICATE KEY UPDATE
                    certificateNo = VALUES(certificateNo),
                    ownerName = VALUES(ownerName),
                    assayDate = VALUES(assayDate),
                    metalType = VALUES(metalType),
                    declaredPurity = VALUES(declaredPurity),
                    testedPurity = VALUES(testedPurity),
                    weight = VALUES(weight),
                    inspector = VALUES(inspector),
                    status = VALUES(status),
                    itemType = VALUES(itemType),
                    labBranch = VALUES(labBranch),
                    qrValue = VALUES(qrValue),
                    remarks = VALUES(remarks),
                    sendSms = VALUES(sendSms),
                    showGoldWeight_reg = VALUES(showGoldWeight_reg),
                    showCustomerName = VALUES(showCustomerName),
                    showWeight = VALUES(showWeight),
                    sampleRegistered = VALUES(sampleRegistered),
                    showSampleWeight = VALUES(showSampleWeight),
                    showActive = VALUES(showActive),
                    showGoldWeight = VALUES(showGoldWeight),
                    showPrepTime = VALUES(showPrepTime),
                    prepTime = VALUES(prepTime),
                    showTitle = VALUES(showTitle),
                    titleSelect = VALUES(titleSelect),
                    wageType = VALUES(wageType),
                    wageAmount = VALUES(wageAmount),
                    documentType = VALUES(documentType),
                    packetNumber = VALUES(packetNumber),
                    createdAt = VALUES(createdAt)
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $key,
                isset($cert['certificateNo']) ? $cert['certificateNo'] : '',
                isset($cert['ownerName']) ? $cert['ownerName'] : '',
                isset($cert['assayDate']) ? $cert['assayDate'] : '',
                isset($cert['metalType']) ? $cert['metalType'] : 'gold',
                isset($cert['declaredPurity']) ? $cert['declaredPurity'] : '',
                isset($cert['testedPurity']) ? floatval($cert['testedPurity']) : 0,
                isset($cert['weight']) ? floatval($cert['weight']) : 0,
                isset($cert['inspector']) ? $cert['inspector'] : '',
                isset($cert['status']) ? $cert['status'] : 'approved',
                isset($cert['itemType']) ? $cert['itemType'] : '',
                isset($cert['labBranch']) ? $cert['labBranch'] : '',
                isset($cert['qrValue']) ? $cert['qrValue'] : '',
                isset($cert['remarks']) ? $cert['remarks'] : null,
                (isset($cert['sendSms']) && ($cert['sendSms'] === true || $cert['sendSms'] == 1)) ? 1 : 0,
                (isset($cert['showGoldWeight_reg']) && ($cert['showGoldWeight_reg'] === true || $cert['showGoldWeight_reg'] == 1)) ? 1 : 0,
                (isset($cert['showCustomerName']) && ($cert['showCustomerName'] === true || $cert['showCustomerName'] == 1)) ? 1 : 0,
                (isset($cert['showWeight']) && ($cert['showWeight'] === true || $cert['showWeight'] == 1)) ? 1 : 0,
                isset($cert['sampleRegistered']) ? $cert['sampleRegistered'] : '',
                (isset($cert['showSampleWeight']) && ($cert['showSampleWeight'] === true || $cert['showSampleWeight'] == 1)) ? 1 : 0,
                (isset($cert['showActive']) && ($cert['showActive'] === true || $cert['showActive'] == 1)) ? 1 : 0,
                (isset($cert['showGoldWeight']) && ($cert['showGoldWeight'] === true || $cert['showGoldWeight'] == 1)) ? 1 : 0,
                (isset($cert['showPrepTime']) && ($cert['showPrepTime'] === true || $cert['showPrepTime'] == 1)) ? 1 : 0,
                isset($cert['prepTime']) ? $cert['prepTime'] : '',
                (isset($cert['showTitle']) && ($cert['showTitle'] === true || $cert['showTitle'] == 1)) ? 1 : 0,
                isset($cert['titleSelect']) ? $cert['titleSelect'] : '',
                isset($cert['wageType']) ? $cert['wageType'] : null,
                isset($cert['wageAmount']) ? $cert['wageAmount'] : null,
                isset($cert['documentType']) ? $cert['documentType'] : 'hallmark',
                isset($cert['packetNumber']) ? $cert['packetNumber'] : null,
                isset($cert['createdAt']) ? $cert['createdAt'] : date('c')
            ]);
            
            echo json_encode(['success' => true, 'mode' => 'php-mysql']);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'cPanel MySQL Save Error: ' . $e->getMessage()]);
            exit;
        }
    } else {
        $dbFile = __DIR__ . '/data.json';
        if (!file_exists($dbFile)) {
            file_put_contents($dbFile, json_encode(new stdClass()));
        }
        $raw = file_get_contents($dbFile);
        $certs = json_decode($raw, true);
        if (!is_array($certs)) {
            $certs = [];
        }
        
        $certs[$key] = $cert;
        file_put_contents($dbFile, json_encode($certs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(['success' => true, 'mode' => 'php-json']);
        exit;
    }
}


// 5️⃣ DELETE /api/certificates/{id} - Delete certificate from database
if ($method === 'DELETE' && $resource === 'certificates' && $id !== '') {
    $key = strtoupper(urldecode($id));
    
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("DELETE FROM certificates WHERE UPPER(id) = ?");
            $stmt->execute([$key]);
            echo json_encode(['success' => true, 'mode' => 'php-mysql']);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'cPanel MySQL Delete Error: ' . $e->getMessage()]);
            exit;
        }
    } else {
        $dbFile = __DIR__ . '/data.json';
        if (!file_exists($dbFile)) {
            file_put_contents($dbFile, json_encode(new stdClass()));
        }
        $raw = file_get_contents($dbFile);
        $certs = json_decode($raw, true);
        if (!is_array($certs)) {
            $certs = [];
        }
        if (isset($certs[$key])) {
            unset($certs[$key]);
            file_put_contents($dbFile, json_encode($certs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            echo json_encode(['success' => true, 'mode' => 'php-json']);
        } else {
            echo json_encode(['success' => true, 'mode' => 'php-json', 'info' => 'Already deleted or not found']);
        }
        exit;
    }
}


// 6️⃣ GET /api/gallery - Load all gallery items
if ($method === 'GET' && $resource === 'gallery' && $id === '') {
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT * FROM gallery ORDER BY COALESCE(sort_order, 999999) ASC, createdAt DESC");
            $rows = $stmt->fetchAll();
            $mapped = [];
            foreach ($rows as $row) {
                $mapped[] = [
                    'id' => $row['id'],
                    'title' => $row['title'],
                    'subtitle' => $row['subtitle'],
                    'imageUrl' => $row['imageUrl'],
                    'description' => $row['description'],
                    'category' => $row['category'],
                    'order' => isset($row['sort_order']) ? intval($row['sort_order']) : 999999,
                    'createdAt' => $row['createdAt']
                ];
            }
            echo json_encode($mapped);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'cPanel MySQL GET Gallery Error: ' . $e->getMessage()]);
            exit;
        }
    } else {
        // Simple gallery.json fallback
        $galleryFile = __DIR__ . '/gallery.json';
        if (!file_exists($galleryFile)) {
            file_put_contents($galleryFile, json_encode([]));
        }
        $raw = file_get_contents($galleryFile);
        $items = json_decode($raw, true);
        if (!is_array($items)) {
            $items = [];
        }
        
        // Sort items by sort_order / order and then by createdAt desc
        usort($items, function($a, $b) {
            $orderA = isset($a['order']) ? intval($a['order']) : 999999;
            $orderB = isset($b['order']) ? intval($b['order']) : 999999;
            if ($orderA !== $orderB) {
                return $orderA - $orderB;
            }
            return strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? '');
        });
        
        echo json_encode(array_values($items));
        exit;
    }
}


// 7️⃣ POST /api/gallery - Insert or update gallery item
if ($method === 'POST' && $resource === 'gallery') {
    $input = file_get_contents('php://input');
    $item = json_decode($input, true);
    
    if (!$item || !isset($item['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Gallery item ID is required']);
        exit;
    }
    
    $key = $item['id'];
    
    if ($pdo) {
        try {
            $sql = "
                INSERT INTO gallery (
                    id, title, subtitle, imageUrl, description, category, sort_order, createdAt
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?
                ) ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    subtitle = VALUES(subtitle),
                    imageUrl = VALUES(imageUrl),
                    description = VALUES(description),
                    category = VALUES(category),
                    sort_order = VALUES(sort_order),
                    createdAt = VALUES(createdAt)
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $key,
                isset($item['title']) ? $item['title'] : '',
                isset($item['subtitle']) ? $item['subtitle'] : null,
                isset($item['imageUrl']) ? $item['imageUrl'] : '',
                isset($item['description']) ? $item['description'] : null,
                isset($item['category']) ? $item['category'] : 'rings',
                isset($item['order']) ? intval($item['order']) : 999999,
                isset($item['createdAt']) ? $item['createdAt'] : date('c')
            ]);
            
            echo json_encode(['success' => true, 'mode' => 'php-mysql']);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'cPanel MySQL Save Gallery Error: ' . $e->getMessage()]);
            exit;
        }
    } else {
        $galleryFile = __DIR__ . '/gallery.json';
        if (!file_exists($galleryFile)) {
            file_put_contents($galleryFile, json_encode([]));
        }
        $raw = file_get_contents($galleryFile);
        $items = json_decode($raw, true);
        if (!is_array($items)) {
            $items = [];
        }
        
        // Save/Update item inside the array
        $found = false;
        foreach ($items as &$existingItem) {
            if ($existingItem['id'] === $key) {
                $existingItem = $item;
                $found = true;
                break;
            }
        }
        if (!$found) {
            $items[] = $item;
        }
        
        file_put_contents($galleryFile, json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(['success' => true, 'mode' => 'php-json']);
        exit;
    }
}


// 8️⃣ DELETE /api/gallery/{id} - Delete gallery item from database
if ($method === 'DELETE' && $resource === 'gallery' && $id !== '') {
    $key = urldecode($id);
    
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("DELETE FROM gallery WHERE id = ?");
            $stmt->execute([$key]);
            echo json_encode(['success' => true, 'mode' => 'php-mysql']);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'cPanel MySQL Gallery Delete Error: ' . $e->getMessage()]);
            exit;
        }
    } else {
        $galleryFile = __DIR__ . '/gallery.json';
        if (!file_exists($galleryFile)) {
            file_put_contents($galleryFile, json_encode([]));
        }
        $raw = file_get_contents($galleryFile);
        $items = json_decode($raw, true);
        if (!is_array($items)) {
            $items = [];
        }
        
        $newItems = [];
        foreach ($items as $existingItem) {
            if ($existingItem['id'] !== $key) {
                $newItems[] = $existingItem;
            }
        }
        
        file_put_contents($galleryFile, json_encode($newItems, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(['success' => true, 'mode' => 'php-json']);
        exit;
    }
}


// 9️⃣ Wildcard 404 handler
http_response_code(404);
echo json_encode([
    'error' => 'Not Found', 
    'message' => 'Path requested does not exist in API routing structure',
    'debug_path' => $path,
    'full_uri' => $requestUri
]);
exit;
