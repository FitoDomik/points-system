<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'u3247715_opg-658');
define('DB_USER', 'u3247715_opg-658');
define('DB_PASS', 'u3247715_opg-658');
define('DB_CHARSET', 'utf8mb4');
function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $pdo;
    } catch (PDOException $e) {
        throw new Exception("Ошибка подключения к базе данных: " . $e->getMessage());
    }
}
function executeQuery($sql, $params = []) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    } catch (PDOException $e) {
        throw new Exception("Ошибка выполнения запроса: " . $e->getMessage());
    }
}
function fetchOne($sql, $params = []) {
    try {
        $stmt = executeQuery($sql, $params);
        return $stmt->fetch();
    } catch (PDOException $e) {
        throw new Exception("Ошибка получения данных: " . $e->getMessage());
    }
}
function fetchAll($sql, $params = []) {
    try {
        $stmt = executeQuery($sql, $params);
        return $stmt->fetchAll();
    } catch (PDOException $e) {
        throw new Exception("Ошибка получения данных: " . $e->getMessage());
    }
}
function rowCount($sql, $params = []) {
    try {
        $stmt = executeQuery($sql, $params);
        return $stmt->rowCount();
    } catch (PDOException $e) {
        throw new Exception("Ошибка подсчета строк: " . $e->getMessage());
    }
}
?>