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
    curl_setopt($ch, CURLOPT_MAXREDIRS, 5); // Follow up to 5 redirects
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_ENCODING, ""); // Handle gzip
    
    // Real browser headers
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Pass headers
    $headers = [
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language: en-US,en;q=0.5',
        'Cache-Control: no-cache',
        'Pragma: no-cache',
        'Upgrade-Insecure-Requests: 1',
        'Sec-Fetch-Dest: document',
        'Sec-Fetch-Mode: navigate',
        'Sec-Fetch-Site: none',
        'Sec-Fetch-User: ?1'
    ];
    
    if ($postData) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    }
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    // Cookie handling
    $cookieFile = sys_get_temp_dir() . '/jw_cookies.txt';
    curl_setopt($ch, CURLOPT_COOKIEJAR, $cookieFile);
    curl_setopt($ch, CURLOPT_COOKIEFILE, $cookieFile);

    $response = curl_exec($ch);
    $error = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($error) return null;
    return $response;
}

$title = $_GET['title'] ?? '';
$year = $_GET['year'] ?? '';
$debug = isset($_GET['debug']);

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
$debugLog = [];

// STRATEGY 1: Direct JustWatch Search Page Scraping
// Note: JustWatch URL structure for search is /si/pretrazi?q=TITLE
$searchUrl = "https://www.justwatch.com/si/pretrazi?q=" . urlencode($title);
$html = performRequest($searchUrl);

if ($debug) {
    $debugLog['search_url'] = $searchUrl;
    $debugLog['html_length'] = strlen($html);
}

if ($html) {
    // Regex to find the first movie result link
    // Looking for: href="/si/film/anyone-but-you" class="title-list-row__column-header"
    if (preg_match('/href="(\/si\/film\/[^"]+)"/i', $html, $matches)) {
        $movieUrl = "https://www.justwatch.com" . $matches[1];
        if ($debug) $debugLog['movie_url'] = $movieUrl;
        
        // Now fetch the movie page
        $movieHtml = performRequest($movieUrl);
        
        if ($movieHtml) {
            if ($debug) $debugLog['movie_html_length'] = strlen($movieHtml);
            
            // JustWatch layout usually has a "Watch Now" or "Stream" section.
            // Providers are often in img tags with alt="Netflix" or class names.
            
            // Check specifically for the "Stream" section or "Flatrate"
            // We look for img tags that are likely provider icons
            
            // Common patterns in JustWatch HTML:
            // alt="Netflix"
            // title="Netflix"
            // class="offer-icons" ... src=".../icon/207360008/..." (Netflix icon ID)
            
            // Helper to check presence
            $checkPlatform = function($html, $names) {
                foreach ($names as $name) {
                    // Check alt tag
                    if (stripos($html, 'alt="' . $name . '"') !== false) return true;
                    // Check title tag
                    if (stripos($html, 'title="' . $name . '"') !== false) return true;
                    // Check clean text (risky, might match other text)
                }
                return false;
            };

            if ($checkPlatform($movieHtml, ['Netflix'])) $platforms[] = 'netflix';
            if ($checkPlatform($movieHtml, ['Disney Plus', 'Disney+'])) $platforms[] = 'disneyplus';
            if ($checkPlatform($movieHtml, ['SkyShowtime'])) $platforms[] = 'skyshowtime';
            if ($checkPlatform($movieHtml, ['HBO Max', 'Max'])) $platforms[] = 'hbomax';
            if ($checkPlatform($movieHtml, ['Voyo'])) $platforms[] = 'voyo';
            if ($checkPlatform($movieHtml, ['Amazon Prime Video'])) $platforms[] = 'amazonprime';
            
            // If empty, try regex for icon URLs (fallback)
            if (empty($platforms)) {
                // Netflix icon ID
                if (strpos($movieHtml, '207360008') !== false) $platforms[] = 'netflix';
                // Disney+ icon ID
                if (strpos($movieHtml, '336296237') !== false) $platforms[] = 'disneyplus';
            }
        }
    } else {
        if ($debug) $debugLog['error'] = 'No movie link found in search results';
    }
}

// STRATEGY 2: Fallback to API if scraping failed
if (empty($platforms)) {
    $searchEndpoint = "https://apis.justwatch.com/content/titles/en_SI/search";
    $searchPostData = json_encode(["query" => $title, "page" => 1, "page_size" => 5]);
    $apiResponse = performRequest($searchEndpoint, $searchPostData);
    
    if ($apiResponse) {
        $json = json_decode($apiResponse, true);
        if (isset($json['items'])) {
            foreach ($json['items'] as $item) {
                // Match logic
                $iTitle = strtolower($item['title']);
                if (strpos($iTitle, $searchTitleLower) !== false || strpos($searchTitleLower, $iTitle) !== false) {
                    if (isset($item['offers'])) {
                        foreach ($item['offers'] as $offer) {
                            if (in_array($offer['monetization_type'], ['flatrate', 'subscription'])) {
                                $pName = strtolower($offer['package']['clearName'] ?? '');
                                if (strpos($pName, 'netflix') !== false) $platforms[] = 'netflix';
                                if (strpos($pName, 'disney') !== false) $platforms[] = 'disneyplus';
                                if (strpos($pName, 'sky') !== false) $platforms[] = 'skyshowtime';
                                if (strpos($pName, 'hbo') !== false || strpos($pName, 'max') !== false) $platforms[] = 'hbomax';
                                if (strpos($pName, 'voyo') !== false) $platforms[] = 'voyo';
                            }
                        }
                    }
                    if (!empty($platforms)) break;
                }
            }
        }
    }
}

$response = [
    'platforms' => array_unique($platforms),
    'title' => $title
];

if ($debug) {
    $response['debug'] = $debugLog;
}

echo json_encode($response);
?>