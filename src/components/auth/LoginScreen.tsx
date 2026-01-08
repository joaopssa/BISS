import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";
import api from '@/services/api';
import { useAuth } from '../../contexts/AuthContexts';
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';

interface LoginScreenProps {
  onGoToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGoToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const auth = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      // 🔐 Salva token e dados localmente
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Atualiza contexto de autenticação
      auth.login(token, user);

      // Exibe mensagem de sucesso
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo de volta, ${user.nome || user.name || 'usuário'}.`,
      });

      // Redireciona para Home sem recarregar
      navigate('/');

    } catch (err: any) {
      const message = err.response?.data?.message || "Ocorreu um erro no login.";
      setError(message);
      toast({
        title: "Erro no Login",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 bg-blue-600 rounded-lg flex items-center justify-center">
            <img 
              src="/lovable-uploads/f77e9c7d-1d78-46ea-9b89-391284783838.png" 
              alt="BISS Logo" 
              className="w-16 h-16 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-blue-800">BISS</CardTitle>

          <div className="max-w-[280px] sm:max-w-[320px] md:max-w-[360px] mx-auto overflow-hidden">
            <TypewriterEffectSmooth
              words={[
                { text: "Inteligência" },
                { text: "que" },
                { text: "joga" },
                { text: "do" },
                { text: "seu" },
                { text: "lado", className: "text-blue-600 dark:text-blue-400" },
              ]}
            />
          </div>
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

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>

            {error && <p className="text-sm text-center text-red-500">{error}</p>}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Entrar
            </Button>

            <div className="text-center pt-4">
              <span className="text-gray-600">Não tem conta? </span>
              <button
                type="button"
                onClick={onGoToRegister}
                className="text-blue-600 font-medium hover:underline"
              >
                Cadastre-se
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
