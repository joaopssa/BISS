DROP TABLE IF EXISTS `movimentacoes_financeiras`;
CREATE TABLE `movimentacoes_financeiras` (
  `id_movimentacao` INT NOT NULL AUTO_INCREMENT,
  `id_usuario` INT NOT NULL,
  `tipo` ENUM('deposito', 'saque') NOT NULL,
  `valor` DECIMAL(10,2) NOT NULL,
  `data_movimentacao` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_movimentacao`),
  KEY `fk_movimentacoes_usuarios_idx` (`id_usuario`),
  CONSTRAINT `fk_movimentacoes_usuarios`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
