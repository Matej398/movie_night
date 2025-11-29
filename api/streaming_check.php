<?php
// Suppress HTML error output
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$title = $_GET['title'] ?? '';
$year = $_GET['year'] ?? '';
$debug = isset($_GET['debug']);

if (empty($title)) {
    echo json_encode(['platforms' => [], 'title' => $title]);
    exit;
}

$platforms = [];
$debugData = [];

// Use US search for broader availability
$searchQuery = urlencode($title);
$searchUrl = "https://www.justwatch.com/us/search?q={$searchQuery}";

// Setup curl with proper headers to avoid blocking
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $searchUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language: en-US,en;q=0.9',
    'Connection: keep-alive',
    'Upgrade-Insecure-Requests: 1'
]);

$html = curl_exec($ch);
$curlError = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($debug) {
    $debugData['search_url'] = $searchUrl;
    $debugData['http_code'] = $httpCode;
    $debugData['html_length'] = $html ? strlen($html) : 0;
    if ($curlError) {
        $debugData['curl_error'] = $curlError;
    }
}

if ($html === false) {
    // Curl failed
    if ($debug) {
        $debugData['error'] = 'Curl request failed: ' . ($curlError ?: 'Unknown error');
    }
} elseif ($httpCode === 200 && $html && strlen($html) > 100) {
    // Find movie/TV show link in search results - try multiple patterns
    $moviePath = null;
    $movieUrl = null;
    
    // Pattern 1: Standard href="/us/movie/..." or href="/us/tv-show/..."
    if (preg_match('/href=["\'](\/us\/(?:movie|tv-show)\/[^"\']+)["\']/i', $html, $matches)) {
        $moviePath = $matches[1];
    }
    // Pattern 2: href="/movie/..." or href="/tv-show/..." (without /us/)
    elseif (preg_match('/href=["\'](\/(?:movie|tv-show)\/[^"\']+)["\']/i', $html, $matches)) {
        $moviePath = '/us' . $matches[1]; // Add /us prefix
    }
    // Pattern 3: data-href or other attributes
    elseif (preg_match('/(?:data-href|data-url)=["\'](\/us\/(?:movie|tv-show)\/[^"\']+)["\']/i', $html, $matches)) {
        $moviePath = $matches[1];
    }
    // Pattern 4: Full URL
    elseif (preg_match('/https?:\/\/www\.justwatch\.com\/us\/(?:movie|tv-show)\/[^"\'\s]+/i', $html, $matches)) {
        $movieUrl = $matches[0];
    }
    
    if ($moviePath && !$movieUrl) {
        $movieUrl = "https://www.justwatch.com{$moviePath}";
    }
    
    if ($debug) {
        $debugData['movie_path'] = $moviePath;
        $debugData['movie_url'] = $movieUrl;
        // Save a snippet of HTML for debugging
        $debugData['html_snippet'] = substr($html, 0, 2000); // First 2000 chars
    }
    
    if ($movieUrl) {
        
        // Fetch the movie detail page
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $movieUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language: en-US,en;q=0.9',
            'Connection: keep-alive',
            'Upgrade-Insecure-Requests: 1'
        ]);
        
        $movieHtml = curl_exec($ch);
        $movieCurlError = curl_error($ch);
        $movieHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($debug) {
            $debugData['movie_http_code'] = $movieHttpCode;
            $debugData['movie_html_length'] = $movieHtml ? strlen($movieHtml) : 0;
            if ($movieCurlError) {
                $debugData['movie_curl_error'] = $movieCurlError;
            }
        }
        
        if ($movieHtml === false) {
            if ($debug) {
                $debugData['error'] = 'Failed to fetch movie page: ' . ($movieCurlError ?: 'Unknown error');
            }
        } elseif ($movieHttpCode === 200 && $movieHtml && strlen($movieHtml) > 100) {
            // Convert to lowercase for case-insensitive matching
            $htmlLower = strtolower($movieHtml);
            
            // Check for platforms in HTML (multiple patterns to catch different formats)
            if (stripos($htmlLower, 'netflix') !== false || 
                preg_match('/alt=["\']netflix["\']/i', $movieHtml) ||
                preg_match('/title=["\']netflix["\']/i', $movieHtml)) {
                $platforms[] = 'netflix';
            }
            
            if (stripos($htmlLower, 'disney') !== false || 
                stripos($htmlLower, 'disney+') !== false ||
                preg_match('/alt=["\']disney\s*plus["\']/i', $movieHtml) ||
                preg_match('/title=["\']disney\s*plus["\']/i', $movieHtml)) {
                $platforms[] = 'disneyplus';
            }
            
            if (stripos($htmlLower, 'skyshowtime') !== false || 
                stripos($htmlLower, 'sky showtime') !== false ||
                preg_match('/alt=["\']skyshowtime["\']/i', $movieHtml)) {
                $platforms[] = 'skyshowtime';
            }
            
            if (stripos($htmlLower, 'hbo max') !== false || 
                stripos($htmlLower, 'max') !== false ||
                preg_match('/alt=["\']hbo\s*max["\']/i', $movieHtml) ||
                preg_match('/alt=["\']max["\']/i', $movieHtml)) {
                $platforms[] = 'hbomax';
            }
            
            if (stripos($htmlLower, 'voyo') !== false ||
                preg_match('/alt=["\']voyo["\']/i', $movieHtml)) {
                $platforms[] = 'voyo';
            }
            
            // Remove duplicates
            $platforms = array_values(array_unique($platforms));
            
            if ($debug) {
                $debugData['platforms_found'] = $platforms;
            }
        } else {
            if ($debug) {
                $debugData['error'] = 'Failed to fetch movie detail page';
            }
        }
    } else {
        if ($debug) {
            $debugData['error'] = 'Movie link not found in search results';
        }
    }
} else {
    if ($debug) {
        $debugData['error'] = 'Failed to fetch search page';
    }
}

$output = [
    'platforms' => $platforms,
    'title' => $title,
    'justwatch_used' => true
];

if ($debug) {
    $output['debug'] = $debugData;
}

// Ensure we always output valid JSON
$json = json_encode($output);
if ($json === false) {
    // Fallback if json_encode fails
    echo json_encode([
        'platforms' => [],
        'title' => $title,
        'justwatch_used' => true,
        'error' => 'JSON encoding failed'
    ]);
} else {
    echo $json;
}
?>
