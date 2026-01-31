<?php
/**
 * Migration Script: Refetch metadata for all movies/shows
 * Run this script once via CLI or browser to update all entries with type and totalSeasons
 * 
 * Usage: php migrate_metadata.php
 * Or visit: https://yoursite.com/api/migrate_metadata.php
 */

header('Content-Type: text/plain');

// OMDb API key (same as in imdb_details.php)
$omdbApiKey = '6eb0454d';

// Path to movies.json
$dataFile = __DIR__ . '/../data/movies.json';

// Check if file exists
if (!file_exists($dataFile)) {
    die("ERROR: movies.json not found at: $dataFile\n");
}

// Load current data
$movies = json_decode(file_get_contents($dataFile), true);
if (!is_array($movies)) {
    die("ERROR: Failed to parse movies.json\n");
}

echo "Found " . count($movies) . " items to process...\n\n";

$updated = 0;
$errors = 0;

foreach ($movies as &$movie) {
    $title = $movie['title'] ?? '';
    $year = $movie['year'] ?? '';

    echo "Processing: $title ($year)... ";

    // Skip if already has type
    if (!empty($movie['type'])) {
        echo "SKIPPED (already has type: {$movie['type']})\n";
        continue;
    }

    // Build search query for OMDb
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
        echo "NOT FOUND\n";
        $errors++;
        continue;
    }

    // Update type
    $type = $data['Type'] ?? 'movie';
    $movie['type'] = $type;

    // Update totalSeasons for series
    if ($type === 'series' && !empty($data['totalSeasons'])) {
        $movie['totalSeasons'] = $data['totalSeasons'];
        echo "UPDATED (series, {$data['totalSeasons']} seasons)\n";
    } else {
        echo "UPDATED ($type)\n";
    }

    // Also update rating if missing
    if (empty($movie['rating']) && !empty($data['imdbRating']) && $data['imdbRating'] !== 'N/A') {
        $movie['rating'] = $data['imdbRating'];
    }

    $updated++;

    // Small delay to avoid hitting rate limits
    usleep(200000); // 200ms
}

// Save updated data
$json = json_encode($movies, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
if (file_put_contents($dataFile, $json)) {
    echo "\n=================================\n";
    echo "DONE!\n";
    echo "Updated: $updated items\n";
    echo "Errors: $errors items\n";
    echo "Data saved to: $dataFile\n";
} else {
    echo "\nERROR: Failed to save updated data!\n";
}
?>