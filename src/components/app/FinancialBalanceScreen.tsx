// src/components/app/FinancialBalanceScreen.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";

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

  const fetchSaldo = async () => {
    try {
      const res = await api.get("/financeiro/saldo");
      const s = typeof res.data?.saldo === "number" ? res.data.saldo : 0;
      setSaldo(s);
    } catch {
      setFeedback("Erro ao carregar saldo.");
    }
  };

  const fetchExtrato = async () => {
    try {
      const res = await api.get("/financeiro/extrato");
      const data = Array.isArray(res.data) ? res.data : [];
      const mapped: Movimentacao[] = data.map((m: any) => ({
        id_movimentacao: m.id_movimentacao ?? m.id ?? 0,
        tipo: m.tipo,
        valor: Number(m.valor) || 0,
        descricao: m.descricao || "",
        data_movimentacao: m.data_movimentacao || new Date().toISOString(),
      }));
      setExtrato(mapped);
    } catch {
      setFeedback("Erro ao carregar extrato.");
    }
  };

  useEffect(() => {
    fetchSaldo();
    fetchExtrato();
  }, []);

  const handleTransacao = async () => {
    if (!valor || valor <= 0) {
      setFeedback("Informe um valor válido para a operação.");
      return;
    }
    if (modo === "saque" && valor > saldo) {
      setFeedback("Saldo insuficiente para saque.");
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const endpoint =
        modo === "deposito" ? "/financeiro/deposito" : "/financeiro/saque";
      await api.post(endpoint, { valor });

      setFeedback(
        modo === "deposito"
          ? `Depósito de R$ ${valor.toFixed(2)} realizado com sucesso!`
          : `Saque de R$ ${valor.toFixed(2)} realizado com sucesso!`
      );

      setValor(0);
      await fetchSaldo();
      await fetchExtrato();
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Erro na operação.";
      setFeedback(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <header className="bg-[#014a8f] text-white p-4 shadow">
        <h1 className="text-xl font-bold">Saldo e Movimentações</h1>
      </header>

      <main className="p-6 space-y-6">
        {/* SALDO ATUAL */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Saldo atual</p>
            <h2 className="text-3xl font-bold text-[#014a8f]">
              R$ {saldo.toFixed(2)}
            </h2>
          </div>
          <Button
            onClick={() => {
              fetchSaldo();
              fetchExtrato();
            }}
            className="bg-[#014a8f] hover:bg-[#003b70] text-white"
          >
            Atualizar
          </Button>
        </div>

        {/* DEPÓSITO / SAQUE */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow p-4 space-y-4">
          <h2 className="text-lg font-semibold">Operação</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex gap-2">
              <Button
                variant={modo === "deposito" ? "default" : "outline"}
                className={`${
                  modo === "deposito"
                    ? "bg-[#014a8f] hover:bg-[#003b70] text-white"
                    : ""
                }`}
                onClick={() => setModo("deposito")}
              >
                Depósito
              </Button>
              <Button
                variant={modo === "saque" ? "default" : "outline"}
                className={`${
                  modo === "saque"
                    ? "bg-[#014a8f] hover:bg-[#003b70] text-white"
                    : ""
                }`}
                onClick={() => setModo("saque")}
              >
                Saque
              </Button>
            </div>
            <input
              type="number"
              min={0}
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
              {loading
                ? "Processando..."
                : modo === "deposito"
                ? "Depositar"
                : "Sacar"}
            </Button>
          </div>

          {feedback && (
            <div
              className={`rounded-lg border px-4 py-2 text-sm ${
                /sucesso|realizado/i.test(feedback)
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              }`}
            >
              {feedback}
            </div>
          )}
        </div>

        {/* HISTÓRICO / EXTRATO */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Histórico de Movimentações</h2>

          {extrato.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">
              Nenhuma movimentação registrada.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-neutral-700">
                  <th className="py-2">Data</th>
                  <th className="py-2">Tipo</th>
                  <th className="py-2">Valor</th>
                  <th className="py-2">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {extrato.map((m) => (
                  <tr
                    key={m.id_movimentacao}
                    className="border-b border-gray-100 dark:border-neutral-800"
                  >
                    <td className="py-2 text-gray-500">
                      {new Date(m.data_movimentacao).toLocaleString("pt-BR")}
                    </td>
                    <td className="capitalize">
                      {m.tipo === "deposito"
                        ? "Depósito"
                        : m.tipo === "saque"
                        ? "Saque"
                        : m.tipo === "aposta"
                        ? "Aposta"
                        : m.tipo === "premio"
                        ? "Prêmio"
                        : "Ajuste"}
                    </td>
                    <td
                      className={`font-semibold ${
                        m.tipo === "deposito" || m.tipo === "premio"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {m.tipo === "deposito" || m.tipo === "premio" ? "+" : "-"} R${" "}
                      {m.valor.toFixed(2)}
                    </td>
                    <td className="text-gray-600 dark:text-gray-400">
                      {m.descricao || "—"}
                    </td>
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
