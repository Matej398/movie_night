<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Turn off error reporting to avoid breaking JSON
error_reporting(0);
ini_set('display_errors', 0);

$id = $_GET['id'] ?? '';
if (!$id) {
    echo json_encode(['error' => 'No ID provided']);
    exit;
}

// Helper function to fetch URL using curl (more reliable than file_get_contents)
function fetchUrl($url)
{
    // Try curl command first (most reliable on Linux servers)
    $escapedUrl = escapeshellarg($url);
    $cmd = "curl -s -L -m 15 --compressed {$escapedUrl} 2>/dev/null";
    $response = shell_exec($cmd);

    if ($response && strlen($response) > 10) {
        return $response;
    }

    // Fallback to file_get_contents
    $context = stream_context_create([
        "http" => [
            "header" => "User-Agent: Mozilla/5.0\r\n",
            "timeout" => 10
        ],
        "ssl" => [
            "verify_peer" => false,
            "verify_peer_name" => false
        ]
    ]);

    return @file_get_contents($url, false, $context);
}

// OMDb API key - free tier allows 1000 requests/day
// Get your own key at https://www.omdbapi.com/apikey.aspx
$omdbApiKey = '6eb0454d';

// Try OMDb API first (more reliable than scraping)
$omdbUrl = "https://www.omdbapi.com/?i={$id}&apikey={$omdbApiKey}&plot=full";

$omdbResponse = fetchUrl($omdbUrl);

if ($omdbResponse) {
    $omdbData = json_decode($omdbResponse, true);

    if ($omdbData && isset($omdbData['Title']) && (!isset($omdbData['Response']) || $omdbData['Response'] !== 'False')) {
        // Successfully got data from OMDb
        $title = html_entity_decode($omdbData['Title'] ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $year = $omdbData['Year'] ?? '';
        $genre = $omdbData['Genre'] ?? '';
        $description = html_entity_decode($omdbData['Plot'] ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $rating = $omdbData['imdbRating'] ?? '';
        $image = $omdbData['Poster'] ?? '';
        $type = $omdbData['Type'] ?? 'movie'; // movie, series, episode
        $totalSeasons = $omdbData['totalSeasons'] ?? null;

        // Fix image URL - use higher quality if available
        if ($image && $image !== 'N/A') {
            $image = str_replace('SX300', 'SX600', $image);
        } else {
            $image = '';
        }

        // Generate trailer search URL
        $trailer = "https://www.youtube.com/results?search_query=" . urlencode($title . " " . $year . " trailer");

        $response = [
            'title' => $title,
            'image_url' => $image,
            'description' => $description,
            'genre' => $genre,
            'year' => $year,
            'rating' => $rating,
            'trailer_url' => $trailer,
            'type' => $type,
            'source' => 'omdb'
        ];

        // Add totalSeasons only for series
        if ($type === 'series' && $totalSeasons) {
            $response['totalSeasons'] = $totalSeasons;
        }

        echo json_encode($response);
        exit;
    }
}

// Fallback: Try scraping IMDB directly (less reliable)
$url = "https://www.imdb.com/title/{$id}/";
$userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15';
$acceptLanguage = 'Accept-Language: en-US,en;q=0.9';

$escapedUrl = escapeshellarg($url);
$cmd = "curl -s --compressed -m 10 -L -A \"{$userAgent}\" -H \"{$acceptLanguage}\" {$escapedUrl} 2>/dev/null";
$html = shell_exec($cmd);

if (!$html || strlen($html) < 500) {
    echo json_encode([
        'error' => 'Failed to fetch movie details',
        'debug_omdb_response' => substr($omdbResponse ?? 'null', 0, 200)
    ]);
    exit;
}

// Parse JSON-LD from IMDB page
$jsonLd = null;
if (preg_match('/<script type="application\/ld\+json">(.*?)<\/script>/is', $html, $matches)) {
    $jsonLd = json_decode($matches[1], true);
}

// Extract Rating
$rating = '';
if ($jsonLd && isset($jsonLd['aggregateRating']['ratingValue'])) {
    $rating = $jsonLd['aggregateRating']['ratingValue'];
}

if (!$jsonLd) {
    // Rough Fallback
    preg_match('/<title>(.*?)<\/title>/i', $html, $titleMatches);
    $rawTitle = $titleMatches[1] ?? 'Unknown Title';
    $rawTitle = str_replace(' - IMDb', '', $rawTitle);

    preg_match('/property="og:image" content="(.*?)"/i', $html, $imgMatches);
    $image = $imgMatches[1] ?? '';

    if ($rawTitle !== 'Unknown Title') {
        echo json_encode([
            'title' => $rawTitle,
            'image_url' => $image,
            'description' => '',
            'genre' => '',
            'year' => '',
            'rating' => $rating,
            'trailer_url' => "https://www.youtube.com/results?search_query=" . urlencode($rawTitle . " trailer"),
            'partial_scrape' => true
        ]);
        exit;
    }
    echo json_encode(['error' => 'Could not parse movie details from HTML.']);
    exit;
}

// Extract fields from JSON-LD
$title = html_entity_decode($jsonLd['name'] ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
$image = $jsonLd['image'] ?? '';
if ($image) {
    $image = preg_replace('/https?:\/\/[^\/]+\.media-amazon\.com/', 'https://m.media-amazon.com', $image);
    if (preg_match('/^(.+\/images\/M\/[^_]+)/i', parse_url($image, PHP_URL_PATH), $matches)) {
        $basePath = $matches[1];
        $image = 'https://m.media-amazon.com' . $basePath . '/_V1_QL75_UX600_CR0,0,600,900_AL_.jpg';
    }
}
$description = html_entity_decode($jsonLd['description'] ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
$genre = '';
if (isset($jsonLd['genre'])) {
    $genre = is_array($jsonLd['genre']) ? implode(', ', $jsonLd['genre']) : $jsonLd['genre'];
}

// Detect type from JSON-LD
$type = 'movie';
if (isset($jsonLd['@type'])) {
    $ldType = $jsonLd['@type'];
    if ($ldType === 'TVSeries' || $ldType === 'TVShow') {
        $type = 'series';
    } elseif ($ldType === 'TVEpisode') {
        $type = 'episode';
    }
}

$year = '';
if (isset($jsonLd['datePublished'])) {
    $year = substr($jsonLd['datePublished'], 0, 4);
}

$trailer = "https://www.youtube.com/results?search_query=" . urlencode($title . " trailer");

echo json_encode([
    'title' => $title,
    'image_url' => $image,
    'description' => $description,
    'genre' => $genre,
    'year' => $year,
    'rating' => $rating,
    'trailer_url' => $trailer,
    'type' => $type,
    'source' => 'imdb_scrape'
]);
?>