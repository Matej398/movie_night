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

// Helper function to extract movie data and offers
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
    // Check in offersByType
    elseif (isset($result['offersByType']) && isset($result['offersByType']['flatrate'])) {
        $offers = $result['offersByType']['flatrate'];
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

// Normalize title for matching (remove special chars, extra spaces, but keep it readable)
$searchTitleLower = strtolower(trim($title));
// Remove punctuation but keep spaces
$searchTitleLower = preg_replace('/[^\w\s]/u', ' ', $searchTitleLower);
$searchTitleLower = preg_replace('/\s+/', ' ', $searchTitleLower);
$searchTitleLower = trim($searchTitleLower);

// Initialize variables
$platforms = [];
$foundPlatformsFromHTML = [];
$items = [];
$response = null;
$html = null;

// Use JustWatch GraphQL API to search for movie in Slovenia (SI)
// This is more reliable for country-specific results
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
// Try multiple REST endpoints - use search endpoint which includes offers
$searchUrls = [
    "https://apis.justwatch.com/content/titles/en_SI/popular",
    "https://apis.justwatch.com/content/titles/sl_SI/popular"
];
$postData = json_encode([
    "query" => $title,
    "page" => 1,
    "page_size" => 20
]);

// Also try the search endpoint which might have better offer data
$searchEndpoint = "https://apis.justwatch.com/content/titles/en_SI/search";
$searchPostData = json_encode([
    "query" => $title,
    "page" => 1,
    "page_size" => 20
]);

// Try GraphQL API first
if ($graphqlQuery) {
    // Escape the JSON body for the command line
    // On Windows, we need to be careful with quotes. 
    // Writing to a temp file is safer for passing JSON to curl
    $tempFile = tempnam(sys_get_temp_dir(), 'jw_query_');
    file_put_contents($tempFile, $graphqlQuery);
    
    $cmd = "curl.exe -X POST -H \"Content-Type: application/json\" -H \"User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\" --data \"@{$tempFile}\" --max-time 20 --silent --show-error \"{$graphqlUrl}\" 2>&1";
    $apiResponse = shell_exec($cmd);
    
    if (isset($_GET['debug'])) {
        echo "GraphQL CMD: $cmd\n";
        echo "GraphQL Response: " . substr($apiResponse, 0, 500) . "\n";
    }

    // Clean up
    @unlink($tempFile);
    
    if ($apiResponse && strlen($apiResponse) > 10) {
        $json = json_decode($apiResponse, true);
        if (isset($json['data']['popularTitles']['edges']) || isset($json['data']['searchForItem']['results'])) {
            $response = $apiResponse;
        }
    }
}

// If GraphQL failed, try REST API
if (!$response) {
    foreach ([$searchEndpoint] as $url) {
        $tempFile = tempnam(sys_get_temp_dir(), 'jw_rest_');
        file_put_contents($tempFile, $searchPostData);
        
        $cmd = "curl.exe -X POST -H \"Content-Type: application/json\" -H \"User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\" --data \"@{$tempFile}\" --max-time 20 --silent --show-error \"{$url}\" 2>&1";
        $apiResponse = shell_exec($cmd);
        
        if (isset($_GET['debug'])) {
            echo "REST CMD: $cmd\n";
            echo "REST Response: " . substr($apiResponse, 0, 500) . "\n";
        }

        @unlink($tempFile);
        
        if ($apiResponse && strlen($apiResponse) > 10) {
            $json = json_decode($apiResponse, true);
            if (isset($json['items'])) {
                $response = $apiResponse;
                break;
            }
        }
    }
}

// JustWatch API isn't working, or returned empty offers, so let's scrape the website directly for Slovenia
$data = null;
$needsHtmlScraping = !$response; // If no API response, we need HTML scraping

// If we got API response but no platforms found, also try HTML scraping as fallback
if ($response) {
    $tempData = json_decode($response, true);
    $hasOffers = false;
    $matchedMovie = false;
    if (isset($tempData['data']['popularTitles']['edges'])) {
        foreach ($tempData['data']['popularTitles']['edges'] as $edge) {
            if (isset($edge['node']['content']['title'])) {
                $nodeTitle = strtolower($edge['node']['content']['title']);
                $searchTitleLowerCheck = strtolower($searchTitleLower);
                // Check if this is our movie
                if (strpos($nodeTitle, $searchTitleLowerCheck) !== false || 
                    strpos($searchTitleLowerCheck, $nodeTitle) !== false) {
                    $matchedMovie = true;
                    if (isset($edge['node']['offers']) && !empty($edge['node']['offers'])) {
                        $hasOffers = true;
                        break;
                    }
                }
            }
        }
    }
    // If API returned our movie but no offers, try HTML scraping as fallback
    if ($matchedMovie && !$hasOffers) {
        $needsHtmlScraping = true;
    }
}

// Scrape JustWatch Slovenia website directly if needed
if ($needsHtmlScraping) {
// Try both search URL formats
$searchQuery = urlencode($title);
$justwatchUrls = [
    "https://www.justwatch.com/si/pretrazi?q={$searchQuery}",
    "https://www.justwatch.com/si?q={$searchQuery}",
    "https://www.justwatch.com/si/film/{$searchQuery}"
];

// Try multiple URLs
$html = false;
$justwatchUrl = '';

foreach ($justwatchUrls as $url) {
    // Method 1: Try curl.exe directly
    $cmd = "curl.exe -L -H \"User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\" --max-time 20 --silent --compressed \"{$url}\" 2>&1";
    $testHtml = shell_exec($cmd);
    
    if ($testHtml && strlen($testHtml) > 1000) {
        $html = $testHtml;
        $justwatchUrl = $url;
        break;
    }
}

// Method 2: If curl fails, try file_get_contents with context
if (!$html || strlen($html) < 1000) {
    $options = [
        'http' => [
            'method' => 'GET',
            'header' => [
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language: en-US,en;q=0.5',
                'Accept-Encoding: gzip, deflate',
                'Connection: keep-alive'
            ],
            'timeout' => 20,
            'follow_location' => true
        ]
    ];
    
    $context = stream_context_create($options);
    $html = @file_get_contents($justwatchUrl, false, $context);
    
    // If gzipped, decompress
    if ($html && function_exists('gzdecode')) {
        $decompressed = @gzdecode($html);
        if ($decompressed !== false) {
            $html = $decompressed;
        }
    }
}

if ($html && strlen($html) > 1000) {
    // Simple approach: If both the platform name and "naročnina" appear in HTML, it's available
    // Check if we're on a movie page (has original-title or movie title)
    $hasOriginalTitle = preg_match('/<h3[^>]*class="original-title"[^>]*>/is', $html);
    $hasMovieTitle = stripos($html, $title) !== false || stripos($html, $searchTitleLower) !== false;
    
    if ($hasOriginalTitle || $hasMovieTitle) {
        // Check each platform - both platform name and "naročnina" must exist in HTML
        // Netflix
        if (stripos($html, 'netflix') !== false && stripos($html, 'naročnina') !== false) {
            // Verify they're reasonably close (within 2000 chars of each other)
            $netflixPos = stripos($html, 'netflix');
            $narocninaPos = stripos($html, 'naročnina');
            if (abs($netflixPos - $narocninaPos) < 2000) {
                $foundPlatformsFromHTML[] = 'netflix';
            }
        }
        
        // Disney+
        if (preg_match('/disney[+\s]?plus/i', $html) && stripos($html, 'naročnina') !== false) {
            $disneyMatch = [];
            preg_match('/disney[+\s]?plus/i', $html, $disneyMatch, PREG_OFFSET_CAPTURE);
            if (!empty($disneyMatch)) {
                $disneyPos = $disneyMatch[0][1];
                $narocninaPos = stripos($html, 'naročnina');
                if (abs($disneyPos - $narocninaPos) < 2000) {
                    $foundPlatformsFromHTML[] = 'disneyplus';
                }
            }
        }
        
        // SkyShowtime
        if (preg_match('/sky\s*showtime/i', $html) && stripos($html, 'naročnina') !== false) {
            $skyMatch = [];
            preg_match('/sky\s*showtime/i', $html, $skyMatch, PREG_OFFSET_CAPTURE);
            if (!empty($skyMatch)) {
                $skyPos = $skyMatch[0][1];
                $narocninaPos = stripos($html, 'naročnina');
                if (abs($skyPos - $narocninaPos) < 2000) {
                    $foundPlatformsFromHTML[] = 'skyshowtime';
                }
            }
        }
        
        // HBO Max
        if (preg_match('/hbo\s*max/i', $html) && stripos($html, 'naročnina') !== false) {
            $hboMatch = [];
            preg_match('/hbo\s*max/i', $html, $hboMatch, PREG_OFFSET_CAPTURE);
            if (!empty($hboMatch)) {
                $hboPos = $hboMatch[0][1];
                $narocninaPos = stripos($html, 'naročnina');
                if (abs($hboPos - $narocninaPos) < 2000) {
                    $foundPlatformsFromHTML[] = 'hbomax';
                }
            }
        }
        
        // Voyo - check for voyo.si or voyo mentions near subscription text
        if (stripos($html, 'voyo') !== false) {
            // Check if it's near subscription-related text (naročnina, takojšen ogled, etc.)
            $voyoPos = stripos($html, 'voyo');
            $narocninaPos = stripos($html, 'naročnina');
            $takojsenPos = stripos($html, 'takojšen ogled');
            $pretakanjePos = stripos($html, 'pretakanje');
            
            // Check if voyo is near any subscription indicator
            $nearSubscription = false;
            if ($narocninaPos !== false && abs($voyoPos - $narocninaPos) < 2000) {
                $nearSubscription = true;
            } elseif ($takojsenPos !== false && abs($voyoPos - $takojsenPos) < 2000) {
                $nearSubscription = true;
            } elseif ($pretakanjePos !== false && abs($voyoPos - $pretakanjePos) < 2000) {
                $nearSubscription = true;
            }
            
            // Also check for voyo.si domain which is a strong indicator
            if (stripos($html, 'voyo.si') !== false) {
                $nearSubscription = true;
            }
            
            if ($nearSubscription) {
                $foundPlatformsFromHTML[] = 'voyo';
            }
        }
    }
        
    // If we found platforms in HTML, use them (this is what user sees on JustWatch)
    if (!empty($foundPlatformsFromHTML)) {
        $items[] = [
            'title' => $title,
            'original_title' => $title,
            'original_release_year' => $year ? (int)$year : null,
            'offers' => array_map(function($p) {
                return [
                    'provider_name' => $p,
                    'monetization_type' => 'flatrate',
                    'platform_id' => $p === 'netflix' ? 'nfx' : ($p === 'disneyplus' ? 'dnp' : ($p === 'skyshowtime' ? 'sst' : ($p === 'hbomax' ? 'hbo' : 'voyo')))
                ];
            }, array_unique($foundPlatformsFromHTML))
        ];
    }
    
    // Method 2: JustWatch embeds data in a script tag with __NEXT_DATA__ or similar
    // Try to extract the JSON data - this is more reliable than HTML pattern matching
    if (preg_match('/<script[^>]*id="__NEXT_DATA__"[^>]*>(.+?)<\/script>/s', $html, $matches)) {
        $jsonData = json_decode($matches[1], true);
        if ($jsonData) {
            // Navigate through the data structure to find movies
            // Try different possible paths
            $searchResults = null;
            $titleData = null;
            
            // Path 1: Search results
            if (isset($jsonData['props']['pageProps']['data']['searchResults'])) {
                $searchResults = $jsonData['props']['pageProps']['data']['searchResults'];
            }
            // Path 2: Single title page (direct movie page) - this is most reliable
            elseif (isset($jsonData['props']['pageProps']['data']['title'])) {
                $titleData = $jsonData['props']['pageProps']['data']['title'];
            }
            // Path 3: Alternative structure
            elseif (isset($jsonData['props']['pageProps']['title'])) {
                $titleData = $jsonData['props']['pageProps']['title'];
            }
            // Path 4: Check entities
            elseif (isset($jsonData['props']['pageProps']['entities']['titles'])) {
                $titles = $jsonData['props']['pageProps']['entities']['titles'];
                if (!empty($titles)) {
                    // Find the matching title
                    foreach ($titles as $tid => $tdata) {
                        $tTitle = strtolower($tdata['title'] ?? '');
                        if (strpos($tTitle, $searchTitleLower) !== false || strpos($searchTitleLower, $tTitle) !== false) {
                            $titleData = $tdata;
                            break;
                        }
                    }
                    if (!$titleData && !empty($titles)) {
                        $titleData = reset($titles); // Get first title as fallback
                    }
                }
            }
            
            // Process search results
            if ($searchResults) {
                foreach ($searchResults as $result) {
                    $objectType = $result['objectType'] ?? ($result['type'] ?? '');
                    if ($objectType === 'MOVIE' || $objectType === 'movie' || (isset($result['title']) && !isset($result['objectType']))) {
                        $itemTitle = $result['title'] ?? '';
                        $originalTitle = $result['originalTitle'] ?? $result['original_title'] ?? '';
                        
                        // Check if this matches our search
                        $titleMatch = false;
                        $itemTitleLower = strtolower($itemTitle);
                        $originalTitleLower = strtolower($originalTitle);
                        $searchTitleLowerCheck = strtolower($searchTitleLower);
                        
                        if (strpos($itemTitleLower, $searchTitleLowerCheck) !== false || 
                            strpos($originalTitleLower, $searchTitleLowerCheck) !== false ||
                            strpos($searchTitleLowerCheck, $itemTitleLower) !== false ||
                            strpos($searchTitleLowerCheck, $originalTitleLower) !== false) {
                            $titleMatch = true;
                        }
                        
                        if ($titleMatch || empty($items)) {
                            $items[] = extractMovieData($result);
                        }
                    }
                }
            }
            // Process single title
            elseif ($titleData) {
                $items[] = extractMovieData($titleData);
            }
        }
    }
    
    // Don't use HTML pattern matching - it's too unreliable and picks up all platforms
    // Only use data from JSON which is country-specific
    
    if (!empty($items)) {
        $data = ['items' => $items];
        $response = json_encode($data);
    }
}

// If we found platforms directly from HTML, use them immediately
if (!empty($foundPlatformsFromHTML)) {
    $platforms = array_unique($foundPlatformsFromHTML);
}

// Process items from HTML scraping to extract platforms (if not already found)
if (empty($platforms) && !empty($items)) {
    foreach ($items as $item) {
        if (isset($item['offers']) && is_array($item['offers'])) {
            foreach ($item['offers'] as $offer) {
                $providerName = strtolower(trim($offer['provider_name'] ?? ''));
                if (!empty($providerName)) {
                    $providerNameMap = [
                        'netflix' => 'netflix',
                        'disneyplus' => 'disneyplus',
                        'disney' => 'disneyplus',
                        'skyshowtime' => 'skyshowtime',
                        'hbomax' => 'hbomax',
                        'hbo' => 'hbomax',
                        'voyo' => 'voyo'
                    ];
                    foreach ($providerNameMap as $key => $value) {
                        if ($providerName === $key || strpos($providerName, $key) !== false) {
                            if (!in_array($value, $platforms)) {
                                $platforms[] = $value;
                            }
                            break;
                        }
                    }
                }
            }
        }
    }
}

}

if ($response) {
    $data = json_decode($response, true);
    
    // Debug output if requested
    if (isset($_GET['debug']) && !isset($_GET['verbose'])) { // only exit if not verbose
        header('Content-Type: text/plain');
        echo "Raw Response Length: " . strlen($response) . "\n\n";
        echo "Decoded Response:\n";
        print_r($data);
        
        // Helper to count items in new structure
        $count = 0;
        if (isset($data['data']['popularTitles']['edges'])) $count = count($data['data']['popularTitles']['edges']);
        elseif (isset($data['data']['searchForItem']['results'])) $count = count($data['data']['searchForItem']['results']);
        elseif (isset($data['items'])) $count = count($data['items']);
        
        echo "\n\nItems found: " . $count . "\n";
        
        // exit; // Don't exit so we can trace logic
    }
    
    // Log errors if any
    if (isset($data['errors'])) {
        error_log("JustWatch API Errors: " . json_encode($data['errors']));
    }
    
    // Always log response for debugging (remove in production)
    if (isset($_GET['verbose'])) {
        error_log("JustWatch Response for '{$title}': " . json_encode($data));
    }
    
    // Platform mapping (JustWatch platform IDs to our names)
    // Based on JustWatch's actual platform IDs
    $platformMap = [
        'nfx' => 'netflix',           // Netflix
        'dnp' => 'disneyplus',         // Disney+
        'sst' => 'skyshowtime',        // SkyShowtime
        'hbo' => 'hbomax',             // HBO Max
        'hbm' => 'hbomax',             // HBO Max (alternative)
        'voyo' => 'voyo',              // Voyo
        'voo' => 'voyo'                // Voyo (alternative)
    ];
    
    // Also check by provider name (case-insensitive)
    $providerNameMap = [
        'netflix' => 'netflix',
        'disney' => 'disneyplus',
        'disney+' => 'disneyplus',
        'disney plus' => 'disneyplus',
        'disneyplus' => 'disneyplus',
        'skyshowtime' => 'skyshowtime',
        'sky showtime' => 'skyshowtime',
        'sky' => 'skyshowtime',
        'hbo' => 'hbomax',
        'hbo max' => 'hbomax',
        'hbomax' => 'hbomax',
        'voyo' => 'voyo'
    ];
    
    // Check different possible response structures
    $items = [];
    if (isset($data['data']['popularTitles']['edges']) && is_array($data['data']['popularTitles']['edges'])) {
        if (isset($_GET['debug'])) echo "Found popularTitles->edges\n";
        // GraphQL response (popularTitles)
        $items = array_map(function($edge) { return $edge['node']; }, $data['data']['popularTitles']['edges']);
    } elseif (isset($data['data']['searchForItem']['results']) && is_array($data['data']['searchForItem']['results'])) {
        if (isset($_GET['debug'])) echo "Found searchForItem->results\n";
        // GraphQL response (old)
        $items = $data['data']['searchForItem']['results'];
    } elseif (isset($data['items']) && is_array($data['items'])) {
        if (isset($_GET['debug'])) echo "Found items (REST)\n";
        // REST response
        $items = $data['items'];
    } else {
        if (isset($_GET['debug'])) echo "No items found in known structure\n";
    }
    
    // Debug: log what we found
    if (isset($_GET['debug'])) {
        echo "\nItems found: " . count($items) . "\n";
        echo "Search title (normalized): " . $searchTitleLower . "\n";
        if (!empty($items)) {
            echo "\nFirst 3 items:\n";
            for ($i = 0; $i < min(3, count($items)); $i++) {
                echo "\nItem " . ($i + 1) . ":\n";
                $debugContent = $items[$i]['content'] ?? $items[$i];
                echo "  Title: " . ($debugContent['title'] ?? 'N/A') . "\n";
                echo "  Year: " . ($debugContent['originalReleaseYear'] ?? $debugContent['original_release_year'] ?? 'N/A') . "\n";
                echo "  Offers count: " . (isset($items[$i]['offers']) ? count($items[$i]['offers']) : 0) . "\n";
                if (isset($items[$i]['offers']) && !empty($items[$i]['offers'])) {
                    echo "  First offer:\n";
                    print_r($items[$i]['offers'][0]);
                }
            }
        }
    }
    
    if (!empty($items)) {
        foreach ($items as $item) {
            // Handle new GraphQL structure (nested content) or flat structure
            $content = $item['content'] ?? $item;
            $itemTitle = strtolower(trim($content['title'] ?? $item['title'] ?? ''));
            $itemOriginalTitle = strtolower(trim($content['originalTitle'] ?? $item['original_title'] ?? ''));
            
            if (empty($itemTitle)) continue; // Skip empty items

            // Normalize item titles the same way
            $itemTitleNormalized = preg_replace('/[^\w\s]/u', ' ', $itemTitle);
            $itemTitleNormalized = preg_replace('/\s+/', ' ', $itemTitleNormalized);
            $itemTitleNormalized = trim($itemTitleNormalized);
            
            $itemOriginalTitleNormalized = preg_replace('/[^\w\s]/u', ' ', $itemOriginalTitle);
            $itemOriginalTitleNormalized = preg_replace('/\s+/', ' ', $itemOriginalTitleNormalized);
            $itemOriginalTitleNormalized = trim($itemOriginalTitleNormalized);
            
            // Title matching - more flexible
            $titleMatch = false;
            $itemYear = isset($content['originalReleaseYear']) ? (string)$content['originalReleaseYear'] : (isset($item['original_release_year']) ? (string)$item['original_release_year'] : '');
            
            // Calculate similarity - check both title and original_title
            $similarity = 0;
            $titleMatch = false;
            $isExactMatch = false;
            
            // Check against both item title and original title
            $titlesToCheck = [$itemTitleNormalized];
            if (!empty($itemOriginalTitleNormalized)) {
                $titlesToCheck[] = $itemOriginalTitleNormalized;
            }
            
            foreach ($titlesToCheck as $checkTitle) {
                if (empty($checkTitle)) continue;

                // Exact match (normalized)
                if ($checkTitle === $searchTitleLower) {
                    $titleMatch = true;
                    $isExactMatch = true;
                    $similarity = 100;
                    if (isset($_GET['debug'])) echo "  -> Exact match on '$checkTitle'\n";
                    break;
                } 
                // Check if search title is contained in item title
                elseif (strpos($checkTitle, $searchTitleLower) !== false) {
                    $similarity = (strlen($searchTitleLower) / strlen($checkTitle)) * 100;
                    if ($similarity > 60) { // At least 60% match
                        $titleMatch = true;
                        if (isset($_GET['debug'])) echo "  -> Partial match (search in item) on '$checkTitle' ($similarity%)\n";
                        break;
                    }
                }
                // Check if item title is contained in search (for longer titles)
                elseif (strpos($searchTitleLower, $checkTitle) !== false && strlen($checkTitle) > 5) {
                    $similarity = (strlen($checkTitle) / strlen($searchTitleLower)) * 100;
                    if ($similarity > 60) {
                        $titleMatch = true;
                        if (isset($_GET['debug'])) echo "  -> Partial match (item in search) on '$checkTitle' ($similarity%)\n";
                        break;
                    }
                }
                // Try word-by-word matching (for titles with different punctuation)
                else {
                    $searchWords = explode(' ', $searchTitleLower);
                    $itemWords = explode(' ', $checkTitle);
                    $matchingWords = 0;
                    $validSearchWords = 0;
                    $stopWords = ['the', 'and', 'for', 'of', 'a', 'an', 'to', 'in'];
                    
                    foreach ($searchWords as $searchWord) {
                        if (strlen($searchWord) > 2 && !in_array($searchWord, $stopWords)) { // Ignore short words and stop words
                            $validSearchWords++;
                            foreach ($itemWords as $itemWord) {
                                if ($searchWord === $itemWord || strpos($itemWord, $searchWord) !== false || strpos($searchWord, $itemWord) !== false) {
                                    $matchingWords++;
                                    break;
                                }
                            }
                        }
                    }
                    if ($validSearchWords > 0 && ($matchingWords / $validSearchWords) > 0.8) { // Require 80% match for word matching
                        $titleMatch = true;
                        if (isset($_GET['debug'])) echo "  -> Word match on '$checkTitle' ($matchingWords/$validSearchWords)\n";
                        break;
                    }
                }
            }
            
            // Year check (if provided and item has year)
            if ($titleMatch && $year && !empty($itemYear)) {
                // Allow year to be within 1 year (for remakes, etc.)
                if (abs((int)$itemYear - (int)$year) > 1) {
                    $titleMatch = false; // Year doesn't match, reject
                    if (isset($_GET['debug'])) echo "  -> Year mismatch: Item $itemYear vs Search $year\n";
                }
            }
            
            if ($titleMatch) {
                if (isset($_GET['debug'])) echo "  -> MATCH ACCEPTED\n";
                // Check offers (streaming availability)
                // Only include subscription/streaming offers, not rent/buy
                if (isset($item['offers']) && is_array($item['offers'])) {
                    foreach ($item['offers'] as $offer) {
                        $monetization = strtolower($offer['monetization_type'] ?? $offer['monetizationType'] ?? '');
                        
                        // Only include flatrate (subscription) offers - exclude rent, buy, free
                        if ($monetization !== 'flatrate' && $monetization !== 'subscription' && $monetization !== 'flatrate_and_buy') {
                            continue;
                        }
                        
                        // Check if this offer is for Slovenia (country code should be SI or available in SI)
                        $countryCode = strtoupper($offer['country'] ?? $offer['countryCode'] ?? '');
                        if (!empty($countryCode) && $countryCode !== 'SI') {
                            continue; // Skip if not for Slovenia
                        }
                        
                        // Check platform_id first (most reliable)
                        // Handle nested package structure
                        $platformId = strtolower($offer['package']['id'] ?? $offer['platform_id'] ?? $offer['platformId'] ?? '');
                        $offerUrl = $offer['standardWebURL'] ?? null;
                        
                        if (!empty($platformId) && isset($platformMap[$platformId])) {
                            $platformName = $platformMap[$platformId];
                            
                            // Check if we already have this platform
                            $found = false;
                            foreach ($platforms as $i => $p) {
                                $pName = is_array($p) ? $p['name'] : $p;
                                if ($pName === $platformName) {
                                    $found = true;
                                    // Update with URL if missing and we have one now
                                    if (is_string($p) && $offerUrl) {
                                        $platforms[$i] = ['name' => $platformName, 'url' => $offerUrl];
                                    } elseif (is_array($p) && empty($p['url']) && $offerUrl) {
                                        $platforms[$i]['url'] = $offerUrl;
                                    }
                                    break;
                                }
                            }
                            
                            if (!$found) {
                                if ($offerUrl) {
                                    $platforms[] = ['name' => $platformName, 'url' => $offerUrl];
                                } else {
                                    $platforms[] = $platformName; // Fallback to string for backward compat
                                }
                            }
                            continue; // Found via platform_id, skip provider_name check
                        }
                        
                        // Fallback: check provider name (be more strict)
                        $providerName = strtolower(trim($offer['package']['clearName'] ?? $offer['provider_name'] ?? $offer['providerName'] ?? ''));
                        if (!empty($providerName)) {
                            // Exact match first
                            if (isset($providerNameMap[$providerName])) {
                                $platformName = $providerNameMap[$providerName];
                                
                                // Check if we already have this platform
                                $found = false;
                                foreach ($platforms as $i => $p) {
                                    $pName = is_array($p) ? $p['name'] : $p;
                                    if ($pName === $platformName) {
                                        $found = true;
                                        if (is_string($p) && $offerUrl) {
                                            $platforms[$i] = ['name' => $platformName, 'url' => $offerUrl];
                                        } elseif (is_array($p) && empty($p['url']) && $offerUrl) {
                                            $platforms[$i]['url'] = $offerUrl;
                                        }
                                        break;
                                    }
                                }
                                
                                if (!$found) {
                                    if ($offerUrl) {
                                        $platforms[] = ['name' => $platformName, 'url' => $offerUrl];
                                    } else {
                                        $platforms[] = $platformName;
                                    }
                                }
                            } else {
                                // Partial match - be more strict
                                foreach ($providerNameMap as $key => $value) {
                                    // Only match if provider name contains the key (not just any mention)
                                    if (strpos($providerName, $key) !== false && strlen($key) > 3) {
                                        $platformName = $value;
                                        
                                        // Check if we already have this platform
                                        $found = false;
                                        foreach ($platforms as $i => $p) {
                                            $pName = is_array($p) ? $p['name'] : $p;
                                            if ($pName === $platformName) {
                                                $found = true;
                                                if (is_string($p) && $offerUrl) {
                                                    $platforms[$i] = ['name' => $platformName, 'url' => $offerUrl];
                                                } elseif (is_array($p) && empty($p['url']) && $offerUrl) {
                                                    $platforms[$i]['url'] = $offerUrl;
                                                }
                                                break;
                                            }
                                        }
                                        
                                        if (!$found) {
                                            if ($offerUrl) {
                                                $platforms[] = ['name' => $platformName, 'url' => $offerUrl];
                                            } else {
                                                $platforms[] = $platformName;
                                            }
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                
                // If we found platforms for this match, we can stop (first good match)
                if (!empty($platforms)) {
                    break;
                }
                
                // If we had an EXACT match on title AND year, stop searching even if no platforms found.
                // This prevents falling back to "similar" titles that might be completely different movies.
                if ($isExactMatch && $year && !empty($itemYear) && abs((int)$itemYear - (int)$year) <= 1) {
                    if (isset($_GET['debug'])) echo "  -> Exact title/year match found. Stopping search.\n";
                    break;
                }
            }
        }
    }
}

$result = [
    'platforms' => $platforms, // Don't use array_unique here as we have objects now
    'title' => $title
];

// Add debug info if requested
if (isset($_GET['verbose'])) {
        $htmlLength = isset($html) ? strlen($html) : 0;
        $result['debug'] = [
            'items_found' => isset($items) ? count($items) : 0,
            'search_title_normalized' => $searchTitleLower,
            'response_received' => !empty($response),
            'response_length' => $response ? strlen($response) : 0,
            'html_length' => $htmlLength,
            'data_keys' => $data ? array_keys($data) : [],
            'justwatch_url' => isset($justwatchUrl) ? $justwatchUrl : 'N/A',
            'found_platforms_from_html' => isset($foundPlatformsFromHTML) ? $foundPlatformsFromHTML : [],
            'has_original_title' => isset($html) ? (preg_match('/<h3[^>]*class="original-title"[^>]*>/is', $html) ? true : false) : false,
            'has_movie_title' => isset($html) ? (stripos($html, $title) !== false || stripos($html, $searchTitleLower) !== false) : false,
            'netflix_in_html' => isset($html) ? (stripos($html, 'netflix') !== false) : false,
            'narocnina_in_html' => isset($html) ? (stripos($html, 'naročnina') !== false) : false,
            'platforms_count' => count($platforms)
        ];
        if (!empty($items)) {
            $firstItemContent = $items[0]['content'] ?? $items[0];
            $result['debug']['first_item'] = [
                'title' => $firstItemContent['title'] ?? 'N/A',
                'year' => $firstItemContent['originalReleaseYear'] ?? $firstItemContent['original_release_year'] ?? 'N/A',
                'has_offers' => isset($items[0]['offers']),
                'offers_count' => isset($items[0]['offers']) ? count($items[0]['offers']) : 0
            ];
            if (isset($items[0]['offers']) && !empty($items[0]['offers'])) {
                $result['debug']['first_item']['first_offer'] = $items[0]['offers'][0];
            }
        } elseif ($data) {
            $result['debug']['data_sample'] = array_slice($data, 0, 1, true);
        }
        if (isset($html) && $htmlLength > 0) {
            // Check for key terms in HTML
            $result['debug']['has_netflix'] = stripos($html, 'netflix') !== false;
            $result['debug']['has_narocnina'] = stripos($html, 'naročnina') !== false;
            $result['debug']['has_takojsen_ogled'] = stripos($html, 'takojšen ogled') !== false;
            $result['debug']['html_preview'] = substr($html, 0, 1000);
            $result['debug']['has_next_data'] = strpos($html, '__NEXT_DATA__') !== false;
            
            // Extract a sample of the viewing section
            if (preg_match('/takojšen\s*ogled.*?(.{500})/is', $html, $viewingMatch)) {
                $result['debug']['viewing_section_sample'] = $viewingMatch[1];
            }
        }
    }

echo json_encode($result);

