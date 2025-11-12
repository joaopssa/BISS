// src/components/app/BettingHistoryScreen.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";

type Aposta = {
  id_aposta: number;
  campeonato: string;
  partida: string;
  mercado: string;
  selecao: string;
  odd: number;
  valor_apostado: number;
  possivel_retorno: number;
  status_aposta: "pendente" | "ganha" | "perdida" | "cancelada";
  data_registro: string;
};

export default function BettingHistoryScreen() {
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  const fetchHistorico = async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await api.get("/apostas/historico");
      const data = Array.isArray(res.data) ? res.data : [];

      const mapped: Aposta[] = data.map((a: any) => ({
        id_aposta: a.id_aposta ?? a.id ?? 0,
        campeonato: a.campeonato || "—",
        partida: a.partida || "—",
        mercado: a.mercado || "—",
        selecao: a.selecao || "—",
        odd: Number(a.odd) || 0,
        valor_apostado: Number(a.valor_apostado) || 0,
        possivel_retorno: Number(a.possivel_retorno) || 0,
        status_aposta: a.status_aposta || "pendente",
        data_registro: a.data_registro || new Date().toISOString(),
      }));

      setApostas(mapped);
    } catch (err: any) {
      console.error(err);
      setErro("Erro ao carregar histórico de apostas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorico();
  }, []);

  const getStatusStyle = (status: Aposta["status_aposta"]) => {
    switch (status) {
      case "ganha":
        return "text-green-600 bg-green-50 border-green-200";
      case "perdida":
        return "text-red-600 bg-red-50 border-red-200";
      case "cancelada":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <header className="bg-[#014a8f] text-white p-4 shadow">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Histórico de Apostas</h1>
          <Button
            onClick={fetchHistorico}
            className="bg-white text-[#014a8f] hover:bg-gray-100 text-sm"
          >
            Atualizar
          </Button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {loading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-300">
            Carregando apostas...
          </div>
        ) : erro ? (
          <div className="text-center py-8 text-red-600">{erro}</div>
        ) : apostas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma aposta registrada até o momento.
          </div>
        ) : (
          <div className="space-y-4">
            {apostas.map((a) => (
              <div
                key={a.id_aposta}
                className={`border rounded-xl p-4 bg-white dark:bg-neutral-900 shadow-sm ${getStatusStyle(
                  a.status_aposta
                )}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm">
                    {a.partida}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(a.data_registro).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  {a.campeonato}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs">Mercado</span>
                    <div>{a.mercado}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Seleção</span>
                    <div className="font-medium">{a.selecao}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Odd</span>
                    <div>{a.odd.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Valor Apostado</span>
                    <div>R$ {a.valor_apostado.toFixed(2)}</div>
                  </div>
                </div>
                <div className="mt-2 flex justify-between items-center text-sm">
                  <div>
                    <span className="text-gray-500 text-xs">Retorno Potencial</span>{" "}
                    <span className="font-semibold">
                      R$ {a.possivel_retorno.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs font-semibold uppercase border px-2 py-0.5 rounded-full">
                    {a.status_aposta}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
