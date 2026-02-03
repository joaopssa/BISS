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
  Cell,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// --- Ícones SVG ---
const TargetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#014a8f]">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#014a8f]">
    <line x1="12" x2="12" y1="20" y2="10" />
    <line x1="18" x2="18" y1="20" y2="4" />
    <line x1="6" x2="6" y1="20" y2="16" />
  </svg>
);

// =======================
// Helpers (datas + valores)
// =======================
const parseDbDate = (s: string) => {
  if (!s) return new Date(NaN);

  // ISO / MySQL: YYYY-MM-DD HH:mm:ss ou YYYY-MM-DDTHH:mm:ss
  const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m1) {
    const [, Y, M, D, hh = "00", mm = "00", ss = "00"] = m1;
    return new Date(Number(Y), Number(M) - 1, Number(D), Number(hh), Number(mm), Number(ss));
  }

  // PT-BR: DD/MM/YYYY HH:mm[:ss]
  const m2 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m2) {
    const [, D, M, Y, hh = "00", mm = "00", ss = "00"] = m2;
    return new Date(Number(Y), Number(M) - 1, Number(D), Number(hh), Number(mm), Number(ss));
  }

  return new Date(s); // fallback
};

const absValor = (x: any) => Math.abs(Number(x || 0));

type Movimentacao = {
  id_movimentacao: number;
  tipo: "deposito" | "saque" | "aposta" | "premio" | "ajuste";
  valor: number;
  descricao?: string;
  data_movimentacao: string;
};

type MovTipo = Movimentacao["tipo"];

const normalizeMovTipo = (raw: any): MovTipo => {
  const t = String(raw || "").toLowerCase().trim();

  if (t === "deposito" || t === "depósito") return "deposito";
  if (t === "saque") return "saque";
  if (t === "aposta") return "aposta";
  if (t === "premio" || t === "prêmio") return "premio";
  if (t === "ajuste") return "ajuste";

  // fallback seguro (evita quebrar a tela por tipos inesperados)
  return "ajuste";
};

const KPIBox = ({
  label,
  value,
  footer,
  valueClass = "text-3xl",
}: {
  label: string;
  value: React.ReactNode;
  footer?: React.ReactNode;
  valueClass?: string;
}) => {
  return (
    <div className="rounded-2xl bg-gray-50/70 dark:bg-neutral-950/40 border border-gray-200/60 dark:border-neutral-800 px-4 py-3 min-h-[110px] grid grid-rows-[auto_1fr_auto]">
      <div className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
        {label}
      </div>

      <div className="flex items-center min-h-[44px]">
        <div className={`${valueClass} font-extrabold tabular-nums leading-none text-gray-900 dark:text-white`}>
          {value}
        </div>
      </div>

      <div className="min-h-[16px] text-xs text-gray-600 dark:text-gray-400 leading-none">
        {footer ?? <span className="opacity-0">.</span>}
      </div>
    </div>
  );
};

// =======================
// LUCRO CORRETO POR BILHETES FINALIZADOS
// =======================
const normStatus = (s: any) => String(s || "").toLowerCase().trim();

const isDecided = (statusRaw: any) => {
  const st = normStatus(statusRaw);
  return st === "ganho" || st === "ganha" || st === "perdido" || st === "perdida";
};

const isWin = (statusRaw: any) => {
  const st = normStatus(statusRaw);
  return st === "ganho" || st === "ganha";
};

// usa data de resultado/fechamento primeiro (decisão), depois updated/created
const getBilheteDecisionDate = (b: any) => {
  const s =
    b.data_resultado ||
    b.data_fechamento ||
    b.data_finalizacao ||
    b.updatedAt ||
    b.data_atualizacao ||
    b.data_criacao ||
    b.createdAt ||
    b.data_registro;

  return typeof s === "string" ? parseDbDate(s) : new Date(s || Date.now());
};

const getStake = (b: any) => Number(b.stake_total ?? b.stake ?? 0);

// payout/retorno: ajuste os nomes conforme seu backend
const getOdd = (b: any) =>
  Number(
    b.odd_total ??
    b.oddFinal ??
    b.odd ??
    b.odd_acumulada ??
    b.oddAcumulada ??
    b.cotacao_total ??
    b.cotacao ??
    0
  );

