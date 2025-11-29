<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$title = $_GET['title'] ?? '';
$year = $_GET['year'] ?? '';

if (empty($title)) {
    echo json_encode(['error' => 'No title provided']);
    exit;
}

// Use TMDB API to get English poster
$tmdbApiKey = '987a9d0095e7c36a87a5f23331724658';
$searchUrl = "https://api.themoviedb.org/3/search/movie?api_key={$tmdbApiKey}&query=" . urlencode($title) . "&language=en-US";
if ($year) {
    $searchUrl .= "&year=" . urlencode($year);
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $searchUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

if (!empty($data['results']) && !empty($data['results'][0]['poster_path'])) {
    $posterPath = $data['results'][0]['poster_path'];
    $imageUrl = 'https://image.tmdb.org/t/p/w500' . $posterPath; // w500 = 500px width
    
    echo json_encode([
        'success' => true,
        'image_url' => $imageUrl,
        'title' => $data['results'][0]['title'] ?? $title
    ]);
} else {
    echo json_encode(['error' => 'Poster not found']);
}
?>

