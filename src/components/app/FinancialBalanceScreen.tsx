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

export const FinancialBalanceScreen: React.FC = () => {
  const [projectionPeriod, setProjectionPeriod] = useState<string>('1 semana');
  const [showChart, setShowChart] = useState(false);

  const balance = {
    current: 2450.75,
    baseProjection: 2890.0,
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

  const selectedPoint = useMemo(
    () => projectionData.find((p) => p.name === projectionPeriod) ?? projectionData[1],
    [projectionData, projectionPeriod]
  );

  const growth = selectedPoint.value - balance.current;
  const growthPct = (growth / balance.current) * 100;

  return (
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
          ) : (
            <Badge variant="destructive" className="gap-1">
              <TrendingDown className="w-4 h-4" />
              {growthPct.toFixed(1)}%
            </Badge>
          )}
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Projeção de saldo</CardTitle>
          <div className="flex items-center gap-2">
            <select
              className="border rounded-xl px-3 py-1 text-sm"
              value={projectionPeriod}
              onChange={(e) => setProjectionPeriod(e.target.value)}
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