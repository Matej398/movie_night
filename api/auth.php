<?php
// Set session lifetime to 7 days before starting session
ini_set('session.gc_maxlifetime', 604800);
session_set_cookie_params(604800);

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
            
            // Set 7-day cookie
            $token = bin2hex(random_bytes(32));
            // In a real app, store this token in DB. For simple use, we rely on session cookie lifetime.
            // But here we extend session cookie lifetime:
            $params = session_get_cookie_params();
            setcookie(session_name(), session_id(), time() + (7 * 24 * 60 * 60), $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
            
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
            
            // Extend session cookie to 7 days
            $params = session_get_cookie_params();
            setcookie(session_name(), session_id(), time() + (7 * 24 * 60 * 60), $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
            
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
            echo json_encode(['logged_in' => true, 'username' => $_SESSION['username']]);
        } else {
            echo json_encode(['logged_in' => false]);
        }
    }
}
?>
