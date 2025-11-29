<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$query = $_GET['q'] ?? '';
if (strlen($query) < 1) {
    echo json_encode([]);
    exit;
}

$firstChar = strtolower(substr($query, 0, 1));
$encodedQuery = urlencode($query);
$url = "https://v2.sg.media-imdb.com/suggestion/{$firstChar}/{$encodedQuery}.json";

$options = [
    "http" => [
        "header" => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36\r\n"
    ]
];

// Try standard fetch first
if (extension_loaded('openssl')) {
    $context = stream_context_create($options);
    $response = @file_get_contents($url, false, $context);
} else {
    $response = false;
}

// Fallback to system curl if PHP fetch fails
if ($response === FALSE) {
    $cmd = 'curl -L -A "Mozilla/5.0" "' . $url . '"';
    $response = shell_exec($cmd);
}

if (!$response) {
    echo json_encode(['error' => 'Failed to fetch from IMDb']);
    exit;
}

// Sometimes curl output might contain headers if not careful, but shell_exec usually just stdout.
// However, if previous debug echoes exist, it breaks JSON. Ensure no extra whitespace.

$data = json_decode($response, true);
$results = [];

if (isset($data['d'])) {
    foreach ($data['d'] as $item) {
        if (isset($item['id']) && isset($item['l'])) {
            $imageUrl = $item['i']['imageUrl'] ?? '';
            // Force US CDN and English locale
            if ($imageUrl) {
                $imageUrl = preg_replace('/https?:\/\/[^\/]+\.media-amazon\.com/', 'https://m.media-amazon.com', $imageUrl);
                $imageUrl = preg_replace('/_V1_.*?\.jpg$/i', '_V1_.jpg', $imageUrl);
            }
            $results[] = [
                'id' => $item['id'],
                'title' => $item['l'],
                'year' => $item['y'] ?? '',
                'image' => $imageUrl,
                'stars' => $item['s'] ?? ''
            ];
        }
    }
}

echo json_encode($results);
?>