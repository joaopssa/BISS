const path = require("path");
const db = require("../db");

const matchFiles = require("../utils/matchFiles");
const { findMatchResult } = require("../utils/parseMatchFile");

// Normalização
function norm(s) {
  return s
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Detecta combinações impossíveis (over/under, 1x2 conflitante)
function hasImpossibleCombination(selecoes) {
  console.log("\n=== Verificando conflitos impossíveis ===");
  console.log("Seleções do bilhete:", selecoes);

  const jogos = {};

  for (const s of selecoes) {
    const key = norm(s.partida);
    if (!jogos[key]) jogos[key] = [];
    jogos[key].push(s);
  }

  for (const [partida, arr] of Object.entries(jogos)) {
    console.log(`Checando partida: ${partida}`);
    console.log(arr);

    const hasOver = arr.some(a => /over/i.test(a.selecao));
    const hasUnder = arr.some(a => /under/i.test(a.selecao));

    if (hasOver && hasUnder) {
      console.log("❌ Conflito detectado: Over + Under");
      return true;
    }

    const picks1x2 = arr.filter(a => a.mercado === "1X2");
    const distintos = new Set(picks1x2.map(a => a.selecao));

    if (distintos.size > 1) {
      console.log("❌ Conflito detectado: seleções 1X2 incompatíveis");
      return true;
    }
  }

  console.log("Nenhum conflito detectado.");
  return false;
}

// Avalia cada seleção
function evaluatePick(pick, result) {
  console.log("\n=== Avaliando seleção ===");
  console.log("Pick:", pick);
  console.log("Resultado:", result);

  const { mercado, selecao, linha } = pick;
  const gA = result.goalsHome;
  const gB = result.goalsAway;

  console.log(`Mercado: ${mercado} | Seleção: ${selecao} | Placar: ${gA}-${gB}`);

  // 1X2
  if (mercado === "1X2") {
    if (selecao === "1" && gA > gB) return "ganha";
    if (selecao === "X" && gA === gB) return "ganha";
    if (selecao === "2" && gB > gA) return "ganha";
    return "perdida";
  }

  // Dupla Chance
  if (/dupla chance/i.test(mercado)) {
    if (selecao === "1X" && gA >= gB) return "ganha";
    if (selecao === "12" && gA !== gB) return "ganha";
    if (selecao === "X2" && gB >= gA) return "ganha";
    return "perdida";
  }

  // Over / Under
  if (/over|under|total/i.test(mercado)) {
    const total = gA + gB;
    const ln = parseFloat(linha);

    console.log(`Total de gols: ${total} | Linha: ${ln}`);

    if (/over/i.test(selecao)) return total > ln ? "ganha" : "perdida";
    if (/under/i.test(selecao)) return total < ln ? "ganha" : "perdida";
  }

  return "pendente";
}

// VERIFICAÇÃO PRINCIPAL
exports.verificarBilhetesPendentes = async (req, res) => {
  const id_usuario = req.user.id;

  console.log("\n========== INICIANDO VERIFICAÇÃO DE BILHETES ==========\n");
  console.log("Usuário:", id_usuario);

  try {
    const [bilhetes] = await db.query(
      `SELECT * FROM bilhetes WHERE id_usuario = ? AND status = 'pendente'`,
      [id_usuario]
    );

    console.log("Bilhetes pendentes encontrados:", bilhetes);

    if (bilhetes.length === 0)
      return res.json({ message: "Nenhum bilhete pendente." });

    let resultados = [];

    for (const b of bilhetes) {
      console.log("\n==============================");
      console.log(`🔎 Verificando bilhete #${b.id_bilhete}`);
      console.log("==============================");

      const [selecoes] = await db.query(
        `SELECT * FROM apostas WHERE id_bilhete = ?`,
        [b.id_bilhete]
      );

      console.log("Seleções do bilhete:", selecoes);

      // Conflito impossível
      if (hasImpossibleCombination(selecoes)) {
        console.log(`❌ Bilhete #${b.id_bilhete} CANCELADO por conflito`);

        await db.query(
          `UPDATE bilhetes SET status = 'cancelado' WHERE id_bilhete = ?`,
          [b.id_bilhete]
        );

        await db.query(
          `INSERT INTO movimentacoes_financeiras (id_usuario, tipo, valor, descricao, referencia, data_movimentacao)
          VALUES (?, 'premio', ?, 'Bilhete cancelado', ?, ?)`,
          [id_usuario, b.stake_total, b.id_bilhete, b.data_criacao]
        );

        resultados.push({
          id_bilhete: b.id_bilhete,
          status: "cancelado",
        });

        continue;
      }

      let perdeu = false;
      let ganhouTodos = true;

      for (const sel of selecoes) {
        console.log("\n--- Lendo resultado da seleção ---");
        console.log(sel);

        const league = sel.campeonato;
        const partida = sel.partida;

        const filePath = matchFiles[league];
        console.log("Liga:", league);
        console.log("Arquivo mapeado:", filePath);

        if (!filePath) {
          console.log("❌ NENHUM ARQUIVO DE CSV ENCONTRADO PARA ESTA LIGA");
          ganhouTodos = false;
          continue;
        }

        const result = findMatchResult(
          path.resolve(filePath),
          sel.time_casa,
          sel.time_fora
        );

        console.log("Resultado encontrado:", result);

        if (!result || !result.found) {
          console.log("⚠️ Resultado não encontrado — aposta fica pendente");
          ganhouTodos = false;
          continue;
        }

        const st = evaluatePick(sel, result);

        console.log(`Status calculado da aposta #${sel.id_aposta}:`, st);

        await db.query(
          `UPDATE apostas SET status_aposta = ? WHERE id_aposta = ?`,
          [st, sel.id_aposta]
        );

        if (st === "perdida") perdeu = true;
        if (st !== "ganha") ganhouTodos = false;
      }

      let novoStatus = "pendente";

      if (perdeu) novoStatus = "perdido";
      else if (ganhouTodos) novoStatus = "ganho";

      console.log(`\n📌 Status FINAL do bilhete #${b.id_bilhete}:`, novoStatus);

      await db.query(
        `UPDATE bilhetes SET status = ? WHERE id_bilhete = ?`,
        [novoStatus, b.id_bilhete]
      );

      if (novoStatus === "ganho") {
        console.log(`💰 Registrando prêmio de ${b.possivel_retorno}...`);

        await db.query(
        `INSERT INTO movimentacoes_financeiras (id_usuario, tipo, valor, descricao, referencia, data_movimentacao)
        VALUES (?, 'premio', ?, 'Bilhete vencedor', ?, ?)`,
        [id_usuario, b.possivel_retorno, b.id_bilhete, b.data_criacao]
      );

      }

      resultados.push({
        id_bilhete: b.id_bilhete,
        status: novoStatus,
      });
    }

    console.log("\n=== FINAL ===");
    console.log("Resultado da verificação:", resultados);

    res.json({
      success: true,
      resultados,
    });
  } catch (e) {
    console.error("\n❌ ERRO GERAL NA VERIFICAÇÃO:");
    console.error(e);
    res.status(500).json({ error: "Erro ao verificar bilhetes." });
  }
};
