const db = require("../db");

function toMySQLDatetime(date) {
  if (!date) return null;

  if (date instanceof Date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
  }

  if (typeof date === "string") {
    return date.replace("T", " ").replace("Z", "").split(".")[0];
  }

  return null;
}

function validarCombinacoes(apostas) {
  const porJogo = new Map();

  for (const a of apostas) {
    const key = a.matchId || a.partida;
    if (!porJogo.has(key)) porJogo.set(key, []);
    porJogo.get(key).push(a);
  }

  for (const picks of porJogo.values()) {
    const picks1x2 = picks.filter(p => p.mercado === "1X2");
    const distintos1x2 = new Set(picks1x2.map(p => p.selecao));
    if (distintos1x2.size > 1) {
      return "Você não pode combinar resultados diferentes (1X2) do mesmo jogo.";
    }

    const overs = picks.filter(p => /over/i.test(p.selecao));
    const unders = picks.filter(p => /under/i.test(p.selecao));

    if (overs.length && unders.length) {
      return "Não pode combinar Over e Under no mesmo bilhete.";
    }
  }

  return null;
}

exports.criarBilhete = async (req, res) => {
  const { apostas, stake } = req.body;
  const id_usuario = req.user.id;

  if (!Array.isArray(apostas) || apostas.length === 0)
    return res.status(400).json({ error: "Nenhuma aposta selecionada." });

  if (!stake || stake <= 0)
    return res.status(400).json({ error: "Valor da aposta inválido." });

  const erroCombos = validarCombinacoes(apostas);
  if (erroCombos) return res.status(400).json({ error: erroCombos });

  let odd_total = 1;
  for (const a of apostas) {
    if (!a.odd || a.odd <= 1)
      return res.status(400).json({ error: "Odd inválida em uma seleção." });

    odd_total *= a.odd;
  }

  const possivel_retorno = Number((odd_total * stake).toFixed(2));

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // saldo agora considera todos os tipos
    const [saldoRows] = await conn.query(
      `SELECT COALESCE(SUM(
         CASE
           WHEN tipo='deposito' THEN valor
           WHEN tipo='premio' THEN valor
           WHEN tipo='saque' THEN -valor
           WHEN tipo='aposta' THEN -valor
         END
       ),0) AS saldo
       FROM movimentacoes_financeiras
       WHERE id_usuario = ?`,
      [id_usuario]
    );

    const saldo = Number(saldoRows[0].saldo || 0);

    if (saldo < stake) {
      await conn.rollback();
      return res.status(400).json({
        error: `Saldo insuficiente. Disponível: R$ ${saldo.toFixed(2)}.`
      });
    }

    // cria bilhete
    const [bilheteResult] = await conn.query(
      `INSERT INTO bilhetes (id_usuario, stake_total, odd_total, possivel_retorno)
       VALUES (?,?,?,?)`,
      [id_usuario, stake, odd_total, possivel_retorno]
    );

    const id_bilhete = bilheteResult.insertId;

    // cria seleções
    for (const a of apostas) {
      await conn.query(
        `INSERT INTO apostas
         (id_bilhete, id_usuario, data_extracao, campeonato, partida,
          time_casa, time_fora, data_hora_partida,
          mercado, selecao, linha, odd, valor_apostado)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id_bilhete,
          id_usuario,
          a.data_extracao || new Date(),
          a.campeonato,
          a.partida,
          a.time_casa,
          a.time_fora,
          toMySQLDatetime(a.data_hora_partida || a.dataPartida || new Date()),
          a.mercado,
          a.selecao,
          a.linha || null,
          a.odd,
          a.valor_apostado || stake
        ]
      );
    }

    // registra saída como APOSTA (não mais saque)
    await conn.query(
      `INSERT INTO movimentacoes_financeiras (id_usuario, tipo, valor)
       VALUES (?, 'aposta', ?)`,
      [id_usuario, stake]
    );

    await conn.commit();

    res.json({
      success: true,
      id_bilhete,
      odd_total,
      possivel_retorno
    });

  } catch (err) {
    console.error(err);
    await conn.rollback();
    res.status(500).json({ error: "Erro ao criar bilhete." });
  } finally {
    conn.release();
  }
};

exports.listarBilhetes = async (req, res) => {
  const id_usuario = req.user.id;

  try {
    const [bilhetes] = await db.query(
      `SELECT * FROM bilhetes
       WHERE id_usuario = ?
       ORDER BY data_criacao DESC`,
      [id_usuario]
    );

    if (bilhetes.length === 0) return res.json([]);

    const ids = bilhetes.map(b => b.id_bilhete);

    const [apostas] = await db.query(
      `SELECT *
       FROM apostas
       WHERE id_bilhete IN (?)
       ORDER BY id_bilhete, id_aposta`,
      [ids]
    );

    const byBilhete = {};

    for (const b of bilhetes)
      byBilhete[b.id_bilhete] = { ...b, selecoes: [] };

    for (const a of apostas)
      byBilhete[a.id_bilhete]?.selecoes.push(a);

    res.json(Object.values(byBilhete));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar bilhetes." });
  }
};

exports.historicoApostas = async (req, res) => {
  const id_usuario = req.user.id;

  try {
    const [rows] = await db.query(
      `SELECT a.*, b.odd_total, b.stake_total, b.possivel_retorno, b.status AS status_bilhete
       FROM apostas a
       JOIN bilhetes b ON a.id_bilhete = b.id_bilhete
       WHERE a.id_usuario = ?
       ORDER BY a.data_registro DESC`,
      [id_usuario]
    );

    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar histórico." });
  }
};
