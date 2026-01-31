<?php
/**
 * Database Migration Script: Add type and totalSeasons columns, then refetch metadata
 * 
 * Run this script once via browser or CLI to:
 * 1. Add 'type' and 'total_seasons' columns to movies table (if missing)
 * 2. Refetch metadata from OMDb API for all movies to update type/seasons
 * 
 * Usage: php migrate_db.php
 * Or visit: https://yoursite.com/api/migrate_db.php
 */

header('Content-Type: text/plain');

require_once 'db.php';

// OMDb API key
$omdbApiKey = '6eb0454d';

echo "=== Movie Night Database Migration ===\n\n";

// Step 1: Add columns if they don't exist
echo "Step 1: Checking database schema...\n";

try {
    // Check if 'type' column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM movies LIKE 'type'");
    if ($stmt->rowCount() == 0) {
        echo "  Adding 'type' column... ";
        $pdo->exec("ALTER TABLE movies ADD COLUMN `type` VARCHAR(20) DEFAULT 'movie' AFTER `platforms`");
        echo "DONE\n";
    } else {
        echo "  'type' column already exists\n";
    }

    // Check if 'total_seasons' column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM movies LIKE 'total_seasons'");
    if ($stmt->rowCount() == 0) {
        echo "  Adding 'total_seasons' column... ";
        $pdo->exec("ALTER TABLE movies ADD COLUMN `total_seasons` INT DEFAULT NULL AFTER `type`");
        echo "DONE\n";
    } else {
        echo "  'total_seasons' column already exists\n";
    }

    // Check if 'user_rating' column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM movies LIKE 'user_rating'");
    if ($stmt->rowCount() == 0) {
        echo "  Adding 'user_rating' column... ";
        $pdo->exec("ALTER TABLE movies ADD COLUMN `user_rating` ENUM('loved', 'liked', 'disliked') DEFAULT NULL AFTER `total_seasons`");
        echo "DONE\n";
    } else {
        echo "  'user_rating' column already exists\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit;
}

// Step 2: Refetch metadata for all movies
echo "\nStep 2: Refetching metadata from OMDb API...\n\n";

try {
    $stmt = $pdo->query("SELECT id, title, year, type FROM movies");
    $movies = $stmt->fetchAll();

    echo "Found " . count($movies) . " items to process...\n\n";

    $updated = 0;
    $errors = 0;

    foreach ($movies as $movie) {
        $id = $movie['id'];
        $title = $movie['title'];
        $year = $movie['year'];

        echo "Processing: $title ($year)... ";

        // Skip if already has type set (and it's not 'movie' which is default)
        if (!empty($movie['type']) && $movie['type'] !== 'movie') {
            echo "SKIPPED (already set as: {$movie['type']})\n";
            continue;
        }

        // Build OMDb search URL
        $searchUrl = "https://www.omdbapi.com/?t=" . urlencode($title) .
            ($year ? "&y=$year" : "") .
            "&apikey=$omdbApiKey";

        // Fetch from OMDb
        $response = @file_get_contents($searchUrl);
        if (!$response) {
            echo "ERROR (failed to fetch)\n";
            $errors++;
            continue;
        }

        $data = json_decode($response, true);
        if (!$data || isset($data['Error'])) {
            echo "NOT FOUND in OMDb\n";
            $errors++;
            continue;
        }

        // Get type and seasons
        $type = $data['Type'] ?? 'movie';
        $totalSeasons = null;

        if ($type === 'series' && !empty($data['totalSeasons'])) {
            $totalSeasons = intval($data['totalSeasons']);
        }

        // Update database
        $updateStmt = $pdo->prepare("UPDATE movies SET type = ?, total_seasons = ? WHERE id = ?");
        $updateStmt->execute([$type, $totalSeasons, $id]);

        if ($type === 'series') {
            echo "UPDATED (series, " . ($totalSeasons ?? '?') . " seasons)\n";
        } else {
            echo "UPDATED ($type)\n";
        }

        $updated++;

        // Small delay to avoid rate limits
        usleep(250000); // 250ms
    }

    echo "\n=================================\n";
    echo "MIGRATION COMPLETE!\n";
    echo "Updated: $updated items\n";
    echo "Errors/Not Found: $errors items\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
?>