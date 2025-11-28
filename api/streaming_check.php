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
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Pass headers
    $headers = [
        'Content-Type: application/json',
        'Accept: application/json'
    ];
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if ($postData) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    }
    
    // Disable SSL verification if needed (not recommended for production but helps with some server configs)
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return null;
    }
    return $response;
}

// Helper to extract movie data
function extractMovieData($result) {
    $itemTitle = $result['title'] ?? '';
    $originalTitle = $result['originalTitle'] ?? $result['original_title'] ?? '';
    
    $movieData = [
        'title' => $itemTitle,
        'original_title' => $originalTitle,
        'original_release_year' => $result['originalReleaseYear'] ?? $result['original_release_year'] ?? null,
        'offers' => []
    ];
    
    // Get offers - check multiple possible locations and structures
    $offers = [];
    
    // Direct offers array
    if (isset($result['offers']) && is_array($result['offers'])) {
        $offers = $result['offers'];
    }
    // Flatrate array
    elseif (isset($result['flatrate']) && is_array($result['flatrate'])) {
        $offers = $result['flatrate'];
    }
    // Streaming options
    elseif (isset($result['streamingOptions'])) {
        if (isset($result['streamingOptions']['flatrate']) && is_array($result['streamingOptions']['flatrate'])) {
            $offers = $result['streamingOptions']['flatrate'];
        } elseif (is_array($result['streamingOptions'])) {
            $offers = $result['streamingOptions'];
        }
    }
    // Watch options
    elseif (isset($result['watchOptions'])) {
        if (isset($result['watchOptions']['flatrate']) && is_array($result['watchOptions']['flatrate'])) {
            $offers = $result['watchOptions']['flatrate'];
        } elseif (is_array($result['watchOptions'])) {
            $offers = $result['watchOptions'];
        }
    }
    
    if (!empty($offers)) {
        $movieData['offers'] = $offers;
    }
    
    return $movieData;
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
$items = [];
$response = null;

// Use JustWatch GraphQL API to search for movie in Slovenia (SI)
$graphqlUrl = "https://apis.justwatch.com/graphql";
$searchQuery = $title . ($year ? " " . $year : "");

// Build GraphQL query properly
$graphqlQuery = json_encode([
    "query" => "query GetSearchResults(\$query: String!, \$country: Country!) { popularTitles(country: \$country, filter: { searchQuery: \$query }) { edges { node { ... on Movie { id objectType content(country: \$country, language: \"en\") { title originalReleaseYear } offers(country: \$country, platform: WEB) { monetizationType package { id clearName shortName } standardWebURL } } } } } } }",
    "variables" => [
        "query" => $searchQuery,
        "country" => "SI"
    ]
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

// Also try the REST endpoint as fallback
$searchEndpoint = "https://apis.justwatch.com/content/titles/en_SI/search";
$searchPostData = json_encode([
    "query" => $title,
    "page" => 1,
    "page_size" => 20
]);

// Try GraphQL API first
if ($graphqlQuery) {
    $apiResponse = performRequest($graphqlUrl, $graphqlQuery);
    
    if ($apiResponse && strlen($apiResponse) > 10) {
        $json = json_decode($apiResponse, true);
        if (isset($json['data']['popularTitles']['edges'])) {
            $response = $apiResponse;
        }
    }
}

// If GraphQL failed, try REST API
if (!$response) {
    $apiResponse = performRequest($searchEndpoint, $searchPostData);
    
    if ($apiResponse && strlen($apiResponse) > 10) {
        $json = json_decode($apiResponse, true);
        if (isset($json['items'])) {
            $response = $apiResponse;
        }
    }
}

// Process Response
if ($response) {
    $data = json_decode($response, true);
    
    // Platform mapping (JustWatch platform IDs to our names)
    $platformMap = [
        'nfx' => 'netflix',           
        'dnp' => 'disneyplus',         
        'sst' => 'skyshowtime',        
        'hbo' => 'hbomax',             
        'hbm' => 'hbomax',             
        'voyo' => 'voyo',              
        'voo' => 'voyo'                
    ];
    
    // Also check by provider name (case-insensitive)
    $providerNameMap = [
        'netflix' => 'netflix',
        'disney' => 'disneyplus',
        'disney+' => 'disneyplus',
        'disneyplus' => 'disneyplus',
        'skyshowtime' => 'skyshowtime',
        'sky showtime' => 'skyshowtime',
        'hbo' => 'hbomax',
        'hbo max' => 'hbomax',
        'hbomax' => 'hbomax',
        'voyo' => 'voyo'
    ];
    
    // Extract items based on response structure
    $items = [];
    if (isset($data['data']['popularTitles']['edges']) && is_array($data['data']['popularTitles']['edges'])) {
        // GraphQL response
        $items = array_map(function($edge) { return $edge['node']; }, $data['data']['popularTitles']['edges']);
    } elseif (isset($data['items']) && is_array($data['items'])) {
        // REST response
        $items = $data['items'];
    }
    
    if (!empty($items)) {
        foreach ($items as $item) {
            // Handle new GraphQL structure (nested content) or flat structure
            $content = $item['content'] ?? $item;
            $itemTitle = strtolower(trim($content['title'] ?? $item['title'] ?? ''));
            
            if (empty($itemTitle)) continue;

            // Normalize item titles
            $itemTitleNormalized = preg_replace('/[^\w\s]/u', ' ', $itemTitle);
            $itemTitleNormalized = preg_replace('/\s+/', ' ', $itemTitleNormalized);
            $itemTitleNormalized = trim($itemTitleNormalized);
            
            // Title matching logic
            $titleMatch = false;
            
            // Exact match (normalized)
            if ($itemTitleNormalized === $searchTitleLower) {
                $titleMatch = true;
            } 
            // Partial match (search in item) - High threshold
            elseif (strpos($itemTitleNormalized, $searchTitleLower) !== false) {
                 // Only if search term is significant portion
                 if (strlen($searchTitleLower) > 4) $titleMatch = true;
            }
            
            // Year check (if provided)
            $itemYear = isset($content['originalReleaseYear']) ? (int)$content['originalReleaseYear'] : (isset($item['original_release_year']) ? (int)$item['original_release_year'] : 0);
            if ($titleMatch && $year && $itemYear) {
                if (abs($itemYear - (int)$year) > 1) {
                    $titleMatch = false; // Year mismatch
                }
            }
            
            if ($titleMatch) {
                // Check offers
                if (isset($item['offers']) && is_array($item['offers'])) {
                    foreach ($item['offers'] as $offer) {
                        $monetization = strtolower($offer['monetization_type'] ?? $offer['monetizationType'] ?? '');
                        
                        // Only include flatrate (subscription)
                        if ($monetization !== 'flatrate' && $monetization !== 'subscription' && $monetization !== 'flatrate_and_buy') {
                            continue;
                        }
                        
                        $offerUrl = $offer['standardWebURL'] ?? null;
                        
                        // Check platform_id
                        $platformId = strtolower($offer['package']['id'] ?? $offer['platform_id'] ?? $offer['platformId'] ?? '');
                        $platformName = '';
                        
                        if (!empty($platformId) && isset($platformMap[$platformId])) {
                            $platformName = $platformMap[$platformId];
                        } else {
                            // Fallback to name
                            $pName = strtolower(trim($offer['package']['clearName'] ?? $offer['provider_name'] ?? ''));
                            foreach ($providerNameMap as $key => $val) {
                                if (strpos($pName, $key) !== false) {
                                    $platformName = $val;
                                    break;
                                }
                            }
                        }
                        
                        if ($platformName) {
                            // Check if already added
                            $exists = false;
                            foreach ($platforms as $p) {
                                $existingName = is_array($p) ? $p['name'] : $p;
                                if ($existingName === $platformName) {
                                    $exists = true;
                                    break;
                                }
                            }
                            
                            if (!$exists) {
                                if ($offerUrl) {
                                    $platforms[] = ['name' => $platformName, 'url' => $offerUrl];
                                } else {
                                    $platforms[] = $platformName;
                                }
                            }
                        }
                    }
                }
                
                // If we found a good match with platforms, stop searching
                if (!empty($platforms)) break;
            }
        }
    }
}

echo json_encode([
    'platforms' => $platforms,
    'title' => $title
]);
?>