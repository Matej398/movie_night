<?php
// Suppress HTML error output
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Catch any errors and return JSON
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        echo json_encode(['error' => 'Server error', 'message' => $error['message']]);
        exit;
    }
});

// Helper function to perform HTTP requests using PHP cURL
function performRequest($url, $postData = null) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    // Use a real browser User-Agent to avoid blocking
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Pass headers
    $headers = [
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language: en-US,en;q=0.5',
    ];
    
    if ($postData) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    }
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) return null;
    return $response;
}

$title = $_GET['title'] ?? '';
$year = $_GET['year'] ?? '';

if (empty($title)) {
    http_response_code(400);
    echo json_encode(['error' => 'Title required']);
    exit;
}

// Normalize title for matching
$searchTitleLower = strtolower(trim($title));
$searchTitleLower = preg_replace('/[^\w\s]/u', ' ', $searchTitleLower);
$searchTitleLower = preg_replace('/\s+/', ' ', $searchTitleLower);
$searchTitleLower = trim($searchTitleLower);

$platforms = [];

// STRATEGY 1: Direct JustWatch Search Page Scraping (Most Reliable for Server-Side)
// The API often blocks servers, but the HTML search page usually works.
$searchUrl = "https://www.justwatch.com/si/pretrazi?q=" . urlencode($title);
$html = performRequest($searchUrl);

if ($html) {
    // JustWatch search results HTML structure
    // Look for the first movie result
    // Regex to find the first result link: <a class="title-list-row__column-header" href="/si/film/back-to-the-future">
    if (preg_match('/<a[^>]+class="[^"]*title-list-row__column-header[^"]*"[^>]+href="([^"]+)"/i', $html, $matches)) {
        $movieUrl = "https://www.justwatch.com" . $matches[1];
        
        // Now fetch the movie page
        $movieHtml = performRequest($movieUrl);
        
        if ($movieHtml) {
            // Look for "Stream" section or "Flatrate" offers
            // JustWatch puts icons in a container. We look for provider names in alt tags or class names.
            
            // Check for Netflix
            if (stripos($movieHtml, 'alt="Netflix"') !== false || stripos($movieHtml, 'class="provider-icon" src="https://images.justwatch.com/icon/207360008/') !== false) {
                $platforms[] = 'netflix';
            }
            
            // Check for Disney+
            if (stripos($movieHtml, 'alt="Disney Plus"') !== false || stripos($movieHtml, 'alt="Disney+"') !== false) {
                $platforms[] = 'disneyplus';
            }
            
            // Check for SkyShowtime
            if (stripos($movieHtml, 'alt="SkyShowtime"') !== false) {
                $platforms[] = 'skyshowtime';
            }
            
            // Check for HBO Max / Max
            if (stripos($movieHtml, 'alt="HBO Max"') !== false || stripos($movieHtml, 'alt="Max"') !== false) {
                $platforms[] = 'hbomax';
            }
            
            // Check for Voyo
            if (stripos($movieHtml, 'alt="Voyo"') !== false) {
                $platforms[] = 'voyo';
            }
            
            // Amazon Prime Video
            if (stripos($movieHtml, 'alt="Amazon Prime Video"') !== false) {
                $platforms[] = 'amazonprime';
            }
        }
    }
}

// STRATEGY 2: Fallback to API if scraping failed (or found nothing)
if (empty($platforms)) {
    // ... (Keep existing API logic but minimized) ...
    // Using the REST endpoint which is simpler
    $searchEndpoint = "https://apis.justwatch.com/content/titles/en_SI/search";
    $searchPostData = json_encode(["query" => $title, "page" => 1, "page_size" => 5]);
    $apiResponse = performRequest($searchEndpoint, $searchPostData);
    
    if ($apiResponse) {
        $json = json_decode($apiResponse, true);
        if (isset($json['items'])) {
            foreach ($json['items'] as $item) {
                // Simple title match
                if (strtolower($item['title']) === $searchTitleLower) {
                    if (isset($item['offers'])) {
                        foreach ($item['offers'] as $offer) {
                            if (in_array($offer['monetization_type'], ['flatrate', 'subscription'])) {
                                // Extract provider name
                                $pName = strtolower($offer['package']['clearName'] ?? '');
                                if (strpos($pName, 'netflix') !== false) $platforms[] = 'netflix';
                                if (strpos($pName, 'disney') !== false) $platforms[] = 'disneyplus';
                                if (strpos($pName, 'sky') !== false) $platforms[] = 'skyshowtime';
                                if (strpos($pName, 'hbo') !== false || strpos($pName, 'max') !== false) $platforms[] = 'hbomax';
                                if (strpos($pName, 'voyo') !== false) $platforms[] = 'voyo';
                            }
                        }
                    }
                    break; // Found match
                }
            }
        }
    }
}

echo json_encode([
    'platforms' => array_unique($platforms),
    'title' => $title
]);
?>