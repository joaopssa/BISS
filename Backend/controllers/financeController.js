const db = require("../db");

exports.getSaldo = async (req, res) => {
  const id_usuario = req.user.id_usuario;
  try {
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(
         CASE WHEN tipo='deposito' THEN valor
              WHEN tipo='saque' THEN -valor
         END
       ),0) AS saldo
       FROM movimentacoes_financeiras
       WHERE id_usuario = ?`,
      [id_usuario]
    );
    res.json({ saldo: rows[0].saldo || 0 });
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular saldo." });
  }
};

exports.getExtrato = async (req, res) => {
  const id_usuario = req.user.id_usuario;
  try {
    const [rows] = await db.query(
      `SELECT * FROM movimentacoes_financeiras
       WHERE id_usuario = ?
       ORDER BY data_movimentacao DESC
       LIMIT 200`,
      [id_usuario]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar extrato." });
  }
};

exports.deposito = async (req, res) => {
  const id_usuario = req.user.id_usuario;
  const { valor } = req.body;
  if (!valor || valor <= 0) return res.status(400).json({ error: "Valor inválido." });

  try {
    await db.query(
      `INSERT INTO movimentacoes_financeiras (id_usuario, tipo, valor)
       VALUES (?, 'deposito', ?)`,
      [id_usuario, valor]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro no depósito." });
  }
};

exports.saque = async (req, res) => {
  const id_usuario = req.user.id_usuario;
  const { valor } = req.body;
  if (!valor || valor <= 0) return res.status(400).json({ error: "Valor inválido." });

  try {
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(
         CASE WHEN tipo='deposito' THEN valor
              WHEN tipo='saque' THEN -valor
         END
       ),0) AS saldo
       FROM movimentacoes_financeiras
       WHERE id_usuario = ?`,
      [id_usuario]
    );
    const saldo = rows[0].saldo || 0;
    if (saldo < valor) {
      return res.status(400).json({ error: "Saldo insuficiente para saque." });
    }

    await db.query(
      `INSERT INTO movimentacoes_financeiras (id_usuario, tipo, valor)
       VALUES (?, 'saque', ?)`,
      [id_usuario, valor]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro no saque." });
  }
};
