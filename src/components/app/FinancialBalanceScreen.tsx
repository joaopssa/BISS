"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import { useFinance } from "@/contexts/FinanceContext";
// Importações necessárias para o gráfico
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from "recharts";

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

  // --- States do Gráfico ---
  const [chartPeriodDays, setChartPeriodDays] = useState<number>(7); // Padrão 7 dias

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

  // --- LÓGICA DO GRÁFICO ---
  const chartData = useMemo(() => {
    // Helper para gerar chave de data no fuso local (YYYY-MM-DD)
    const toLocalDateKey = (d: Date) => {
      const Y = d.getFullYear();
      const M = String(d.getMonth() + 1).padStart(2, "0");
      const D = String(d.getDate()).padStart(2, "0");
      return `${Y}-${M}-${D}`;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Gerar um array com os últimos N dias (chaves locais)
    const days: string[] = [];
    for (let i = chartPeriodDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(toLocalDateKey(d));
    }

    // Criar mapa inicial com zeros
    const dataMap: Record<string, number> = {};
    days.forEach(day => { dataMap[day] = 0; });

    // Preencher com prêmios do extrato
    extrato.forEach(m => {
      if (m.tipo !== 'premio') return;
      const mDate = new Date(m.data_movimentacao);
      const key = toLocalDateKey(mDate);

      if (dataMap.hasOwnProperty(key)) {
        const val = Number(m.valor) || 0;
        dataMap[key] += val;
      }
    });

    // Subtrair stakes de bilhetes perdidos usando a data do bilhete
    bilhetes.forEach(b => {
      const st = (b.status || '').toString().toLowerCase();
      if (st !== 'perdido' && st !== 'perdida') return;
      const dt = new Date(b.data_criacao || b.createdAt || b.data_registro || Date.now());
      const key = toLocalDateKey(dt);
      if (dataMap.hasOwnProperty(key)) {
        dataMap[key] -= Number(b.stake_total || b.stake || 0) || 0;
      }
    });

    // Converter para array para o Recharts
    return days.map(dateStr => {
      const [year, month, day] = dateStr.split('-');
      return {
        date: `${day}/${month}`,
        fullDate: dateStr,
        lucro: dataMap[dateStr] || 0
      };
    });
  }, [extrato, chartPeriodDays, bilhetes]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      return (
        <div className="bg-white dark:bg-neutral-800 p-2 border border-gray-200 dark:border-neutral-700 rounded shadow-lg text-sm">
          <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
          <p className={`${val >= 0 ? 'text-green-600' : 'text-red-600'} font-bold`}>
            {val >= 0 ? 'Lucro: ' : 'Prejuízo: '} 
            R$ {Math.abs(val).toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <header className="bg-[#014a8f] text-white p-4 shadow">
        <h1 className="text-xl font-bold">Saldo e Movimentações</h1>
      </header>

      <main className="p-6 space-y-6">
        {/* ... Restante da tela (Saldo, Operações, Histórico) ... */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow p-6 space-y-4">
          <h2 className="text-xl font-bold text-[#014a8f]">Saldo atual</h2>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Disponível</p>
            <h2 className="text-3xl font-bold text-[#014a8f]">R$ {saldo.toFixed(2)}</h2>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow p-4 space-y-4">
          <h2 className="text-lg font-semibold">Operação</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2">
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
              className="border rounded-md px-3 py-2 text-sm w-full sm:w-40"
            />
            <Button
              className="bg-[#014a8f] hover:bg-[#003b70] text-white"
              onClick={handleTransacao}
              disabled={loading}
            >
              {loading ? "Processando..." : modo === "deposito" ? "Depositar" : "Sacar"}
            </Button>
          </div>
          {feedback && (
            <div className={`rounded-lg border px-4 py-2 text-sm ${/sucesso|realizado/i.test(feedback) ? "bg-green-50 border-green-200 text-green-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
              {feedback}
            </div>
          )}
        </div>
        {/* CARD META */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800">
          
          {!savedGoal ? (
            <div className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 bg-blue-100 rounded-full">
                  <TrendingUpIcon />
                </div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Definir Nova Meta</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                    Valor Alvo (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={goalValue === "" ? "" : goalValue}
                    onChange={(e) => setGoalValue(e.target.value === "" ? "" : Number(e.target.value))}
                    className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-blue-500 outline-none dark:bg-neutral-800 dark:border-neutral-700"
                    placeholder="Ex: 5000.00"
                  />
                </div>

                <div className="relative" ref={dropdownRef}>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                    Prazo para conquistar
                  </label>
                  
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-300 rounded-lg bg-white dark:bg-neutral-800 dark:border-neutral-700 text-left hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 transition-colors"
                    onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      {goalPeriod === "1_semana" && "1 semana"}
                      {goalPeriod === "2_semanas" && "2 semanas"}
                      {goalPeriod === "1_mes" && "1 mês"}
                      {goalPeriod === "6_meses" && "6 meses"}
                      {goalPeriod === "1_ano" && "1 ano"}
                      {goalPeriod === "personalizado" && "Personalizado"}
                    </span>
                    <svg className={`h-4 w-4 text-gray-500 transition-transform ${showPeriodDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showPeriodDropdown && (
                    <div className="absolute z-50 mt-2 w-full bg-white dark:bg-neutral-900 border dark:border-neutral-700 rounded-lg shadow-2xl p-3 animate-in fade-in zoom-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {[
                          ["1_semana", "1 semana"],
                          ["2_semanas", "2 semanas"],
                          ["1_mes", "1 mês"],
                          ["6_meses", "6 meses"],
                          ["1_ano", "1 ano"],
                          ["personalizado", "Personalizado"],
                        ].map(([value, label]) => (
                          <label key={String(value)} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-neutral-800 p-2 rounded transition-colors">
                            <input
                              type="radio"
                              name="goalPeriod"
                              value={String(value)}
                              checked={goalPeriod === value}
                              onChange={() => {
                                setGoalPeriod(value as any);
                                if (value !== "personalizado") {
                                  setShowPeriodDropdown(false);
                                }
                              }}
                              className="accent-[#014a8f] w-4 h-4"
                            />
                            <span className="dark:text-gray-200">{label}</span>
                          </label>
                        ))}
                      </div>
                      
                      {goalPeriod === "personalizado" && (
                        <div className="mt-3 pt-3 border-t dark:border-neutral-700">
                          <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide block mb-1.5">
                            Selecione a Data Final
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full dark:bg-neutral-800 dark:border-neutral-600"
                            />
                            <Button 
                                size="icon"
                                className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                                onClick={() => setShowPeriodDropdown(false)}
                                title="Confirmar Data"
                            >
                                <CheckIcon />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button className="bg-[#014a8f] hover:bg-[#003b70] text-white w-full sm:w-auto shadow-md" onClick={handleSaveGoal}>
                  Salvar Meta
                </Button>
              </div>
            </div>
          ) : (
            /* MODO DE VISUALIZAÇÃO (Meta Salva) */
            <div>
              <div className="bg-gradient-to-r from-[#014a8f] to-[#003b70] p-6 text-white relative overflow-hidden rounded-t-xl">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl pointer-events-none"></div>
                
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm border border-white/10 shadow-inner">
                      <TargetIcon />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold leading-tight">Meta Ativa</h2>
                      <p className="text-blue-100 text-xs opacity-90">Continue investindo para alcançar</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-200 uppercase font-bold tracking-wider">Objetivo</p>
                    <p className="text-2xl font-bold text-white shadow-black drop-shadow-sm">
                      R$ {Number(savedGoal.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-neutral-900 rounded-b-xl">
                
                <div className="mb-8">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                      <TrendingUpIcon /> Progresso
                    </span>
                    <span className="text-2xl font-bold text-[#014a8f] dark:text-blue-400">
                      {calculateProgress().toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="h-3.5 bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden shadow-inner border border-gray-100 dark:border-neutral-700">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-[#014a8f] transition-all duration-1000 ease-out relative"
                      style={{ width: `${calculateProgress()}%` }}
                    >
                      <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div className="mt-1.5 flex justify-between text-xs text-gray-500">
                    <span>R$ 0,00</span>
                    <span>Saldo atual: R$ {saldo.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-xl border border-gray-100 dark:border-neutral-700 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <CalendarIcon />
                      <span className="text-xs font-bold uppercase tracking-wide">Data Alvo</span>
                    </div>
                    <p className="font-bold text-gray-800 dark:text-white text-lg">
                      {savedGoal.endDate ? new Date(savedGoal.endDate).toLocaleDateString("pt-BR") : "—"}
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                      <ClockIcon />
                      <span className="text-xs font-bold uppercase tracking-wide">Tempo Restante</span>
                    </div>
                    <p className="font-bold text-blue-800 dark:text-blue-300 text-lg">
                      {calculateDaysRemaining()} dias
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-gray-200 hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    onClick={() => {
                      setGoalValue(Number(savedGoal.value));
                      setGoalPeriod(savedGoal.period || "1_mes");
                      setCustomEndDate(savedGoal.customEndDate || "");
                      setShowPeriodDropdown(true);
                      setGoalFeedback(null);
                      setSavedGoal(null);
                    }}
                  >
                    Editar Meta
                  </Button>
                 <button
                    onClick={handleClearGoal}
                    className="text-gray-500 hover:text-red-500 transition p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Excluir meta"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M5 6l1 14h12l1-14" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {goalFeedback && !savedGoal && (
            <div className="p-3 mx-6 mb-6 text-center rounded-lg bg-blue-50 text-blue-700 text-sm border border-blue-100">
              {goalFeedback}
            </div>
          )}
        </div>

        {/* --- NOVO CARD: GRÁFICO DE DESEMPENHO --- */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                        <ChartIcon />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Desempenho de Apostas</h2>
                        <p className="text-xs text-gray-500">Prêmios - Apostas (Lucro líquido)</p>
                    </div>
                </div>

                <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-lg self-start">
                    {[
                        { label: '7 dias', val: 7 },
                        { label: '15 dias', val: 15 },
                        { label: '30 dias', val: 30 }
                    ].map((opt) => (
                        <button
                            key={opt.val}
                            onClick={() => setChartPeriodDays(opt.val)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                chartPeriodDays === opt.val
                                    ? 'bg-white dark:bg-neutral-700 shadow-sm text-indigo-600 dark:text-indigo-300'
                                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#6B7280' }} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#6B7280' }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', opacity: 0.4 }} />
                        <ReferenceLine y={0} stroke="#9CA3AF" />
                        <Bar dataKey="lucro" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.lucro >= 0 ? '#16a34a' : '#dc2626'} 
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        

        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Histórico de Movimentações</h2>
          {extrato.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">Nenhuma movimentação registrada.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Data</th>
                  <th className="py-2">Tipo</th>
                  <th className="py-2">Valor</th>
                  <th className="py-2">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {extrato.map((m) => (
                  <tr key={m.id_movimentacao} className="border-b">
                    <td className="py-2">{new Date(m.data_movimentacao).toLocaleString("pt-BR")}</td>
                    <td>{m.tipo}</td>
                    <td
                      className={
                        m.tipo === "deposito" || m.tipo === "premio"
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {(m.tipo === "deposito" || m.tipo === "premio") ? "+" : "-"} R$ {m.valor.toFixed(2)}
                    </td>
                    <td>{m.descricao || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}