CREATE DATABASE IF NOT EXISTS sentisphere_ai;
USE sentisphere_ai;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  language ENUM('Sinhala', 'Tamil', 'English') NOT NULL,
  audio_path VARCHAR(255) NULL,
  sentiment_score DECIMAL(4,2) NOT NULL DEFAULT 0.50,
  emotion_label ENUM('Positive', 'Negative', 'Neutral') NOT NULL DEFAULT 'Neutral',
  mood ENUM('Happy', 'Neutral', 'Stressed', 'Angry') NOT NULL DEFAULT 'Neutral',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
