<?php
/**
 * StudyMate API – Migration: Add Academic Fields to Users Table
 * Run once: GET /studymate-api/users/migrate-academic.php
 * Adds: university, major, semester columns to users table
 */
require_once __DIR__ . '/../config/database.php';

$db = getDb();
$results = [];

$migrations = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS university VARCHAR(150) NULL DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS major VARCHAR(150) NULL DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS semester INT NULL DEFAULT NULL",
];

foreach ($migrations as $sql) {
    try {
        $db->exec($sql);
        $results[] = ['sql' => $sql, 'status' => 'OK'];
    } catch (Exception $e) {
        $results[] = ['sql' => $sql, 'status' => 'ERROR', 'message' => $e->getMessage()];
    }
}

jsonResponse(true, 'Migration selesai.', ['results' => $results]);
