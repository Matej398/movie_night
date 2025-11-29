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
    
    // Check ALL regions for broader availability
    $availableRegions = isset($provData['results']) ? array_keys($provData['results']) : [];
    $allFoundProviders = [];
    
    foreach ($availableRegions as $region) {
        if (!isset($provData['results'][$region])) continue;
        
        $regionData = $provData['results'][$region];
        
        // Merge all types (flatrate, rent, buy, ads) to find ANY availability
        $allProviders = [];
        if (isset($regionData['flatrate'])) $allProviders = array_merge($allProviders, $regionData['flatrate']);
        if (isset($regionData['rent'])) $allProviders = array_merge($allProviders, $regionData['rent']);
        if (isset($regionData['buy'])) $allProviders = array_merge($allProviders, $regionData['buy']);
        if (isset($regionData['ads'])) $allProviders = array_merge($allProviders, $regionData['ads']); // Free with ads
        
        foreach ($allProviders as $provider) {
            $rawName = $provider['provider_name'];
            $name = strtolower(str_replace([' ', '+', '-'], '', $rawName)); // Normalize: "Disney Plus" -> "disneyplus"
            
            $allFoundProviders[] = $rawName;
            
            // Map TMDB names to our internal IDs with loose matching
            if (strpos($name, 'netflix') !== false) $platforms[] = 'netflix';
            elseif (strpos($name, 'disney') !== false) $platforms[] = 'disneyplus';
            elseif (strpos($name, 'sky') !== false || strpos($name, 'showtime') !== false) $platforms[] = 'skyshowtime';
            elseif (strpos($name, 'hbo') !== false || strpos($name, 'max') !== false) $platforms[] = 'hbomax';
            elseif (strpos($name, 'voyo') !== false) $platforms[] = 'voyo';
            elseif (strpos($name, 'amazon') !== false || strpos($name, 'prime') !== false) $platforms[] = 'amazonprime';
        }
    }
    
    // Remove duplicates
    $platforms = array_values(array_unique($platforms));
    
    // Always populate debug data if debug is enabled
    if ($debug) {
        $debugData['all_found_providers_raw'] = array_values(array_unique($allFoundProviders));
        $debugData['available_regions'] = $availableRegions;
        $debugData['platforms_found_count'] = count($platforms);
        if (empty($platforms)) {
            $debugData['error'] = 'No relevant platforms found in any region';
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