const getPayout = (b: any) => {
  // 1) tenta achar "retorno/payout" explícito do backend
  const explicit =
    Number(
      b.payout_total ??
      b.retorno_total ??
      b.valor_retorno ??
      b.valorRetorno ??
      b.premio_total ??
      b.valor_premio ??
      b.valorPremio ??
      b.premio ??
      b.retorno ??
      0
    ) || 0;

  if (explicit > 0) return explicit;

  // 2) fallback: calcula pelo odd * stake (se tiver odd)
  const stake = getStake(b);
  const odd = getOdd(b);

  if (stake > 0 && odd > 0) {
    return stake * odd; // payout bruto
  }

  return 0;
};


// lucro por bilhete FINALIZADO: (payout - stake) se ganhou; (-stake) se perdeu
const profitFromDecidedBilhete = (b: any) => {
  if (!isDecided(b.status)) return 0;

  const stake = getStake(b);
  if (!Number.isFinite(stake) || stake <= 0) return 0;

  if (!isWin(b.status)) {
    return -stake; // perdeu -> -stake
  }

  // ganhou -> lucro = payout - stake
  const payout = getPayout(b);

  // se payout veio 0 e odd/stake não existirem, não dá pra calcular (evita lixo)
  if (!Number.isFinite(payout) || payout <= 0) return 0;

  return payout - stake;
};


