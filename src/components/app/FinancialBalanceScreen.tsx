import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  AlertTriangle, 
  PiggyBank, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Wallet,
  LineChart
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const FinancialBalanceScreen: React.FC = () => {
  const [projectionPeriod, setProjectionPeriod] = useState<string>('1 semana');
  // Alterado para true para o gráfico aparecer por padrão
  const [showChart, setShowChart] = useState(true); 
  
  const balance = {
    current: 2450.75,
    initial: 2000.00,
    profit: 450.75,
    profitPercentage: 22.5,
    monthlyAverage: 187.50,
    baseProjection: 2890.00
  };

  const projectionData = [
    { name: 'Atual', value: balance.current },
    { name: '1 semana', value: balance.baseProjection },
    { name: '2 semanas', value: balance.current + ((balance.baseProjection - balance.current) * 2) },
    { name: '1 mês', value: balance.current + ((balance.baseProjection - balance.current) * 4) },
    { name: '6 meses', value: balance.current + ((balance.baseProjection - balance.current) * 24) },
    { name: '1 ano', value: balance.current + ((balance.baseProjection - balance.current) * 52) }
  ];

  const financialStatement = [
    { id: 1, type: 'deposit', amount: 500.00, description: 'Depósito via PIX', date: '2024-06-05', time: '09:15', method: 'PIX' },
    { id: 2, type: 'withdrawal', amount: -300.00, description: 'Saque para conta bancária', date: '2024-06-04', time: '14:30', method: 'TED' },
  ];

  const getProjectionValue = () => {
    const selectedData = projectionData.find(item => item.name === projectionPeriod);
    return selectedData ? selectedData.value : balance.baseProjection;
  };

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

      {/* --- NOVO LAYOUT DA GRADE --- */}
      {/* Linha com os 3 cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card: Saldo Atual */}
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

        {/* Card: Lucro Total */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Lucro Total</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              R$ {balance.profit.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {/* Card: Média Mensal */}
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
      </div>

      {/* Linha com o Card de Projeção grande */}
      <div>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-gray-600">Projeção</span>
              </div>
              <div className="flex items-center gap-2">
                <Select value={projectionPeriod} onValueChange={setProjectionPeriod}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <span>{projectionPeriod}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 semana" className="text-xs">1 semana</SelectItem>
                    <SelectItem value="2 semanas" className="text-xs">2 semanas</SelectItem>
                    <SelectItem value="1 mês" className="text-xs">1 mês</SelectItem>
                    <SelectItem value="6 meses" className="text-xs">6 meses</SelectItem>
                    <SelectItem value="1 ano" className="text-xs">1 ano</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={() => setShowChart(!showChart)}
                >
                  <LineChart className="w-4 h-4 mr-1" />
                  {showChart ? 'Ocultar' : 'Gráfico'}
                </Button>
              </div>
            </div>
            
            <p className="text-lg font-bold text-gray-800">
              R$ {getProjectionValue().toFixed(2)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-xs text-gray-600">
                {((getProjectionValue() - balance.current) / balance.current * 100).toFixed(1)}% previsto
              </span>
            </div>

            {showChart && (
              <div className="mt-4 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Valor']}
                      labelFormatter={(label) => `Período: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            )}
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

      {/* Extrato Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Extrato Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1">
            {financialStatement.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  {transaction.type === 'deposit' ? (
                    <ArrowDownCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <ArrowUpCircle className="w-5 h-5 text-red-600" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-800">{transaction.description}</p>
                    <div className="flex gap-2 items-center mt-1">
                      <p className="text-xs text-gray-600">{transaction.date} • {transaction.time}</p>
                      <Badge variant="outline" className="text-xs py-0 px-2">{transaction.method}</Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <Badge 
                    className={`text-xs font-semibold ${
                      transaction.type === 'deposit' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {transaction.type === 'deposit' ? '+' : ''} R$ {Math.abs(transaction.amount).toFixed(2)}
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