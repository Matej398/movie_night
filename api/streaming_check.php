<?php
// Suppress HTML error output
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// CONFIGURATION
$tmdbApiKey = '987a9d0095e7c36a87a5f23331724658'; 

$title = $_GET['title'] ?? '';
$year = $_GET['year'] ?? '';
$debug = isset($_GET['debug']);

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
$debugData = [];

if (!empty($data['results'])) {
    // Get the first result's ID
    $movieId = $data['results'][0]['id'];
    $movieTitle = $data['results'][0]['title'];
    
    if ($debug) $debugData['tmdb_match'] = $data['results'][0];
    
    // 2. Get Watch Providers for this movie
    $providersUrl = "https://api.themoviedb.org/3/movie/{$movieId}/watch/providers?api_key={$tmdbApiKey}";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $providersUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $provResponse = curl_exec($ch);
    curl_close($ch);
    
    $provData = json_decode($provResponse, true);
    
    if ($debug) $debugData['providers_raw'] = $provData['results'] ?? 'No results';
    
    // Check Slovenia (SI)
    if (isset($provData['results']['SI'])) {
        $siData = $provData['results']['SI'];
        
        // Merge all types (flatrate, rent, buy, ads) to find ANY availability
        $allProviders = [];
        if (isset($siData['flatrate'])) $allProviders = array_merge($allProviders, $siData['flatrate']);
        if (isset($siData['rent'])) $allProviders = array_merge($allProviders, $siData['rent']);
        if (isset($siData['buy'])) $allProviders = array_merge($allProviders, $siData['buy']);
        if (isset($siData['ads'])) $allProviders = array_merge($allProviders, $siData['ads']); // Free with ads
        
        foreach ($allProviders as $provider) {
            $name = strtolower($provider['provider_name']);
            
            // Map TMDB names to our internal IDs
            if (strpos($name, 'netflix') !== false) $platforms[] = 'netflix';
            elseif (strpos($name, 'disney') !== false) $platforms[] = 'disneyplus';
            elseif (strpos($name, 'sky') !== false) $platforms[] = 'skyshowtime';
            elseif (strpos($name, 'hbo') !== false || strpos($name, 'max') !== false) $platforms[] = 'hbomax';
            elseif (strpos($name, 'voyo') !== false) $platforms[] = 'voyo';
            elseif (strpos($name, 'amazon') !== false) $platforms[] = 'amazonprime';
        }
    } else {
        if ($debug) {
            $debugData['error'] = 'No SI data found in TMDB response';
            $debugData['available_regions'] = isset($provData['results']) ? array_keys($provData['results']) : [];
        }
    }
}

$output = [
    'platforms' => array_values(array_unique($platforms)),
    'title' => $title,
    'tmdb_used' => true
];

if ($debug) {
    $output['debug'] = $debugData;
}

echo json_encode($output);
?>