const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export default function FinancialBalanceScreen() {
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

  const { refreshTrigger } = useFinance();

  // --- Meta (mantida) ---
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

  // saldo "em aberto" (stake travado)
  const saldoEmAposta = useMemo(() => {
    return bilhetes.reduce((acc, b: any) => {
      const st = normStatus(b.status);
      if (st === "aberto" || st === "pendente") {
        return acc + getStake(b);
      }
      return acc;
    }, 0);
  }, [bilhetes]);

  // =======================
  // FETCH
  // =======================
  const fetchSaldo = async () => {
    try {
      const res = await api.get("/financeiro/saldo", { headers: { "Cache-Control": "no-cache" } });
      setSaldo(Number(res.data?.saldo || 0));
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
      tipo: normalizeMovTipo(m.tipo), // ✅ agora bate com o union
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
      const res = await api.get("/apostas/bilhetes");
      setBilhetes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn("Erro ao carregar bilhetes:", err);
    }
  };

  useEffect(() => {
    fetchSaldo();
    fetchExtrato();
    fetchBilhetes();

    // meta (mantida)
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
      } catch { }
    };

    loadMeta();
  }, []);

  useEffect(() => {
    fetchExtrato();
    fetchBilhetes();
  }, [refreshTrigger]);

  // dropdown click-out (mantido)
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPeriodDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // =======================
  // OPERAÇÕES DEPÓSITO/SAQUE
  // =======================
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
      setFeedback(err?.response?.data?.error || "Erro na operação.");
    } finally {
      setLoading(false);
    }
  };

  // =======================
  // FORMATAÇÃO
  // =======================
  const formatMonth = (ym: string) => {
    if (!ym || !ym.includes("-")) return ym;
    const [year, month] = ym.split("-");
    return `${month}/${year}`;
  };

  const formatBRL = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatBRLCompact = (value: number) => {
    const abs = Math.abs(value);
    if (abs < 10000) {
      return value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return value.toLocaleString("pt-BR", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    });
  };

  // =======================
  // ✅ LUCRO ANUAL CORRETO (BILHETES FINALIZADOS)
  // =======================
  const profitAno = useMemo(() => {
    const year = new Date().getFullYear();
    let sum = 0;
    for (const b of bilhetes) {
      if (!isDecided(b.status)) continue;
      const dt = getBilheteDecisionDate(b);
      if (!Number.isFinite(dt.getTime())) continue;
      if (dt.getFullYear() !== year) continue;
      sum += profitFromDecidedBilhete(b);
    }
    return round2(sum);
  }, [bilhetes]);

  // =======================
  // ✅ EVOLUÇÃO MENSAL (LUCRO = bilhetes finalizados no mês)
  // =======================
  const monthlyStats = useMemo(() => {
    const keyMonth = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    const map: Record<string, { bets: number; decided: number; wins: number; profit: number }> = {};

    const ensure = (k: string) => {
      if (!map[k]) map[k] = { bets: 0, decided: 0, wins: 0, profit: 0 };
      return map[k];
    };

    // bets e winrate: por bilhete (você pode trocar para "criados" se preferir)
    for (const b of bilhetes) {
      const dt = getBilheteDecisionDate(b);
      if (!Number.isFinite(dt.getTime())) continue;

      const k = keyMonth(dt);
      const v = ensure(k);

      // conta bilhetes (todos) no mês pela data de decisão
      v.bets += 1;

      if (!isDecided(b.status)) continue;
      v.decided += 1;
      if (isWin(b.status)) v.wins += 1;

      // ✅ lucro só quando FINALIZA
      v.profit += profitFromDecidedBilhete(b);
    }

    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0])) // desc
      .map(([month, v]) => {
        const winRate = v.decided > 0 ? Math.round((v.wins / v.decided) * 1000) / 10 : 0;
        return { month, bets: v.bets, winRate, profit: round2(v.profit) };
      });
  }, [bilhetes]);

  const monthlyDelta = useMemo(() => {
    if (monthlyStats.length < 2) return null;
    const current = monthlyStats[0];
    const previous = monthlyStats[1];
    return {
      profit: round2(current.profit - previous.profit),
      winRate: Math.round((current.winRate - previous.winRate) * 10) / 10,
      bets: current.bets - previous.bets,
      currentMonth: current.month,
      previousMonth: previous.month,
    };
  }, [monthlyStats]);

  // =======================
  // ✅ RESUMO ANUAL (KPIs) usando profitAno CORRETO
  // =======================
  const annualSummary = useMemo(() => {
    const year = new Date().getFullYear();

    let winsAno = 0;
    let decidedAno = 0;

    for (const b of bilhetes) {
      if (!isDecided(b.status)) continue;
      const dt = getBilheteDecisionDate(b);
      if (!Number.isFinite(dt.getTime())) continue;
      if (dt.getFullYear() !== year) continue;

      decidedAno++;
      if (isWin(b.status)) winsAno++;
    }

    const winRateAno = decidedAno > 0 ? Math.round((winsAno / decidedAno) * 1000) / 10 : 0;
    const bilhetesDecididosAno = decidedAno;

    const lucroMedioPorBilhete =
      bilhetesDecididosAno > 0 ? round2(profitAno / bilhetesDecididosAno) : 0;

    return {
      year,
      profitAno,
      bilhetesAno: bilhetesDecididosAno,
      winRateAno,
      lucroMedioPorBilhete,
    };
  }, [bilhetes, profitAno]);

  // =======================
  // ✅ HEATMAP (lucro diário por bilhete decidido)
  // =======================
  const calendarHeatmap = useMemo(() => {
    const year = new Date().getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const toKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);

    const startSunday = new Date(start);
    startSunday.setDate(startSunday.getDate() - startSunday.getDay());

    const endSaturday = new Date(end);
    endSaturday.setDate(endSaturday.getDate() + (6 - endSaturday.getDay()));

    const values: Record<string, number> = {};
    for (let d = new Date(startSunday); d <= endSaturday; d.setDate(d.getDate() + 1)) {
      values[toKey(d)] = 0;
    }

    // ✅ lucro diário por decisão
    for (const b of bilhetes) {
      if (!isDecided(b.status)) continue;
      const dt = getBilheteDecisionDate(b);
      if (!Number.isFinite(dt.getTime())) continue;
      if (dt.getFullYear() !== year) continue;

      const d0 = new Date(dt);
      d0.setHours(0, 0, 0, 0);
      const k = toKey(d0);
      if (k in values) values[k] += profitFromDecidedBilhete(b);
    }

    const weeks: { date: Date; key: string; value: number; inYear: boolean }[][] = [];
    let cursor = new Date(startSunday);
    while (cursor <= endSaturday) {
      const week: any[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(cursor);
        const k = toKey(d);
        week.push({
          date: d,
          key: k,
          value: round2(values[k] ?? 0),
          inYear: d.getFullYear() === year,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    const absMax = Math.max(
      1,
      ...Object.entries(values)
        .filter(([k]) => k.startsWith(`${year}-`))
        .map(([, v]) => Math.abs(v))
    );

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const monthLabels: { weekIndex: number; label: string }[] = [];

    weeks.forEach((w, wi) => {
      const firstInYear = w.find((x) => x.inYear);
      if (!firstInYear) return;
      const d = firstInYear.date;
      if (d.getDate() <= 7) monthLabels.push({ weekIndex: wi, label: monthNames[d.getMonth()] });
    });

    return { weeks, absMax, monthLabels, year, todayKey };
  }, [bilhetes]);

  const heatClass = (v: number, absMax: number) => {
    if (v === 0) return "bg-gray-200 dark:bg-neutral-700";
    const r = Math.min(1, Math.abs(v) / absMax);
    const lvl = r < 0.25 ? 1 : r < 0.5 ? 2 : r < 0.75 ? 3 : 4;

    if (v > 0) {
      return lvl === 1 ? "bg-green-200"
        : lvl === 2 ? "bg-green-300"
          : lvl === 3 ? "bg-green-400"
            : "bg-green-500";
    }

    return lvl === 1 ? "bg-red-200"
      : lvl === 2 ? "bg-red-300"
        : lvl === 3 ? "bg-red-400"
          : "bg-red-500";
  };

  // =======================
  // UI helpers
  // =======================
  const panelClass =
    "relative overflow-hidden rounded-2xl border border-[#014a8f]/15 " +
    "bg-gradient-to-r from-[#014a8f]/10 via-white to-emerald-50 " +
    "dark:from-[#014a8f]/15 dark:via-neutral-950 dark:to-emerald-950/20 " +
    "p-6 shadow-xl shadow-blue-500/10";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[#014a8f]/15
          bg-gradient-to-r from-[#014a8f]/10 via-white to-emerald-50
          dark:from-[#014a8f]/15 dark:via-neutral-950 dark:to-emerald-950/20
          p-5 shadow-xl shadow-blue-500/10">
          <div className="relative">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Saldo e Movimentações
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Gerencie depósitos/saques e acompanhe desempenho.
            </p>
          </div>
        </div>

        <main className="pb-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
          {/* Saldo + Operação */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Saldo */}
            <div className={panelClass}>
              <div className="relative">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight">
                      Saldo atual
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Disponível para operar</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50/70 dark:bg-neutral-950/40 border border-gray-200/60 dark:border-neutral-800 px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Disponível
                    </span>
                    <span className="text-2xl font-extrabold text-gray-900 dark:text-white tabular-nums">
                      R$ {saldo.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Em aberto
                    </span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
                      R$ {saldoEmAposta.toFixed(2)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-200/70 dark:border-neutral-800 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Total
                    </span>
                    <span className="text-base font-extrabold text-[#014a8f] dark:text-white tabular-nums">
                      R$ {(saldo + saldoEmAposta).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Operação */}
            <div className={panelClass}>
              <div className="relative">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight">
                      Operação
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Depósito ou saque
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl bg-gray-50/70 dark:bg-neutral-950/40 border border-gray-200/60 dark:border-neutral-800 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <Button
                        variant={modo === "deposito" ? "default" : "outline"}
                        className={
                          modo === "deposito"
                            ? "bg-[#014a8f] hover:bg-[#003b70] text-white"
                            : "border-gray-200 dark:border-neutral-800"
                        }
                        onClick={() => setModo("deposito")}
                      >
                        Depósito
                      </Button>

                      <Button
                        variant={modo === "saque" ? "default" : "outline"}
                        className={
                          modo === "saque"
                            ? "bg-[#014a8f] hover:bg-[#003b70] text-white"
                            : "border-gray-200 dark:border-neutral-800"
                        }
                        onClick={() => setModo("saque")}
                      >
                        Saque
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <input
                        type="number"
                        value={valor || ""}
                        onChange={(e) => setValor(Number(e.target.value))}
                        placeholder="Valor em R$"
                        className="border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl px-3 py-2 text-sm w-full"
                      />

                      <Button
                        className="bg-[#014a8f] hover:bg-[#003b70] text-white w-full sm:w-auto"
                        onClick={handleTransacao}
                        disabled={loading}
                      >
                        {loading ? "Processando..." : modo === "deposito" ? "Depositar" : "Sacar"}
                      </Button>
                    </div>

                    {feedback && (
                      <div
                        className={`rounded-xl border px-4 py-2 text-sm ${/sucesso|realizado/i.test(feedback)
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
            </div>
          </div>

          {/* Gráfico + Resumo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolução Mensal */}
            <div className={panelClass}>
              <div className="relative">
                <div className="flex items-start sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                      Evolução Mensal
                    </h3>

                    {monthlyDelta && (
                      <p
                        className={`text-s font-semibold mt-1 ${(
                          (monthlyMetric === "profit" && monthlyDelta.profit >= 0) ||
                          (monthlyMetric === "winRate" && monthlyDelta.winRate >= 0) ||
                          (monthlyMetric === "bets" && monthlyDelta.bets >= 0)
                        )
                          ? "text-green-600"
                          : "text-red-600"
                          }`}
                      >
                        {monthlyMetric === "profit" && (
                          <>
                            {monthlyDelta.profit >= 0 ? "▲" : "▼"}{" "}
                            R$ {formatBRLCompact(Math.abs(monthlyDelta.profit))} x mês anterior
                          </>
                        )}
                        {monthlyMetric === "winRate" && (
                          <>
                            {monthlyDelta.winRate >= 0 ? "▲" : "▼"}{" "}
                            {Math.abs(monthlyDelta.winRate)} p.p. x mês anterior
                          </>
                        )}
                        {monthlyMetric === "bets" && (
                          <>
                            {monthlyDelta.bets >= 0 ? "▲" : "▼"}{" "}
                            {Math.abs(monthlyDelta.bets)} bilhetes x mês anterior
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={monthlyMetric === "profit" ? "default" : "outline"}
                      className={
                        monthlyMetric === "profit"
                          ? "bg-[#014a8f] hover:bg-[#003b70] text-white"
                          : "border-gray-200 dark:border-neutral-800"
                      }
                      onClick={() => setMonthlyMetric("profit")}
                    >
                      Lucro
                    </Button>

                    <Button
                      size="sm"
                      variant={monthlyMetric === "winRate" ? "default" : "outline"}
                      className={
                        monthlyMetric === "winRate"
                          ? "bg-[#014a8f] hover:bg-[#003b70] text-white"
                          : "border-gray-200 dark:border-neutral-800"
                      }
                      onClick={() => setMonthlyMetric("winRate")}
                    >
                      %Acerto
                    </Button>

                    <Button
                      size="sm"
                      variant={monthlyMetric === "bets" ? "default" : "outline"}
                      className={
                        monthlyMetric === "bets"
                          ? "bg-[#014a8f] hover:bg-[#003b70] text-white"
                          : "border-gray-200 dark:border-neutral-800"
                      }
                      onClick={() => setMonthlyMetric("bets")}
                    >
                      Bilhetes
                    </Button>
                  </div>
                </div>

                {monthlyStats.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 dark:border-neutral-800 bg-gray-50/60 dark:bg-neutral-950/40 px-4 py-10 text-center text-gray-500 text-sm">
                    Sem dados mensais ainda.
                  </div>
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
                                : ["auto", "auto"]
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
                            return [`${Math.round(n)}`, "Bilhetes"];
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
            </div>

            {/* Resumo anual + Heatmap */}
            <div className={panelClass}>
              <div className="relative">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#014a8f]/10 border border-[#014a8f]/15">
                      <ChartIcon />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight">
                        Resumo anual
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        KPIs + Lucro diário (bilhetes finalizados)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  <KPIBox
                    label="Lucro anual"
                    value={
                      <span className={annualSummary.profitAno >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                        {annualSummary.profitAno >= 0 ? "" : "-"}R$ {formatBRLCompact(Math.abs(annualSummary.profitAno))}
                      </span>
                    }
                    valueClass="text-[20px] sm:text-[22px]"
                  />

                  <KPIBox
                    label="Bilhetes"
                    value={annualSummary.bilhetesAno}
                    valueClass="text-[20px] sm:text-[22px]"
                  />

                  <KPIBox
                    label="Taxa acerto"
                    value={`${annualSummary.winRateAno.toFixed(0)}%`}
                    footer={
                      <div className="h-2 rounded-full bg-white/70 dark:bg-neutral-900/50 border border-gray-200/70 dark:border-neutral-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#014a8f]"
                          style={{ width: `${Math.max(0, Math.min(100, annualSummary.winRateAno))}%` }}
                        />
                      </div>
                    }
                    valueClass="text-[20px] sm:text-[22px]"
                  />

                  <KPIBox
                    label="Lucro por bilhete"
                    value={
                      <span className={annualSummary.lucroMedioPorBilhete >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                        {annualSummary.lucroMedioPorBilhete >= 0 ? "" : "-"}R$ {formatBRLCompact(Math.abs(annualSummary.lucroMedioPorBilhete))}
                      </span>
                    }
                    valueClass="text-[20px] sm:text-[22px]"
                  />
                </div>

                {/* Heatmap */}
                <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950/40 p-4">
                  <div className="w-full flex justify-center">
                    <div className="rounded-2xl border border-[#014a8f]/10 bg-white/80 dark:bg-neutral-950/50 px-4 py-3 shadow-sm max-w-full">
                      <div className="flex justify-center">
                        <div className="max-w-[680px] w-full overflow-hidden [scrollbar-width:thin]">
                          <div
                            className="grid origin-top-left"
                            style={{
                              transform: "scale(var(--s))",
                              ["--s" as any]: "0.92",
                              gridAutoFlow: "column",
                              gridTemplateRows: "repeat(7, 12px)",
                              gridAutoColumns: "12px",
                              gap: "2px",
                            }}
                          >
                            {calendarHeatmap.weeks.map((week) =>
                              week.map((day) => {
                                const opacity = day.inYear ? "opacity-100" : "opacity-30";
                                const title = `${day.date.toLocaleDateString("pt-BR")} — ${formatBRL(day.value)}`;
                                const isToday = day.key === calendarHeatmap.todayKey;

                                return (
                                  <div
                                    key={day.key}
                                    title={title}
                                    className={[
                                      "rounded-[3px]",
                                      opacity,
                                      heatClass(day.value, calendarHeatmap.absMax),
                                      isToday
                                        ? "ring-2 ring-[#014a8f]/35 ring-offset-2 ring-offset-white dark:ring-offset-neutral-950"
                                        : "",
                                    ].join(" ")}
                                  />
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                        <span>{calendarHeatmap.year}</span>

                        <div className="flex items-center gap-2">
                          <span>Menos</span>
                          <div className="flex items-center gap-[2px]">
                            <span className="w-3 h-3 rounded-[3px] bg-gray-200 dark:bg-neutral-700" />
                            <span className="w-3 h-3 rounded-[3px] bg-green-200" />
                            <span className="w-3 h-3 rounded-[3px] bg-green-300" />
                            <span className="w-3 h-3 rounded-[3px] bg-green-400" />
                            <span className="w-3 h-3 rounded-[3px] bg-green-500" />
                          </div>
                          <span>Mais</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Histórico de Movimentações (igual ao seu) */}
          <div className="relative overflow-hidden rounded-2xl border border-[#014a8f]/15 bg-gradient-to-r from-[#014a8f]/10 via-white to-emerald-50 dark:from-[#014a8f]/15 dark:via-neutral-950 dark:to-emerald-950/20 p-5 shadow-xl shadow-blue-500/10">
            <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#014a8f]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-500/10" />

            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                    Histórico de Movimentações
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Últimas movimentações financeiras registradas
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl border border-[#014a8f]/20 bg-white/70 dark:bg-neutral-900/60 px-3 py-2">
                  <span className="text-[11px] font-semibold text-[#014a8f]">
                    Últimas
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {Math.min(5, extrato.length)}/{extrato.length || 0}
                  </span>
                </div>
              </div>

              {extrato.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-neutral-800 bg-white/60 dark:bg-neutral-950/40 px-4 py-10 text-center text-gray-600 dark:text-gray-300">
                  Nenhuma movimentação registrada.
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-2xl border border-[#014a8f]/15 bg-white/70 dark:bg-neutral-950/30 backdrop-blur">
                    <table className="w-full text-sm">
                      <thead className="bg-white/70 dark:bg-neutral-900/60 border-b border-[#014a8f]/10">
                        <tr className="text-left">
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">
                            Data
                          </th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">
                            Tipo
                          </th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 text-right">
                            Valor
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {extrato.slice(0, 5).map((m) => {
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
                              className="border-b last:border-b-0 border-[#014a8f]/10 dark:border-white/10"
                            >
                              <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                                {parseDbDate(m.data_movimentacao).toLocaleString("pt-BR")}
                              </td>

                              <td className="px-4 py-3">
                                <span className="inline-flex items-center rounded-xl border border-[#014a8f]/20 bg-white/60 dark:bg-neutral-900/50 px-3 py-1 text-xs font-semibold text-[#014a8f]">
                                  {tipoLabel}
                                </span>
                              </td>

                              <td
                                className={`px-4 py-3 text-right font-extrabold tabular-nums ${isPositive ? "text-green-600" : "text-red-600"
                                  }`}
                              >
                                {isPositive ? "+" : "-"} R$ {Math.abs(Number(m.valor || 0)).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="ghost"
                      className="text-[#014a8f] hover:bg-white/40 dark:hover:bg-neutral-900/40 rounded-xl"
                      onClick={() => setShowFullHistory(true)}
                    >
                      Ver histórico completo
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Modal histórico completo */}
          <Dialog open={showFullHistory} onOpenChange={setShowFullHistory}>
            <DialogContent className="max-w-5xl w-[94vw] sm:w-full p-0 overflow-hidden">
              <div className="p-5 border-b border-gray-200 dark:border-neutral-800">
                <DialogHeader>
                  <DialogTitle className="text-[#014a8f] text-xl font-extrabold">
                    Histórico completo
                  </DialogTitle>
                </DialogHeader>

                <p className="text-xs text-gray-500 mt-1">
                  Mostrando{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {extrato.length}
                  </span>{" "}
                  movimentações.
                </p>
              </div>

              <div className="p-5 max-h-[78vh] overflow-auto bg-gray-50/60 dark:bg-neutral-950">
                {extrato.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-10 text-center text-gray-500 text-sm">
                    Nenhuma movimentação registrada.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-[#014a8f]/15 bg-white dark:bg-neutral-900">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-[#014a8f]/10">
                        <tr className="text-left">
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">
                            Data
                          </th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">
                            Tipo
                          </th>
                          <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 text-right">
                            Valor
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {[...extrato]
                          .sort(
                            (a, b) =>
                              parseDbDate(b.data_movimentacao).getTime() -
                              parseDbDate(a.data_movimentacao).getTime()
                          )
                          .map((m) => {
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
                                className="border-b last:border-b-0 border-gray-200 dark:border-neutral-800"
                              >
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                                  {parseDbDate(m.data_movimentacao).toLocaleString("pt-BR")}
                                </td>

                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center rounded-xl border border-[#014a8f]/20 bg-[#014a8f]/5 px-3 py-1 text-xs font-semibold text-[#014a8f]">
                                    {tipoLabel}
                                  </span>
                                </td>

                                <td
                                  className={`px-4 py-3 text-right font-extrabold tabular-nums ${isPositive ? "text-green-600" : "text-red-600"
                                    }`}
                                >
                                  {isPositive ? "+" : "-"} R$ {Math.abs(Number(m.valor || 0)).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-end bg-white dark:bg-neutral-900">
                <Button
                  className="bg-[#014a8f] hover:bg-[#003b70] text-white h-9"
                  onClick={() => setShowFullHistory(false)}
                >
                  Fechar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
