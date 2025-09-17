import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast({
        title: 'Verifique seu e-mail',
        description: 'Se o e-mail estiver cadastrado, enviamos um link para redefinir sua senha.',
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Não foi possível enviar o e-mail agora.';
      toast({ title: 'Falha ao enviar', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-800">Esqueci minha senha</CardTitle>
          <p className="text-gray-600">Informe seu e-mail para receber o link de redefinição.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={submitting}
            >
              {submitting ? 'Enviando…' : 'Enviar link de redefinição'}
            </Button>

            {/* Botão de voltar à tela inicial */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/')}
            >
              Voltar à tela inicial
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordScreen;
