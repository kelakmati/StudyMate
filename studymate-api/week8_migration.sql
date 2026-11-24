USE `studymate_db`;

-- Add avatar_path to users table
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `avatar_path` VARCHAR(500) NULL DEFAULT NULL;

-- Create courses table
CREATE TABLE IF NOT EXISTS `courses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `code` VARCHAR(20) NOT NULL DEFAULT '',
  `name` VARCHAR(100) NOT NULL,
  `lecturer` VARCHAR(100) NOT NULL DEFAULT '',
  `day` VARCHAR(20) NOT NULL DEFAULT '',
  `time` VARCHAR(50) NOT NULL DEFAULT '',
  `room` VARCHAR(100) NOT NULL DEFAULT '',
  `sks` INT NOT NULL DEFAULT 3,
  `color` VARCHAR(20) NOT NULL DEFAULT '#4F46E5',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_courses_user_id` (`user_id`),
  CONSTRAINT `fk_courses_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create tasks table
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `course_id` INT UNSIGNED NULL DEFAULT NULL,
  `course_name` VARCHAR(100) NOT NULL DEFAULT '',
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `deadline` DATE NULL,
  `priority` VARCHAR(20) NOT NULL DEFAULT 'Sedang',
  `completed` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_user_id` (`user_id`),
  CONSTRAINT `fk_tasks_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create materials table
CREATE TABLE IF NOT EXISTS `materials` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `course_id` INT UNSIGNED NULL DEFAULT NULL,
  `course_name` VARCHAR(100) NOT NULL DEFAULT '',
  `meeting_number` INT NOT NULL DEFAULT 1,
  `meeting_topic` VARCHAR(200) NOT NULL DEFAULT '',
  `title` VARCHAR(200) NOT NULL,
  `file_type` VARCHAR(20) NOT NULL DEFAULT 'PDF',
  `file_name` VARCHAR(200) NOT NULL DEFAULT '',
  `file_size` VARCHAR(30) NOT NULL DEFAULT '',
  `date_added` DATE NOT NULL DEFAULT (CURDATE()),
  `is_studied` TINYINT(1) NOT NULL DEFAULT 0,
  `user_notes` TEXT NULL,
  `photo_uri` VARCHAR(500) NULL,
  `is_scanned` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_materials_user_id` (`user_id`),
  CONSTRAINT `fk_materials_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
