CREATE TABLE IF NOT EXISTS metas_financeiras (
    id_meta INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,

    valor DECIMAL(10,2) NOT NULL,
    periodo VARCHAR(50) NOT NULL,

    data_final DATE NULL,
    custom_end_date DATE NULL,
    end_date DATETIME NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    saved_at DATETIME NULL

    ADD CONSTRAINT fk_metas_usuarios
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
);
