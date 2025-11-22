const db = require("../db");

exports.getSaldo = async (req, res) => {
  const id_usuario = req.user.id;   // <--- CORRETO
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
  const id_usuario = req.user.id;   // <--- CORRETO
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
  const id_usuario = req.user.id;   // <--- CORRETO
  const { valor } = req.body;

  if (!valor || valor <= 0)
    return res.status(400).json({ error: "Valor inválido." });

  try {
    await db.query(
      `INSERT INTO movimentacoes_financeiras (id_usuario, tipo, valor)
       VALUES (?, 'deposito', ?)`,
      [id_usuario, valor]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Erro no depósito:", err);
    res.status(500).json({ error: "Erro no depósito." });
  }
};

exports.saque = async (req, res) => {
  const id_usuario = req.user.id;
  const { valor } = req.body;

  if (!valor || valor <= 0)
    return res.status(400).json({ error: "Valor inválido." });

  try {
    // calcular saldo
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

    const saldo = Number(rows[0].saldo || 0);

    if (saldo < valor) {
      return res.status(400).json({ error: "Saldo insuficiente para saque." });
    }

    // registrar saque
    await db.query(
      `INSERT INTO movimentacoes_financeiras (id_usuario, tipo, valor)
       VALUES (?, 'saque', ?)`,
      [id_usuario, valor]
    );

    return res.json({ success: true });

  } catch (err) {
    console.error("Erro no saque:", err);
    res.status(500).json({ error: "Erro no saque." });
  }
};

// Metas financeiras: criar, obter, atualizar, deletar
exports.getMeta = async (req, res) => {
  const id_usuario = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT * FROM metas_financeiras WHERE id_usuario = ? ORDER BY created_at DESC LIMIT 1`,
      [id_usuario]
    );
    if (rows.length === 0) return res.json(null);
    const m = rows[0];
    // Normalizar nomes de data: suportar `data_final`, `end_date` e `custom_end_date`
    let customDate = null;
    let endDateISO = null;
    if (m.data_final) {
      customDate = m.data_final instanceof Date ? m.data_final.toISOString().slice(0,10) : m.data_final;
      try { endDateISO = new Date(m.data_final).toISOString(); } catch {}
    } else if (m.end_date) {
      endDateISO = m.end_date instanceof Date ? m.end_date.toISOString() : m.end_date;
      try { customDate = endDateISO ? endDateISO.slice(0,10) : null; } catch {}
    } else if (m.custom_end_date) {
      customDate = m.custom_end_date instanceof Date ? m.custom_end_date.toISOString().slice(0,10) : m.custom_end_date;
      try { endDateISO = customDate ? new Date(customDate).toISOString() : null; } catch {}
    }

    res.json({
      id_meta: m.id_meta,
      valor: Number(m.valor),
      periodo: m.periodo || m.period,
      data_final: customDate,
      end_date: endDateISO,
      saved_at: m.saved_at || m.created_at || null,
      updated_at: m.updated_at || null,
    });
  } catch (err) {
    console.error('Erro ao buscar meta:', err);
    res.status(500).json({ error: 'Erro ao buscar meta.' });
  }
};

exports.saveMeta = async (req, res) => {
  const id_usuario = req.user.id;
  // aceitar ambas as formas: { valor, periodo, data_final } ou { value, period, endDate }
  console.log("[saveMeta] recebido body:", req.body);
  const rawValue = req.body.valor ?? req.body.value ?? req.body.amount;
  const rawPeriodo = req.body.periodo ?? req.body.period;
  let rawDataFinal = req.body.data_final ?? req.body.endDate ?? req.body.dataFinal ?? null;

  // se endDate vier como ISO, converte para YYYY-MM-DD
  if (rawDataFinal && rawDataFinal.includes && rawDataFinal.includes('T')) {
    try {
      rawDataFinal = new Date(rawDataFinal).toISOString().slice(0, 10);
    } catch (e) {
      // manter como veio
    }
  }

  // Coerce e valide o valor de forma robusta
  const parsedValue = Number(rawValue);
  if (isNaN(parsedValue) || parsedValue <= 0) {
    console.warn("[saveMeta] valor inválido recebido:", rawValue);
    return res.status(400).json({ error: "Valor de meta inválido." });
  }
  if (!rawPeriodo) return res.status(400).json({ error: 'Período inválido.' });

  try {
    // calcular end_date se não informado
    let computedDataFinal = rawDataFinal;
    if (!computedDataFinal) {
      const today = new Date();
      const end = new Date(today);
      switch ((rawPeriodo || '').toString()) {
        case '1_semana':
          end.setDate(end.getDate() + 7);
          break;
        case '2_semanas':
          end.setDate(end.getDate() + 14);
          break;
        case '1_mes':
          end.setMonth(end.getMonth() + 1);
          break;
        case '6_meses':
          end.setMonth(end.getMonth() + 6);
          break;
        case '1_ano':
          end.setFullYear(end.getFullYear() + 1);
          break;
        default:
          computedDataFinal = null;
      }
      if (!computedDataFinal && end) computedDataFinal = end.toISOString().slice(0,10);
    }

    // Tentativa 1: inserir usando coluna `data_final` (algumas migrações usam esse nome)
    try {
      const [result] = await db.query(
        `INSERT INTO metas_financeiras (id_usuario, valor, periodo, data_final, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [id_usuario, parsedValue, rawPeriodo, computedDataFinal || null]
      );
      res.json({ success: true, id_meta: result.insertId });
      return;
    } catch (e1) {
      console.warn('[saveMeta] insert(data_final) falhou, tentando alternativa:', e1.code || e1.message);
      // se falha por coluna inexistente, tentar inserir usando `end_date` / `custom_end_date`
    }

    // Tentativa 2: inserir usando `custom_end_date` (DATE) e `end_date` (DATETIME)
    const endDateTime = computedDataFinal ? new Date(computedDataFinal + 'T00:00:00').toISOString() : null;
    const [result2] = await db.query(
      `INSERT INTO metas_financeiras (id_usuario, valor, periodo, custom_end_date, end_date, saved_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [id_usuario, parsedValue, rawPeriodo, computedDataFinal || null, endDateTime || null]
    );
    res.json({ success: true, id_meta: result2.insertId });
  } catch (err) {
    console.error('Erro ao salvar meta:', err);
    res.status(500).json({ error: 'Erro ao salvar meta.' });
  }
};

exports.updateMeta = async (req, res) => {
  const id_usuario = req.user.id;
  const { id_meta } = req.params;
  const { valor, periodo, data_final } = req.body;

  if (!id_meta) return res.status(400).json({ error: 'id_meta é obrigatório.' });

  try {
    await db.query(
      `UPDATE metas_financeiras SET valor = ?, periodo = ?, data_final = ? WHERE id_meta = ? AND id_usuario = ?`,
      [valor, periodo, data_final || null, id_meta, id_usuario]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar meta:', err);
    res.status(500).json({ error: 'Erro ao atualizar meta.' });
  }
};

exports.deleteMeta = async (req, res) => {
  const id_usuario = req.user.id;
  const { id_meta } = req.params;
  try {
    await db.query(`DELETE FROM metas_financeiras WHERE id_meta = ? AND id_usuario = ?`, [id_meta, id_usuario]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar meta:', err);
    res.status(500).json({ error: 'Erro ao deletar meta.' });
  }
};

