<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
require_once 'config/database.php';
$action = $_GET['action'] ?? '';
$response = ['success' => false, 'message' => 'Неизвестное действие'];
try {
    switch ($action) {
        case 'get_user_data':
            $response = getUserData();
            break;
        case 'get_user_history':
            $response = getUserHistory();
            break;
        case 'get_user_achievements':
            $response = getUserAchievements();
            break;
        case 'get_user_notifications':
            $response = getUserNotifications();
            break;
        case 'mark_notification_read':
            $response = markNotificationRead();
            break;
        case 'get_weekly_activity':
            $response = getWeeklyActivity();
            break;
        case 'create_first_user':
            $response = createFirstUser();
            break;
        case 'get_music_settings':
            $response = getMusicSettings();
            break;
        case 'upload_avatar':
            $response = uploadAvatar();
            break;
        case 'reset_avatar':
            $response = resetAvatar();
            break;
        case 'refresh_user_data':
            $response = refreshUserData();
            break;
        case 'mark_all_notifications_read':
            $response = markAllNotificationsRead();
            break;
        case 'test_db':
            $response = testDatabase();
            break;
        default:
            $response = ['success' => false, 'message' => 'Неизвестное действие'];
    }
} catch (Exception $e) {
    $response = ['success' => false, 'message' => 'Ошибка сервера: ' . $e->getMessage()];
}
echo json_encode($response, JSON_UNESCAPED_UNICODE);
function getUserData() {
    try {
        $userCount = fetchOne("SELECT COUNT(*) as count FROM users WHERE role = 'user'");
        if ($userCount['count'] == 0) {
            return ['success' => false, 'message' => 'Пользователи не найдены', 'need_create' => true];
        }
        $user = fetchOne("SELECT * FROM users WHERE role = 'user' ORDER BY id ASC LIMIT 1");
        if (!$user) {
            return ['success' => false, 'message' => 'Пользователь не найден'];
        }
        return [
            'success' => true,
            'data' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'avatar' => $user['avatar'],
                'total_points' => $user['total_points']
            ]
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка получения данных пользователя: ' . $e->getMessage()];
    }
}
function getUserHistory() {
    try {
        $user = fetchOne("SELECT id FROM users WHERE role = 'user' ORDER BY id ASC LIMIT 1");
        if (!$user) {
            return ['success' => false, 'message' => 'Пользователь не найден'];
        }
        $history = fetchAll("
            SELECT po.*, u.username 
            FROM points_operations po 
            JOIN users u ON po.user_id = u.id 
            WHERE po.user_id = ? 
            ORDER BY po.created_at DESC 
            LIMIT 10
        ", [$user['id']]);
        return ['success' => true, 'data' => $history];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка получения истории: ' . $e->getMessage()];
    }
}
function getUserAchievements() {
    try {
        $user = fetchOne("SELECT id, total_points FROM users WHERE role = 'user' ORDER BY id ASC LIMIT 1");
        if (!$user) {
            return ['success' => false, 'message' => 'Пользователь не найден'];
        }
        $achievements = fetchAll("
            SELECT a.*, 
                   CASE WHEN ua.user_id IS NOT NULL THEN 1 ELSE 0 END as unlocked,
                   ua.unlocked_at as unlocked_date
            FROM achievements a
            LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
            WHERE a.is_active = 1
            ORDER BY a.points_required ASC
        ", [$user['id']]);
        foreach ($achievements as &$achievement) {
            $shouldUnlock = false;
            if ($achievement['points_required'] > 0) {
                $shouldUnlock = $user['total_points'] >= $achievement['points_required'];
            } elseif ($achievement['points_required'] < 0) {
                $shouldUnlock = $user['total_points'] <= $achievement['points_required'];
            } else {
                $shouldUnlock = true;
            }
            if ($shouldUnlock && !$achievement['unlocked']) {
                try {
                    executeQuery("INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, NOW())", 
                               [$user['id'], $achievement['id']]);
                    $achievement['unlocked'] = 1;
                    $achievement['unlocked_date'] = date('Y-m-d H:i:s');
                } catch (Exception $e) {
                }
            }
        }
        return ['success' => true, 'data' => $achievements];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка получения достижений: ' . $e->getMessage()];
    }
}
function getUserNotifications() {
    try {
        $user = fetchOne("SELECT id FROM users WHERE role = 'user' ORDER BY id ASC LIMIT 1");
        if (!$user) {
            return ['success' => false, 'message' => 'Пользователь не найден'];
        }
        $notifications = fetchAll("
            SELECT 'points' as type, 
                   po.id,
                   po.operation_type, 
                   po.points, 
                   po.reason, 
                   po.created_at,
                   CASE WHEN po.operation_type = 'add' THEN 'Начислены очки' ELSE 'Списаны очки' END as title,
                   CASE WHEN po.operation_type = 'add' THEN CONCAT('Вам начислено +', po.points, ' очков ', po.reason)
                        ELSE CONCAT('У вас списано ', po.points, ' очков ', po.reason) END as message,
                   COALESCE(po.is_read, 0) as is_read,
                   po.id as operation_id
            FROM points_operations po 
            WHERE po.user_id = ? 
            ORDER BY po.created_at DESC 
            LIMIT 10
        ", [$user['id']]);
        return ['success' => true, 'data' => $notifications];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка получения уведомлений: ' . $e->getMessage()];
    }
}
function markNotificationRead() {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $operationId = $data['operation_id'] ?? null;
        if (!$operationId) {
            return ['success' => false, 'message' => 'ID операции не указан'];
        }
        $user = fetchOne("SELECT id FROM users WHERE role = 'user' ORDER BY id ASC LIMIT 1");
        if (!$user) {
            return ['success' => false, 'message' => 'Пользователь не найден'];
        }
        $operation = fetchOne("SELECT id, is_read FROM points_operations WHERE id = ? AND user_id = ?", [$operationId, $user['id']]);
        if (!$operation) {
            return ['success' => false, 'message' => 'Операция не найдена'];
        }
        if ($operation['is_read'] == 0) {
            executeQuery("UPDATE points_operations SET is_read = 1 WHERE id = ? AND user_id = ?", [$operationId, $user['id']]);
        }
        return ['success' => true, 'message' => 'Уведомление отмечено как прочитанное'];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка отметки уведомления: ' . $e->getMessage()];
    }
}
function getWeeklyActivity() {
    try {
        $user = fetchOne("SELECT id FROM users WHERE role = 'user' ORDER BY id ASC LIMIT 1");
        if (!$user) {
            return ['success' => false, 'message' => 'Пользователь не найден'];
        }
        $weeklyData = fetchAll("
            SELECT 
                DATE(created_at) as date,
                SUM(CASE WHEN operation_type = 'add' THEN points ELSE -points END) as daily_change
            FROM points_operations 
            WHERE user_id = ? 
            AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ", [$user['id']]);
        $days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        $activity = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-$i days"));
            $dayData = array_filter($weeklyData, function($item) use ($date) {
                return $item['date'] === $date;
            });
            if (!empty($dayData)) {
                $dayData = array_values($dayData)[0];
                $dailyChange = (int)$dayData['daily_change'];
                $activity[] = [
                    'day' => $days[date('N', strtotime($date)) - 1],
                    'daily_change' => $dailyChange
                ];
            } else {
                $activity[] = [
                    'day' => $days[date('N', strtotime($date)) - 1],
                    'daily_change' => 0
                ];
            }
        }
        return ['success' => true, 'data' => $activity];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка получения активности: ' . $e->getMessage()];
    }
}
function createFirstUser() {
    try {
        $sql = "INSERT INTO users (username, avatar, role, total_points) VALUES (?, ?, 'user', 0)";
        executeQuery($sql, ['Пользователь', '👤']);
        return ['success' => true, 'message' => 'Первый пользователь создан'];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка создания пользователя: ' . $e->getMessage()];
    }
}
function getMusicSettings() {
    try {
        $settings = fetchOne("SELECT setting_value FROM system_settings WHERE setting_key = 'music_enabled'");
        return [
            'success' => true,
            'data' => [
                'music_enabled' => $settings ? $settings['setting_value'] : '1'
            ]
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка получения настроек музыки: ' . $e->getMessage()];
    }
}
function uploadAvatar() {
    try {
        if (!isset($_FILES['avatar'])) {
            return ['success' => false, 'message' => 'Файл не загружен'];
        }
        $file = $_FILES['avatar'];
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($file['type'], $allowedTypes)) {
            return ['success' => false, 'message' => 'Неподдерживаемый тип файла. Разрешены только JPEG, PNG, GIF и WebP'];
        }
        if ($file['size'] > 5 * 1024 * 1024) {
            return ['success' => false, 'message' => 'Размер файла не должен превышать 5MB'];
        }
        $user = fetchOne("SELECT id FROM users WHERE role = 'user' ORDER BY id ASC LIMIT 1");
        if (!$user) {
            return ['success' => false, 'message' => 'Пользователь не найден'];
        }
        $uploadDir = 'uploads/avatars/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'avatar_' . $user['id'] . '_' . time() . '.' . $extension;
        $filepath = $uploadDir . $filename;
        if (move_uploaded_file($file['tmp_name'], $filepath)) {
            $avatarUrl = $filepath;
            executeQuery("UPDATE users SET avatar = ? WHERE id = ?", [$avatarUrl, $user['id']]);
            return [
                'success' => true,
                'message' => 'Аватар успешно загружен',
                'data' => [
                    'avatar_type' => 'image',
                    'avatar_url' => $avatarUrl
                ]
            ];
        } else {
            return ['success' => false, 'message' => 'Ошибка при сохранении файла'];
        }
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка загрузки аватара: ' . $e->getMessage()];
    }
}
function resetAvatar() {
    try {
        $user = fetchOne("SELECT id FROM users WHERE role = 'user' ORDER BY id ASC LIMIT 1");
        if (!$user) {
            return ['success' => false, 'message' => 'Пользователь не найден'];
        }
        $defaultAvatar = '👤';
        executeQuery("UPDATE users SET avatar = ? WHERE id = ?", [$defaultAvatar, $user['id']]);
        return [
            'success' => true,
            'message' => 'Аватар сброшен',
            'data' => [
                'avatar' => $defaultAvatar
            ]
        ];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка сброса аватара: ' . $e->getMessage()];
    }
}
function testDatabase() {
    try {
        $pdo = getDBConnection();
        $userCount = fetchOne("SELECT COUNT(*) as count FROM users");
        $achievementCount = fetchOne("SELECT COUNT(*) as count FROM achievements");
        $achievementStructure = fetchAll("DESCRIBE achievements");
                return [
            'success' => true, 
            'message' => 'База данных работает',
            'data' => [
                'users_count' => $userCount['count'],
                'achievements_count' => $achievementCount['count'],
                'achievements_structure' => $achievementStructure
            ]
        ];
    } catch (Exception $e) {
        return [
            'success' => false, 
            'message' => 'Ошибка базы данных: ' . $e->getMessage(),
            'error_details' => [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]
        ];
    }
}
function refreshUserData() {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['user_id'] ?? null;
        if (!$userId) {
            return ['success' => false, 'message' => 'ID пользователя не указан'];
        }
        // Просто возвращаем успех - это заставит пользовательскую панель обновить данные
        return ['success' => true, 'message' => 'Данные пользователя обновлены'];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка обновления данных: ' . $e->getMessage()];
    }
}
function markAllNotificationsRead() {
    try {
        $user = fetchOne("SELECT id FROM users WHERE role = 'user' ORDER BY id ASC LIMIT 1");
        if (!$user) {
            return ['success' => false, 'message' => 'Пользователь не найден'];
        }
        $result = executeQuery("UPDATE points_operations SET is_read = 1 WHERE user_id = ? AND is_read = 0", [$user['id']]);
        return ['success' => true, 'message' => 'Все уведомления отмечены как прочитанные'];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка отметки уведомлений: ' . $e->getMessage()];
    }
}
?>
