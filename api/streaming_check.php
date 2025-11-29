<?php
// Suppress HTML error output
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// CONFIGURATION
// Get your free key from https://www.themoviedb.org/settings/api
$tmdbApiKey = 'YOUR_TMDB_API_KEY'; 

$title = $_GET['title'] ?? '';
$year = $_GET['year'] ?? '';

if (empty($title)) {
    echo json_encode(['platforms' => [], 'title' => $title]);
    exit;
}

// 1. Search for the movie on TMDB
$searchUrl = "https://api.themoviedb.org/3/search/movie?api_key={$tmdbApiKey}&query=" . urlencode($title);
if ($year) {
    $searchUrl .= "&year=" . urlencode($year);
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $searchUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
$platforms = [];

if (!empty($data['results'])) {
    // Get the first result's ID
    $movieId = $data['results'][0]['id'];
    
    // 2. Get Watch Providers for this movie
    $providersUrl = "https://api.themoviedb.org/3/movie/{$movieId}/watch/providers?api_key={$tmdbApiKey}";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $providersUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $provResponse = curl_exec($ch);
    curl_close($ch);
    
    $provData = json_decode($provResponse, true);
    
    // Check Slovenia (SI) specifically
    if (isset($provData['results']['SI'])) {
        $siData = $provData['results']['SI'];
        
        // Check 'flatrate' (streaming subscription)
        if (isset($siData['flatrate'])) {
            foreach ($siData['flatrate'] as $provider) {
                $name = strtolower($provider['provider_name']);
                
                // Map TMDB names to our internal IDs
                if (strpos($name, 'netflix') !== false) $platforms[] = 'netflix';
                elseif (strpos($name, 'disney') !== false) $platforms[] = 'disneyplus';
                elseif (strpos($name, 'sky') !== false) $platforms[] = 'skyshowtime';
                elseif (strpos($name, 'hbo') !== false || strpos($name, 'max') !== false) $platforms[] = 'hbomax';
                elseif (strpos($name, 'voyo') !== false) $platforms[] = 'voyo';
                elseif (strpos($name, 'amazon') !== false) $platforms[] = 'amazonprime';
            }
        }
    }
}

echo json_encode([
    'platforms' => array_unique($platforms),
    'title' => $title,
    'tmdb_used' => true
]);
?>