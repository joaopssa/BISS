"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import { useFinance } from "@/contexts/FinanceContext";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from "recharts";

// Importações necessárias para o gráfico

// --- Ícones SVG ---
const TargetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);
const TrendingUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#014a8f]"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
);
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const ChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#014a8f]"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>
);

type Movimentacao = {
  id_movimentacao: number;
  tipo: "deposito" | "saque" | "aposta" | "premio" | "ajuste";
  valor: number;
  descricao?: string;
  data_movimentacao: string;
};

export default function FinancialBalanceScreen() {
  // Scroll para o topo ao montar o componente
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const [saldo, setSaldo] = useState<number>(0);
  const [extrato, setExtrato] = useState<Movimentacao[]>([]);
  const [bilhetes, setBilhetes] = useState<any[]>([]);
  const [valor, setValor] = useState<number>(0);
  const [modo, setModo] = useState<"deposito" | "saque">("deposito");
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  type MonthlyMetric = "bets" | "winRate" | "profit";
  const [monthlyMetric, setMonthlyMetric] = useState<MonthlyMetric>("bets");

  // Contexto de Finanças
  const { refreshTrigger } = useFinance();
  
  // --- States da Meta ---
  const [goalValue, setGoalValue] = useState<number | "">("");
  const [goalPeriod, setGoalPeriod] = useState<
    "1_semana" | "2_semanas" | "1_mes" | "6_meses" | "1_ano" | "personalizado"
  >("1_mes");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [goalFeedback, setGoalFeedback] = useState<string | null>(null);
  const [savedGoal, setSavedGoal] = useState<any>(null);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState<boolean>(false);
  const [editingMetaId, setEditingMetaId] = useState<number | null>(null);

  const [showFullHistory, setShowFullHistory] = useState(false);
    // --- EVOLUÇÃO MENSAL (derivada do extrato + bilhetes) ---
  const monthlyStats = useMemo(() => {
    const keyMonth = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    const map: Record<
      string,
      { bets: number; wins: number; stakeAll: number; premios: number; lostStake: number }
    > = {};

    // Bilhetes: bets / wins / stakes
    bilhetes.forEach((b: any) => {
      const dt = new Date(b.data_criacao || b.createdAt || b.data_registro || Date.now());
      const k = keyMonth(dt);
      if (!map[k]) map[k] = { bets: 0, wins: 0, stakeAll: 0, premios: 0, lostStake: 0 };

      map[k].bets += 1;

      const stake = Number(b.stake_total || b.stake || 0);
      map[k].stakeAll += stake;

      const st = String(b.status || "").toLowerCase();
      if (st === "ganho" || st === "ganha") map[k].wins += 1;
      if (st === "perdido" || st === "perdida") map[k].lostStake += stake;
    });

    // Extrato: prêmios por mês
    extrato.forEach((m) => {
      if (m.tipo !== "premio") return;
      const dt = new Date(m.data_movimentacao);
      const k = keyMonth(dt);
      if (!map[k]) map[k] = { bets: 0, wins: 0, stakeAll: 0, premios: 0, lostStake: 0 };

      map[k].premios += Number(m.valor || 0);
    });

    // Monta lista (mais recente primeiro)
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, v]) => {
        const winRate = v.bets > 0 ? Math.round((v.wins / v.bets) * 1000) / 10 : 0;

        // Profit mantendo sua lógica do progresso: prêmios - (apenas perdas)
        const profit = Math.round((v.premios - v.lostStake) * 100) / 100;

        return {
          month,
          bets: v.bets,
          winRate,
          profit,
        };
      });
  }, [extrato, bilhetes]);


  // REF para detectar clique fora do dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);

  const computeEndDate = (period: string, custom?: string) => {
    const today = new Date();
    let end = new Date(today);

    switch (period) {
      case "1_semana":
        end.setDate(end.getDate() + 7);
        break;
      case "2_semanas":
        end.setDate(end.getDate() + 14);
        break;
      case "1_mes":
        end.setMonth(end.getMonth() + 1);
        break;
      case "6_meses":
        end.setMonth(end.getMonth() + 6);
        break;
      case "1_ano":
        end.setFullYear(end.getFullYear() + 1);
        break;
      case "personalizado":
        if (!custom) return null;
        const d = new Date(custom + "T00:00:00");
        return isNaN(d.getTime()) ? null : d;
      default:
        return null;
    }
    return end;
  };

  const fetchSaldo = async () => {
    try {
      const res = await api.get("/financeiro/saldo", { headers: { "Cache-Control": "no-cache" } });
      const s = Number(res.data?.saldo || 0);
      setSaldo(s);
    } catch {
      setFeedback("Erro ao carregar saldo.");
    }
  };

  const fetchExtrato = async () => {
    try {
      const res = await api.get("/financeiro/extrato", { headers: { "Cache-Control": "no-cache" } });
      const data = Array.isArray(res.data) ? res.data : [];
      const mapped: Movimentacao[] = data.map((m: any) => ({
        id_movimentacao: m.id_movimentacao ?? m.id ?? 0,
        tipo: m.tipo,
        valor: Number(m.valor) || 0,
        descricao: m.descricao || "",
        data_movimentacao: m.data_movimentacao,
      }));
      setExtrato(mapped);
    } catch {
      setFeedback("Erro ao carregar extrato.");
    }
  };

  const fetchBilhetes = async () => {
    try {
      const res = await api.get('/apostas/bilhetes');
      const data = Array.isArray(res.data) ? res.data : [];
      setBilhetes(data);
    } catch (err) {
      console.warn('Erro ao carregar bilhetes:', err);
    }
  };

  useEffect(() => {
    fetchSaldo();
    fetchExtrato();
    fetchBilhetes();
    // Carrega meta do servidor (se houver), senão fallback para localStorage
    const loadMeta = async () => {
      try {
        const res = await api.get("/financeiro/meta");
        if (res.data) {
          const m = res.data;
          setSavedGoal({
            id_meta: m.id_meta,
            value: Number(m.valor),
            period: m.periodo,
            customEndDate: m.data_final || null,
            endDate: m.data_final ? new Date(m.data_final).toISOString() : null,
          });
          return;
        }
      } catch (err) {
        console.warn("Não foi possível carregar meta do servidor:", err);
      }

      try {
        const raw = localStorage.getItem("investmentGoal");
        if (raw) setSavedGoal(JSON.parse(raw));
      } catch {}
    };

    loadMeta();
  }, []);

  // Monitora quando o extrato precisa ser atualizado (quando uma aposta é verificada)
  useEffect(() => {
    fetchExtrato();
    fetchBilhetes();
  }, [refreshTrigger]);

  // Hook para fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPeriodDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSaveGoal = async () => {
    setGoalFeedback(null);

    if (!goalValue || Number(goalValue) <= 0) {
      setGoalFeedback("Informe um valor de meta válido.");
      return;
    }

    if (goalPeriod === "personalizado") {
      if (!customEndDate) {
        setGoalFeedback("Informe a data de término para o período personalizado.");
        return;
      }
      const d = computeEndDate("personalizado", customEndDate);
      if (!d) {
        setGoalFeedback("Data personalizada inválida.");
        return;
      }
      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      if (d < hoje) {
        setGoalFeedback("A data de término deve ser no futuro.");
        return;
      }
    }

    const end = computeEndDate(goalPeriod, customEndDate);
    const apiPayload = {
      valor: Number(goalValue),
      periodo: goalPeriod,
      data_final: customEndDate || null,
    };

    setLoading(true);
    try {
      let returnedId: number | null = editingMetaId || null;
      if (editingMetaId) {
        await api.put(`/financeiro/meta/${editingMetaId}`, apiPayload);
        setGoalFeedback("Meta atualizada com sucesso.");
      } else {
        const resp = await api.post(`/financeiro/meta`, apiPayload);
        returnedId = resp?.data?.id_meta ?? null;
        setGoalFeedback("Meta salva com sucesso.");
      }

      const saved = {
        id_meta: returnedId,
        value: Number(goalValue),
        period: goalPeriod,
        customEndDate: customEndDate || null,
        endDate: end ? end.toISOString() : null,
      };

      setSavedGoal(saved);
      try { localStorage.setItem("investmentGoal", JSON.stringify(saved)); } catch {}

      setGoalValue("");
      setCustomEndDate("");
      setShowPeriodDropdown(false);
      setEditingMetaId(returnedId);
    } catch (err: any) {
      console.error("Erro ao salvar meta:", err);
      setGoalFeedback(err?.response?.data?.error || "Erro ao salvar a meta.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearGoal = async () => {
    setGoalFeedback(null);
    setLoading(true);
    try {
      const idToDelete = savedGoal?.id_meta || editingMetaId || null;
      if (idToDelete) {
        try {
          await api.delete(`/financeiro/meta/${idToDelete}`);
        } catch (err) {
          console.warn('Erro ao deletar meta no servidor, prosseguindo com limpeza local', err);
        }
      }

      try { localStorage.removeItem("investmentGoal"); } catch {}
      setSavedGoal(null);
      setGoalValue("");
      setGoalPeriod("1_mes");
      setCustomEndDate("");
      setEditingMetaId(null);
      setGoalFeedback("Meta removida.");
    } catch (e) {
      setGoalFeedback("Erro ao limpar meta.");
    } finally {
      setLoading(false);
    }
  };

  const handleTransacao = async () => {
    if (!valor || valor <= 0) {
      setFeedback("Informe um valor válido.");
      return;
    }

    if (modo === "saque" && valor > saldo) {
      setFeedback("Saldo insuficiente para saque.");
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const endpoint = modo === "deposito" ? "/financeiro/deposito" : "/financeiro/saque";
      await api.post(endpoint, { valor });

      await fetchSaldo();
      await fetchExtrato();
      setValor(0);

      setFeedback(
        modo === "deposito"
          ? `Depósito de R$ ${valor.toFixed(2)} realizado com sucesso!`
          : `Saque de R$ ${valor.toFixed(2)} realizado com sucesso!`
      );
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Erro na operação.";
      setFeedback(msg);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!savedGoal || !savedGoal.value) return 0;
    // Somar somente prêmios e subtrair apenas stakes de bilhetes perdidos
    const totalPremios = extrato.reduce((acc, m) => m.tipo === 'premio' ? acc + Number(m.valor || 0) : acc, 0);
    const totalPerdido = bilhetes.reduce((acc, b) => {
      const st = (b.status || '').toString().toLowerCase();
      if (st === 'perdido' || st === 'perdida') return acc + Number(b.stake_total || b.stake || 0);
      return acc;
    }, 0);
    const profit = totalPremios - totalPerdido;
    const p = (profit / Number(savedGoal.value)) * 100;
    return Math.min(100, Math.max(0, p));
  };

  const calculateDaysRemaining = () => {
    if (!savedGoal || !savedGoal.endDate) return 0;
    const d = new Date(savedGoal.endDate);
    const diff = Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // --- LÓGICA DO CALENDÁRIO ANUAL (GitHub real) ---
const calendarData = useMemo(() => {
  const year = new Date().getFullYear();

  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  // Mapa com lucro/prejuízo por dia
  const values: Record<string, number> = {};

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    values[toKey(d)] = 0;
  }

  extrato.forEach(m => {
    if (m.tipo !== "premio") return;
    const key = toKey(new Date(m.data_movimentacao));
    if (key in values) values[key] += Number(m.valor) || 0;
  });

  bilhetes.forEach(b => {
    const st = (b.status || "").toLowerCase();
    if (st !== "perdido" && st !== "perdida") return;
    const key = toKey(new Date(b.data_criacao || b.createdAt || Date.now()));
    if (key in values) values[key] -= Number(b.stake_total || b.stake || 0);
  });

  // Descobrir dia da semana do primeiro dia do ano
  const firstDayWeek = start.getDay(); // 0 = domingo

  const weeks: {
    date: string;
    value: number;
  }[][] = [];

  let currentWeek: any[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay(); // 0..6
    const key = toKey(d);

  currentWeek[dow] = {
    date: key,
    value: values[key] ?? 0
  };


    // Se sábado, fecha semana
    if (dow === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Última semana incompleta
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}, [extrato, bilhetes]);

const formatMonth = (ym: string) => {
  // espera "YYYY-MM"
  if (!ym || !ym.includes("-")) return ym;
  const [year, month] = ym.split("-");
  return `${month}/${year}`;
};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <header className="bg-[#014a8f] text-white p-4 shadow">
        <h1 className="text-xl font-bold">Saldo e Movimentações</h1>
      </header>

      <main className="p-6 space-y-6">
        {/* Saldo + Operação lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-4 items-stretch">
          {/* Saldo atual (esquerda) */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-[#014a8f]">Saldo atual</h2>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Disponível</p>
              <h2 className="text-3xl font-bold text-[#014a8f]">R$ {saldo.toFixed(2)}</h2>
            </div>
          </div>

          {/* Operação (direita) */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#014a8f]">Operação</h2>
            </div>

            <div className="border-t pt-4">
              {/* Linha alinhada à direita (Depósito/Saque + Valor + Botão) */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-end gap-3">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant={modo === "deposito" ? "default" : "outline"}
                    className={modo === "deposito" ? "bg-[#014a8f] hover:bg-[#003b70] text-white" : ""}
                    onClick={() => setModo("deposito")}
                  >
                    Depósito
                  </Button>

                  <Button
                    variant={modo === "saque" ? "default" : "outline"}
                    className={modo === "saque" ? "bg-[#014a8f] hover:bg-[#003b70] text-white" : ""}
                    onClick={() => setModo("saque")}
                  >
                    Saque
                  </Button>
                </div>

                <input
                  type="number"
                  value={valor || ""}
                  onChange={(e) => setValor(Number(e.target.value))}
                  placeholder="Valor em R$"
                  className="border rounded-md px-3 py-2 text-sm w-full lg:w-48"
                />

                <Button
                  className="bg-[#014a8f] hover:bg-[#003b70] text-white w-full lg:w-auto"
                  onClick={handleTransacao}
                  disabled={loading}
                >
                  {loading ? "Processando..." : modo === "deposito" ? "Depositar" : "Sacar"}
                </Button>
              </div>

              {feedback && (
                <div
                  className={`mt-3 rounded-lg border px-4 py-2 text-sm ${
                    /sucesso|realizado/i.test(feedback)
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-blue-50 border-blue-200 text-blue-800"
                  }`}
                >
                  {feedback}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* --- EVOLUÇÃO MENSAL (GRÁFICO) --- */}
        <div className="mt-4 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 p-4">
          <div className="flex items-start sm:items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-xl font-bold text-[#014a8f]">
                Evolução Mensal
              </h3>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={monthlyMetric === "profit" ? "default" : "outline"}
                className={monthlyMetric === "profit" ? "bg-[#014a8f] hover:bg-[#003b70] text-white" : ""}
                onClick={() => setMonthlyMetric("profit")}
              >
                Lucro
              </Button>

                            <Button
                size="sm"
                variant={monthlyMetric === "winRate" ? "default" : "outline"}
                className={monthlyMetric === "winRate" ? "bg-[#014a8f] hover:bg-[#003b70] text-white" : ""}
                onClick={() => setMonthlyMetric("winRate")}
              >
                %Acerto
              </Button>

              <Button
                size="sm"
                variant={monthlyMetric === "bets" ? "default" : "outline"}
                className={monthlyMetric === "bets" ? "bg-[#014a8f] hover:bg-[#003b70] text-white" : ""}
                onClick={() => setMonthlyMetric("bets")}
              >
                Apostas
              </Button>
              
            </div>
          </div>

          {/* dados em ordem cronológica (mais antigo -> mais recente) pra ficar natural no gráfico */}
          {monthlyStats.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">
              Sem dados mensais ainda.
            </p>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[...monthlyStats].reverse()}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(v) => formatMonth(String(v))}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    domain={
                      monthlyMetric === "bets"
                        ? [0, "auto"]
                        : monthlyMetric === "winRate"
                        ? [0, 100]
                        : ["auto", "auto"]   // lucro
                    }
                    tickFormatter={(v) => {
                      const n = Number(v);
                      if (monthlyMetric === "profit") return `R$${n.toFixed(0)}`;
                      if (monthlyMetric === "winRate") return `${n.toFixed(0)}%`;
                      return `${n.toFixed(0)}`;
                    }}
                  />

                  <Tooltip
                    labelFormatter={(label) => `Mês: ${formatMonth(String(label))}`}
                    formatter={(value: any) => {
                      const n = Number(value);
                      if (monthlyMetric === "profit") return [`R$ ${n.toFixed(2)}`, "Lucro"];
                      if (monthlyMetric === "winRate") return [`${n.toFixed(1)}%`, "% Acerto"];
                      return [`${Math.round(n)}`, "Apostas"];
                    }}
                  />
                  {monthlyMetric !== "profit" ? (
                  <Bar
                    dataKey={monthlyMetric}
                    radius={[8, 8, 0, 0]}
                    fill={monthlyMetric === "bets" ? "#014a8f" : "#16a34a"}
                  />
                ) : (
                  <Bar dataKey="profit" radius={[8, 8, 0, 0]}>
                    {[...monthlyStats].reverse().map((row, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={Number(row.profit) >= 0 ? "#16a34a" : "#dc2626"}
                      />
                    ))}
                  </Bar>
                )}

                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>


        {/* --- CALENDÁRIO ANUAL DE DESEMPENHO (GitHub Style) --- */}
        <div className="mt-4 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <ChartIcon />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#014a8f]">
                Desempenho Anual
              </h2>
              <p className="text-xs text-gray-500">Lucro Diário</p>
            </div>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-200 dark:bg-neutral-700 rounded-sm" />
              Neutro
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 rounded-sm" />
              Lucro
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-500 rounded-sm" />
              Prejuízo
            </div>
          </div>

          {/* Grid do calendário */}
          <div className="mt-4 overflow-hidden">
            <div
              className="grid"
              style={{
                // controle fino aqui:
                ["--cell" as any]: "13px",
                ["--gap" as any]: "2px",

                gridTemplateColumns: `repeat(${calendarData.length}, var(--cell))`,
                gridTemplateRows: `repeat(7, var(--cell))`,
                gap: "var(--gap)",
                gridAutoFlow: "column",
              }}
            >
              {calendarData.map((week, wIdx) =>
                week.map((day, dIdx) => {
                  if (!day) return <div key={`${wIdx}-${dIdx}`} />;

                  let color = "bg-gray-200 dark:bg-neutral-700";
                  if (day.value > 0) color = "bg-green-500";
                  if (day.value < 0) color = "bg-red-500";

                  return (
                    <div
                      key={day.date}
                      title={`${new Date(day.date).toLocaleDateString("pt-BR")} — R$ ${day.value.toFixed(2)}`}
                      className={`rounded-sm ${color}`}
                      style={{
                        width: "var(--cell)",
                        height: "var(--cell)",
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow p-4">
          <h2 className="text-xl font-bold text-[#014a8f]">Histórico de Movimentações</h2>

          {extrato.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">Nenhuma movimentação registrada.</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Data</th>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {extrato
                    .slice(0, 5)
                    .map((m) => (
                      <tr key={m.id_movimentacao} className="border-b last:border-b-0">
                        <td className="py-2">
                          {new Date(m.data_movimentacao).toLocaleString("pt-BR")}
                        </td>
                        <td className="capitalize">{m.tipo}</td>
                        <td
                          className={
                            m.tipo === "deposito" || m.tipo === "premio"
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {(m.tipo === "deposito" || m.tipo === "premio") ? "+" : "-"} R${" "}
                          {m.valor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              <div className="mt-3 flex justify-center">
                <Button
                  variant="ghost"
                  className="text-[#014a8f]"
                  onClick={() => setShowFullHistory(true)}
                >
                  Ver histórico completo
                </Button>
              </div>
            </>
          )}
        </div>

        {showFullHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg w-full max-w-3xl max-h-[80vh] overflow-hidden border border-gray-100 dark:border-neutral-800">
            
            {/* SCROLL CONTAINER (tudo que rola fica aqui) */}
            <div className="relative max-h-[80vh] overflow-auto">
              
              {/* Header do modal (AGORA sticky e com máscara) */}
              <div className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-b dark:border-neutral-700">
                <div className="flex items-center justify-between p-4">
                  <h3 className="text-lg font-semibold">Histórico Completo</h3>
                  <button
                    onClick={() => setShowFullHistory(false)}
                    className="text-gray-500 hover:text-gray-800 dark:hover:text-white text-xl leading-none"
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>

                {/* Linha sombra/máscara para tapar o conteúdo rolando */}
                <div className="h-3 bg-gradient-to-b from-white dark:from-neutral-900 to-transparent pointer-events-none" />
              </div>

              {/* Conteúdo (tabela) */}
              <div className="p-4 pt-2">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead className="sticky top-[64px] z-30">
                    {/* 64px = altura aproximada do header (p-4 + linha); ajustável se quiser */}
                    <tr>
                      <th className="py-2 text-left bg-white dark:bg-neutral-900 shadow-sm border-b dark:border-neutral-700">
                        Data
                      </th>
                      <th className="py-2 text-left bg-white dark:bg-neutral-900 shadow-sm border-b dark:border-neutral-700">
                        Tipo
                      </th>
                      <th className="py-2 text-left bg-white dark:bg-neutral-900 shadow-sm border-b dark:border-neutral-700">
                        Valor
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {extrato.map((m) => {
                      const tipoLabel =
                        m.tipo === "premio" ? "Prêmio" :
                        m.tipo === "deposito" ? "Depósito" :
                        m.tipo === "saque" ? "Saque" :
                        m.tipo === "aposta" ? "Aposta" :
                        m.tipo === "ajuste" ? "Ajuste" :
                        m.tipo;

                      const isPositive = m.tipo === "deposito" || m.tipo === "premio";

                      return (
                        <tr
                          key={m.id_movimentacao}
                          className="border-b last:border-b-0 dark:border-neutral-800"
                        >
                          <td className="py-2">
                            {new Date(m.data_movimentacao).toLocaleString("pt-BR")}
                          </td>

                          <td>{tipoLabel}</td>

                          <td className={isPositive ? "text-green-600" : "text-red-600"}>
                            {isPositive ? "+" : "-"} R$ {m.valor.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      )}


      </main>
    </div>
  );
}