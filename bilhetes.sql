CREATE TABLE IF NOT EXISTS bilhetes (
  id_bilhete INT NOT NULL AUTO_INCREMENT,
  id_usuario INT NOT NULL,
  data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  stake_total DECIMAL(10,2) NOT NULL,
  odd_total DECIMAL(10,2) NOT NULL,
  possivel_retorno DECIMAL(10,2) NOT NULL,
  status ENUM('pendente','ganho','perdido','parcial','cancelado') NOT NULL DEFAULT 'pendente',
  PRIMARY KEY (id_bilhete),
  KEY fk_bilhetes_usuarios_idx (id_usuario),
  CONSTRAINT fk_bilhetes_usuarios
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
