DROP TABLE IF EXISTS `apostas`;
CREATE TABLE `apostas` (
  `id_aposta` INT NOT NULL AUTO_INCREMENT,
  `id_usuario` INT NOT NULL,
  `data_extracao` DATETIME NOT NULL,                 -- Data/hora em que a odd foi coletada
  `campeonato` VARCHAR(150) NOT NULL,                -- Nome da liga ou torneio
  `partida` VARCHAR(255) NOT NULL,                   -- Ex: "Ferroviária (F) x Bahia (F)"
  `time_casa` VARCHAR(150) NOT NULL,                 -- Time mandante
  `time_fora` VARCHAR(150) NOT NULL,                 -- Time visitante
  `data_hora_partida` DATETIME NOT NULL,             -- Data/hora do jogo (UTC)
  `mercado` VARCHAR(150) NOT NULL,                   -- Ex: "1X2", "Total de Gols"
  `selecao` VARCHAR(100) NOT NULL,                   -- Ex: "1", "2", "Over", "Under"
  `linha` VARCHAR(50) DEFAULT NULL,                  -- Ex: "2.5" (para mercados de gols)
  `odd` DECIMAL(10,2) NOT NULL,                      -- Cotação
  `valor_apostado` DECIMAL(10,2) DEFAULT NULL,       -- Valor investido (definido pelo usuário)
  `possivel_retorno` DECIMAL(10,2) GENERATED ALWAYS AS 
       (IFNULL(`valor_apostado`,0) * `odd`) STORED,  -- Retorno potencial
  `status_aposta` ENUM('pendente','ganha','perdida','cancelada') 
       NOT NULL DEFAULT 'pendente',
  `url_evento` VARCHAR(300) DEFAULT NULL,            -- Link direto para o evento
  `url_liga` VARCHAR(300) DEFAULT NULL,              -- Link da liga
  `data_registro` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_aposta`),
  KEY `fk_apostas_usuarios_idx` (`id_usuario`),
  CONSTRAINT `fk_apostas_usuarios`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
