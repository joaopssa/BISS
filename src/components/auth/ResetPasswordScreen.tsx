import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';

const ResetPasswordScreen: React.FC = () => {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({ title: 'Token inválido', description: 'Link de redefinição ausente ou inválido.', variant: 'destructive' });
      return;
    }
    if (!password || password !== confirm) {
      toast({ title: 'Atenção', description: 'As senhas precisam coincidir.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast({ title: 'Senha redefinida!', description: 'Você já pode entrar com a nova senha.' });
      window.location.href = '/login';
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Não foi possível redefinir sua senha agora.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-800">Redefinir senha</CardTitle>
          <p className="text-gray-600">Defina uma nova senha para sua conta.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type={show ? 'text' : 'password'}
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
              >
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirmar nova senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff /> : <Eye />}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={submitting}
            >
              {submitting ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordScreen;
