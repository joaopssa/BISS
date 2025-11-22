import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

<<<<<<< Updated upstream
export const FinancialBalanceScreen: React.FC = () => {
  const [projectionPeriod, setProjectionPeriod] = useState<string>('1 semana');
  const [showChart, setShowChart] = useState(false);

  const balance = {
    current: 2450.75,
    baseProjection: 2890.0,
=======
import React, { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
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
  const [saldo, setSaldo] = useState<number>(0);
  const [extrato, setExtrato] = useState<Movimentacao[]>([]);
  const [valor, setValor] = useState<number>(0);
  const [modo, setModo] = useState<"deposito" | "saque">("deposito");
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  
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
>>>>>>> Stashed changes
  };

  // Dados para o gráfico de projeção
  const projectionData = useMemo(
    () => [
      { name: 'Atual', value: balance.current },
      { name: '1 semana', value: balance.baseProjection },
      {
        name: '1 mês',
        value: balance.current + (balance.baseProjection - balance.current) * 4,
      },
      {
        name: '6 meses',
        value: balance.current + (balance.baseProjection - balance.current) * 24,
      },
      {
        name: '1 ano',
        value: balance.current + (balance.baseProjection - balance.current) * 52,
      },
    ],
    [balance.current, balance.baseProjection]
  );

  // Dados fictícios do extrato (MANTIDOS EXATAMENTE COMO ESTAVAM)
  const financialStatement = [
    {
      id: 1,
      type: 'deposit' as const,
      amount: 500.0,
      description: 'Depósito via PIX',
      date: '2024-06-03',
      time: '09:12',
      method: 'PIX',
    },
    {
      id: 2,
      type: 'withdrawal' as const,
      amount: -300.0,
      description: 'Saque para conta bancária',
      date: '2024-06-04',
      time: '14:30',
      method: 'TED',
    },
  ];

<<<<<<< Updated upstream
  const selectedPoint = useMemo(
    () => projectionData.find((p) => p.name === projectionPeriod) ?? projectionData[1],
    [projectionData, projectionPeriod]
  );

  const growth = selectedPoint.value - balance.current;
  const growthPct = (growth / balance.current) * 100;
=======
  useEffect(() => {
    fetchSaldo();
    fetchExtrato();
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
    const profit = extrato.reduce((acc, m) => {
      if (m.tipo === 'premio') return acc + Number(m.valor || 0);
      if (m.tipo === 'aposta') return acc - Number(m.valor || 0);
      return acc;
    }, 0);
    const p = (profit / Number(savedGoal.value)) * 100;
    return Math.min(100, Math.max(0, p));
  };

  const calculateDaysRemaining = () => {
    if (!savedGoal || !savedGoal.endDate) return 0;
    const d = new Date(savedGoal.endDate);
    const diff = Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };
>>>>>>> Stashed changes

  // --- LÓGICA DO GRÁFICO ---
  const chartData = useMemo(() => {
    const today = new Date();
    // Normalizar hoje para 00:00 para comparações justas
    today.setHours(0, 0, 0, 0);

    // Gerar um array com os últimos N dias
    const days: string[] = [];
    for (let i = chartPeriodDays - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        // Formato ISO string YYYY-MM-DD para usar como chave
        days.push(d.toISOString().split('T')[0]);
    }

    // Criar mapa inicial com zeros
    const dataMap: Record<string, number> = {};
    days.forEach(day => { dataMap[day] = 0; });

    // Preencher com os dados do extrato
    extrato.forEach(m => {
        // Apenas 'premio' e 'aposta' contam para o desempenho
        if (m.tipo !== 'premio' && m.tipo !== 'aposta') return;
        
        // Pega data YYYY-MM-DD da movimentação
        const mDate = new Date(m.data_movimentacao);
        const key = mDate.toISOString().split('T')[0];

        if (dataMap.hasOwnProperty(key)) {
            const val = Number(m.valor);
            if (m.tipo === 'premio') {
                dataMap[key] += val;
            } else if (m.tipo === 'aposta') {
                dataMap[key] -= val;
            }
        }
    });

    // Converter para array para o Recharts
    return days.map(dateStr => {
        const [year, month, day] = dateStr.split('-');
        return {
            date: `${day}/${month}`, // Formato para o eixo X
            fullDate: dateStr,
            lucro: dataMap[dateStr]
        };
    });
  }, [extrato, chartPeriodDays]);

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
<<<<<<< Updated upstream
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Saldo & Projeções</h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <DollarSign className="w-4 h-4" />
            R$ {balance.current.toFixed(2)}
          </Badge>
          {growth >= 0 ? (
            <Badge className="gap-1">
              <TrendingUp className="w-4 h-4" />
              {growthPct.toFixed(1)}%
            </Badge>
=======
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <header className="bg-[#014a8f] text-white p-4 shadow">
        <h1 className="text-xl font-bold">Saldo e Movimentações</h1>
      </header>

      <main className="p-6 space-y-6">
        
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
>>>>>>> Stashed changes
          ) : (
            <Badge variant="destructive" className="gap-1">
              <TrendingDown className="w-4 h-4" />
              {growthPct.toFixed(1)}%
            </Badge>
          )}
        </div>
      </div>

<<<<<<< Updated upstream
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Projeção de saldo</CardTitle>
          <div className="flex items-center gap-2">
            <select
              className="border rounded-xl px-3 py-1 text-sm"
              value={projectionPeriod}
              onChange={(e) => setProjectionPeriod(e.target.value)}
=======
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

        {/* ... Restante da tela (Saldo, Operações, Histórico) ... */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow p-6 space-y-4">
          <h2 className="text-xl font-bold text-[#014a8f]">Saldo atual</h2>

          <div className="border-t pt-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Disponível</p>
              <h2 className="text-3xl font-bold text-[#014a8f]">R$ {saldo.toFixed(2)}</h2>
            </div>
            <div className="ml-auto">
              <Button
                onClick={() => { fetchSaldo(); fetchExtrato(); }}
                className="bg-[#014a8f] hover:bg-[#003b70] text-white"
              >
                Atualizar
              </Button>
            </div>
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
>>>>>>> Stashed changes
            >
              <option>1 semana</option>
              <option>1 mês</option>
              <option>6 meses</option>
              <option>1 ano</option>
            </select>
            <Button variant="outline" onClick={() => setShowChart((v) => !v)}>
              {showChart ? 'Ocultar gráfico' : 'Mostrar gráfico'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showChart ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  <Line type="monotone" dataKey="value" dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="w-4 h-4" />
              Gráfico oculto. Clique em “Mostrar gráfico” para visualizar.
            </div>
          )}
          <div className="mt-4 text-sm">
            Projeção selecionada ({projectionPeriod}):{' '}
            <span className="font-medium">R$ {selectedPoint.value.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Extrato recente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {financialStatement.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center border rounded-xl p-3"
            >
              <div className="flex items-center gap-2">
                {item.type === 'deposit' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {item.type === 'deposit' ? 'Entrada' : 'Saída'}
                </span>
              </div>
              <div className="text-sm md:text-base">
                {item.description} • {item.method}
              </div>
              <div className="text-sm text-muted-foreground">
                {item.date} {item.time}
              </div>
              <div
                className={`text-right font-semibold ${
                  item.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {item.amount >= 0 ? '+' : '-'} R$ {Math.abs(item.amount).toFixed(2)}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="w-3 h-3" />
            Valores meramente ilustrativos.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialBalanceScreen;