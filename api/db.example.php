<?php
// Database configuration
// Copy this file to db.php and fill in your credentials
$host = 'localhost';
$dbname = 'your_db_name';
$username = 'your_username';
$password = 'your_password';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    // In production, don't echo the error directly
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}
?>

