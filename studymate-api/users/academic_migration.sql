-- ================================================================
-- StudyMate Week 8 Fix: Tambah kolom academic info ke tabel users
-- Jalankan di phpMyAdmin > studymate_db > SQL tab
-- ================================================================
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS university VARCHAR(150) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS major VARCHAR(150) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS semester INT NULL DEFAULT NULL;
