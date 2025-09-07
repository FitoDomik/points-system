<?php
define('FCM_SERVER_KEY', getenv('FCM_SERVER_KEY') ?: 'PASTE_YOUR_FCM_SERVER_KEY_HERE');

function sendFcmNotification($tokens, $title, $body, $data = []) {
    if (empty($tokens)) return ['success' => false, 'message' => 'Нет токенов'];
    if (FCM_SERVER_KEY === 'PASTE_YOUR_FCM_SERVER_KEY_HERE') {
        return ['success' => false, 'message' => 'FCM серверный ключ не настроен'];
    }
    $url = 'https://fcm.googleapis.com/fcm/send';
    $payload = [
        'registration_ids' => array_values(array_unique($tokens)),
        'priority' => 'high',
        'notification' => [
            'title' => $title,
            'body' => $body,
            'sound' => 'default',
        ],
        'data' => $data,
        'android' => [
            'priority' => 'high',
        ]
    ];
    $headers = [
        'Authorization: key=' . FCM_SERVER_KEY,
        'Content-Type: application/json'
    ];
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    $result = curl_exec($ch);
    if ($result === false) {
        $err = curl_error($ch);
        curl_close($ch);
        return ['success' => false, 'message' => 'Ошибка CURL: ' . $err];
    }
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['success' => $httpCode === 200, 'message' => 'Отправлено', 'response' => $result];
}
?>

