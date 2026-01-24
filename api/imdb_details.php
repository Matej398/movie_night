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

// OMDb API key - free tier allows 1000 requests/day
// Get your own key at https://www.omdbapi.com/apikey.aspx
$omdbApiKey = 'c8e6e899'; // Free public demo key - replace with your own

// Try OMDb API first (more reliable than scraping)
$omdbUrl = "https://www.omdbapi.com/?i={$id}&apikey={$omdbApiKey}&plot=full";

$omdbResponse = @file_get_contents($omdbUrl);
if ($omdbResponse) {
    $omdbData = json_decode($omdbResponse, true);

    if ($omdbData && isset($omdbData['Title']) && $omdbData['Response'] !== 'False') {
        // Successfully got data from OMDb
        $title = $omdbData['Title'] ?? '';
        $year = $omdbData['Year'] ?? '';
        $genre = $omdbData['Genre'] ?? '';
        $description = $omdbData['Plot'] ?? '';
        $rating = $omdbData['imdbRating'] ?? '';
        $image = $omdbData['Poster'] ?? '';

        // Fix image URL - use higher quality if available
        if ($image && $image !== 'N/A') {
            // OMDb returns small posters, try to get larger version
            $image = str_replace('SX300', 'SX600', $image);
        } else {
            $image = '';
        }

        // Generate trailer search URL
        $trailer = "https://www.youtube.com/results?search_query=" . urlencode($title . " " . $year . " trailer");

        echo json_encode([
            'title' => $title,
            'image_url' => $image,
            'description' => $description,
            'genre' => $genre,
            'year' => $year,
            'rating' => $rating,
            'trailer_url' => $trailer
        ]);
        exit;
    }
}

// Fallback: Try scraping IMDB directly (less reliable)
$url = "https://www.imdb.com/title/{$id}/";
$userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
$acceptLanguage = 'Accept-Language: en-US,en;q=0.9';

// Try curl
$cmd = 'curl --compressed -m 10 -L -A "' . $userAgent . '" -H "' . $acceptLanguage . '" "' . $url . '" 2>/dev/null';
$html = shell_exec($cmd);

if (!$html || strlen($html) < 500) {
    // Fallback: try without compressed flag
    $cmd = 'curl -L -m 10 -A "' . $userAgent . '" -H "' . $acceptLanguage . '" "' . $url . '" 2>/dev/null';
    $html = shell_exec($cmd);
}

if (!$html || strlen($html) < 500) {
    $options = [
        "http" => [
            "header" => "User-Agent: $userAgent\r\n" .
                "Accept-Language: en-US,en;q=0.9\r\n" .
                "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n",
            "timeout" => 5
        ]
    ];
    $context = stream_context_create($options);
    $html = @file_get_contents($url, false, $context);
}

if (!$html || strlen($html) < 500) {
    echo json_encode(['error' => "Failed to fetch movie details. OMDb API and IMDB scraping both failed."]);
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
} else {
    if (preg_match('/⭐\s*([0-9.]+)/', $html, $rateMatches)) {
        $rating = $rateMatches[1];
    }
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
$title = $jsonLd['name'] ?? '';
$image = $jsonLd['image'] ?? '';
if ($image) {
    // Force US CDN and English locale by replacing domain
    $image = preg_replace('/https?:\/\/[^\/]+\.media-amazon\.com/', 'https://m.media-amazon.com', $image);
    // Extract base path and rebuild with English locale parameters
    if (preg_match('/^(.+\/images\/M\/[^_]+)/i', parse_url($image, PHP_URL_PATH), $matches)) {
        $basePath = $matches[1];
        $image = 'https://m.media-amazon.com' . $basePath . '/_V1_QL75_UX600_CR0,0,600,900_AL_.jpg';
    } else {
        $image = preg_replace('/_V1_.*?\.jpg$/i', '_V1_QL75_AL_.jpg', $image);
    }
}
$description = $jsonLd['description'] ?? '';
$genre = '';
if (isset($jsonLd['genre'])) {
    $genre = is_array($jsonLd['genre']) ? implode(', ', $jsonLd['genre']) : $jsonLd['genre'];
}

$year = '';
if (isset($jsonLd['datePublished'])) {
    $year = substr($jsonLd['datePublished'], 0, 4);
}

// Trailer
$trailer = '';
if (isset($jsonLd['trailer']['url'])) {
    $tUrl = $jsonLd['trailer']['url'];
    if (strpos($tUrl, 'http') === 0) {
        $trailer = $tUrl;
    } else {
        $trailer = "https://www.imdb.com" . $tUrl;
    }
} elseif (isset($jsonLd['url'])) {
    $base = $jsonLd['url'];
    if (strpos($base, 'http') !== 0)
        $base = "https://www.imdb.com" . $base;
    $trailer = $base . "videogallery";
} else {
    $trailer = "https://www.youtube.com/results?search_query=" . urlencode($title . " trailer");
}

echo json_encode([
    'title' => $title,
    'image_url' => $image,
    'description' => html_entity_decode($description),
    'genre' => $genre,
    'year' => $year,
    'rating' => $rating,
    'trailer_url' => $trailer
]);
?>