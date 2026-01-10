CREATE TABLE IF NOT EXISTS daily_challenge_summary (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  challenge_date DATE NOT NULL,

  completed_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,
  completed_all TINYINT(1) NOT NULL DEFAULT 0,

  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_user_date (user_id, challenge_date),
  INDEX idx_user_completed_date (user_id, completed_all, challenge_date),

  CONSTRAINT fk_daily_challenge_summary_usuario
    FOREIGN KEY (user_id) REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
