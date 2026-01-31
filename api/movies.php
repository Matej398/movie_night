<?php
// Set session lifetime to 14 days
ini_set('session.gc_maxlifetime', 1209600);
ini_set('session.gc_probability', 1); // Run GC on 1% of requests
ini_set('session.gc_divisor', 100);

// Set custom session save path to prevent system cleanup
$sessionPath = __DIR__ . '/../sessions';
if (!is_dir($sessionPath)) {
    mkdir($sessionPath, 0700, true);
}
ini_set('session.save_path', $sessionPath);

session_set_cookie_params([
    'lifetime' => 1209600,
    'path' => '/',
    'domain' => '.codelabhaven.com', // Leading dot allows subdomain sharing
    'secure' => isset($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();
header('Content-Type: application/json');
require_once 'db.php';

// Check authentication
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Update session last access time to prevent garbage collection
$_SESSION['last_access'] = time();

// Refresh session cookie on each authenticated request to keep it alive
$params = session_get_cookie_params();
setcookie(session_name(), session_id(), time() + 1209600, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// GET: Fetch all movies for the user
if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare("SELECT * FROM movies WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user_id]);
        $movies = $stmt->fetchAll();

        // Decode platforms JSON and normalize field names
        foreach ($movies as &$movie) {
            $movie['platforms'] = json_decode($movie['platforms'], true) ?: [];
            // Map total_seasons to totalSeasons for JS consistency
            if (isset($movie['total_seasons'])) {
                $movie['totalSeasons'] = $movie['total_seasons'];
            }
        }

        echo json_encode($movies);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch movies']);
    }
}

// POST: Add a new movie
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data || !isset($data['title'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid input']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO movies (user_id, title, year, genre, image_url, trailer_url, description, rating, platforms, status, type, total_seasons)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $platformsJson = json_encode($data['platforms'] ?? []);
        $status = $data['status'] ?? 'to_watch';
        $type = $data['type'] ?? 'movie';
        $totalSeasons = isset($data['totalSeasons']) ? intval($data['totalSeasons']) : null;

        $stmt->execute([
            $user_id,
            trim($data['title']),
            $data['year'] ?? '',
            $data['genre'] ?? '',
            $data['image_url'] ?? '',
            $data['trailer_url'] ?? '',
            $data['description'] ?? '',
            $data['rating'] ?? '',
            $platformsJson,
            $status,
            $type,
            $totalSeasons
        ]);

        $id = $pdo->lastInsertId();

        // Fetch the created movie to return it
        $stmt = $pdo->prepare("SELECT * FROM movies WHERE id = ?");
        $stmt->execute([$id]);
        $movie = $stmt->fetch();
        $movie['platforms'] = json_decode($movie['platforms'], true) ?: [];
        if (isset($movie['total_seasons'])) {
            $movie['totalSeasons'] = $movie['total_seasons'];
        }

        echo json_encode($movie);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save movie']);
    }
}

// PUT: Update a movie (status or platforms)
elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data || !isset($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        exit;
    }

    try {
        // Verify ownership
        $stmt = $pdo->prepare("SELECT id FROM movies WHERE id = ? AND user_id = ?");
        $stmt->execute([$data['id'], $user_id]);
        if (!$stmt->fetch()) {
            http_response_code(403);
            echo json_encode(['error' => 'Permission denied']);
            exit;
        }

        // Build dynamic update query
        $fields = [];
        $params = [];

        if (isset($data['status'])) {
            $fields[] = "status = ?";
            $params[] = $data['status'];
        }

        if (isset($data['platforms'])) {
            $fields[] = "platforms = ?";
            $params[] = json_encode($data['platforms']);
        }

        // Add other fields if needed in future

        if (empty($fields)) {
            echo json_encode(['success' => true]); // Nothing to update
            exit;
        }

        $params[] = $data['id']; // For WHERE clause

        $sql = "UPDATE movies SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Update failed']);
    }
}

// DELETE: Delete a movie
elseif ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data || !isset($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM movies WHERE id = ? AND user_id = ?");
        $stmt->execute([$data['id'], $user_id]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Movie not found or permission denied']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Delete failed']);
    }
}
?>