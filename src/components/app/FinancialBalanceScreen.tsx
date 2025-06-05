import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, PiggyBank } from 'lucide-react';

export const FinancialBalanceScreen: React.FC = () => {
  const balance = {
    current: 2450.75,
    initial: 2000.00,
    profit: 450.75,
    profitPercentage: 22.5,
    monthlyAverage: 187.50,
    projection: 2890.00
  };

  const transactions = [
    {
      id: 1,
      type: 'win',
      amount: 127.50,
      description: 'Flamengo x Corinthians - Casa',
      date: '2024-06-04',
      time: '18:45'
    },
    {
      id: 2,
      type: 'loss',
      amount: -75.00,
      description: 'Barcelona x Real Madrid - Over 2.5',
      date: '2024-06-03',
      time: '16:30'
    },
    {
      id: 3,
      type: 'win',
      amount: 89.25,
      description: 'Manchester City x Liverpool - Casa',
      date: '2024-06-02',
      time: '14:00'
    },
    {
      id: 4,
      type: 'loss',
      amount: -50.00,
      description: 'PSG x Marseille - Fora',
      date: '2024-06-01',
      time: '21:00'
    },
    {
      id: 5,
      type: 'win',
      amount: 156.80,
      description: 'Bayern x Dortmund - Over 1.5',
      date: '2024-05-31',
      time: '15:30'
    }
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Balanço Financeiro</h1>
          <p className="text-blue-600 flex items-center gap-1">
            <PiggyBank className="w-4 h-4" />
            Gestão inteligente de bankroll
          </p>
        </div>
      </div>

      {/* Balance Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Saldo Atual</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              R$ {balance.current.toFixed(2)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-600">
                +{balance.profitPercentage}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Lucro Total</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              R$ {balance.profit.toFixed(2)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-gray-600">
                Desde R$ {balance.initial.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Média Mensal</span>
            </div>
            <p className="text-lg font-bold text-gray-800">
              R$ {balance.monthlyAverage.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-600">Projeção</span>
            </div>
            <p className="text-lg font-bold text-gray-800">
              R$ {balance.projection.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Alert */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="font-semibold text-orange-800">Controle de Risco</span>
          </div>
          <p className="text-sm text-orange-700">
            Você utilizou 68% do seu bankroll mensal. Considere apostas mais conservadoras.
          </p>
          <div className="w-full bg-orange-200 rounded-full h-2 mt-2">
            <div className="bg-orange-600 h-2 rounded-full" style={{ width: '68%' }}></div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0">
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-gray-600">
                    {transaction.date} • {transaction.time}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={transaction.type === 'win' ? 'default' : 'destructive'}
                    className={`text-xs ${
                      transaction.type === 'win' 
                        ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                        : 'bg-red-100 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    {transaction.type === 'win' ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    R$ {Math.abs(transaction.amount).toFixed(2)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
