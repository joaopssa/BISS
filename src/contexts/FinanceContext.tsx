"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

type Movimentacao = {
  id_movimentacao: number;
  tipo: "deposito" | "saque" | "aposta" | "premio" | "ajuste";
  valor: number;
  descricao?: string;
  data_movimentacao: string;
};

type FinanceContextType = {
  extrato: Movimentacao[];
  setExtrato: (extrato: Movimentacao[]) => void;
  refreshExtrato: () => void;
  refreshTrigger: number;
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [extrato, setExtrato] = useState<Movimentacao[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshExtrato = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <FinanceContext.Provider value={{ extrato, setExtrato, refreshExtrato, refreshTrigger }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance deve ser usado dentro de FinanceProvider');
  }
  return context;
};
