<?php
// Set session lifetime to 14 days before starting session
ini_set('session.gc_maxlifetime', 1209600); // 14 days in seconds
ini_set('session.gc_probability', 1); // Run GC on 1% of requests
ini_set('session.gc_divisor', 100);

// Set custom session save path to prevent system cleanup
$sessionPath = __DIR__ . '/../sessions';
if (!is_dir($sessionPath)) {
    mkdir($sessionPath, 0700, true);
}
ini_set('session.save_path', $sessionPath);

session_set_cookie_params([
    'lifetime' => 1209600, // 14 days
    'path' => '/',
    'domain' => '',
    'secure' => isset($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();
header('Content-Type: application/json');
require_once 'db.php';

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'register') {
        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';
        
        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => 'Username and password required']);
            exit;
        }
        
        // Check if user exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Username already exists']);
            exit;
        }
        
        // Hash password and insert
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
        if ($stmt->execute([$username, $hash])) {
            // Auto login
            $_SESSION['user_id'] = $pdo->lastInsertId();
            $_SESSION['username'] = $username;
            
            // Set 14-day cookie
            $params = session_get_cookie_params();
            setcookie(session_name(), session_id(), time() + 1209600, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
            
            echo json_encode(['success' => true, 'username' => $username]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Registration failed']);
        }
    }
    elseif ($action === 'login') {
        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';
        
        $stmt = $pdo->prepare("SELECT id, username, password FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            
            // Extend session cookie to 14 days
            $params = session_get_cookie_params();
            setcookie(session_name(), session_id(), time() + 1209600, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
            
            echo json_encode(['success' => true, 'username' => $user['username']]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
        }
    }
    elseif ($action === 'logout') {
        session_destroy();
        echo json_encode(['success' => true]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'check') {
        if (isset($_SESSION['user_id'])) {
            // Update session last access time to prevent garbage collection
            // This updates the session file's modification time
            $_SESSION['last_access'] = time();
            
            // Refresh session cookie on each check to keep it alive
            $params = session_get_cookie_params();
            setcookie(session_name(), session_id(), time() + 1209600, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
            
            echo json_encode(['logged_in' => true, 'username' => $_SESSION['username']]);
        } else {
            echo json_encode(['logged_in' => false]);
        }
    }
}
?>
