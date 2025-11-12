import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, User, Calendar, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import api from "@/services/api";


interface RegisterScreenProps {
  onGoToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onGoToLogin }) => {
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();


  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  if (!nomeCompleto || !email || !dataNascimento || !password || !confirmPassword) {
    setError('Todos os campos são obrigatórios.');
    return;
  }

  if (password !== confirmPassword) {
    setError('As senhas não coincidem.');
    return;
  }

  if (!termosAceitos) {
    setError('Você deve aceitar os termos de consentimento para continuar.');
    return;
  }

  try {
    const response = await api.post('/auth/register-complete', {
      nomeCompleto,
      email,
      dataNascimento,
      senha: password, // O backend espera "senha", não "password"
    });

        // ✅ Mostra o toast com nome personalizado
    toast({
      title: `Conta criada com sucesso, ${nomeCompleto}!`,
      description: "Personalize suas preferências na próxima tela.",
    });

    // 🔁 Redireciona após o toast
    navigate('/profile-setup');
  } catch (error: any) {
    const message =
      error.response?.data?.message || "Erro ao registrar usuário.";
    setError(message);

    toast({
      title: "Erro no cadastro",
      description: message,
      variant: "destructive",
    });
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-800">
            Crie sua Conta
          </CardTitle>
          <p className="text-gray-600">É rápido e fácil.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Nome Completo"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                className="pl-10"
                required
              />
            </div>

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
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                placeholder="Data de Nascimento"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Crie uma senha"
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

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirme sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>

            <div className="items-top flex space-x-2 pt-2">
              <Checkbox
                id="terms1"
                checked={termosAceitos}
                onCheckedChange={(checked) => setTermosAceitos(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="terms1"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Termo de Consentimento
                </Label>
                <p className="text-sm text-muted-foreground">
                  Declaro que todas as informações aqui contidas são verdadeiras.
                </p>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center pt-2">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Continuar
            </Button>

            <div className="text-center pt-2">
              <span className="text-gray-600">Já tem uma conta? </span>
              <button
                type="button"
                onClick={onGoToLogin}
                className="text-blue-600 font-medium hover:underline"
              >
                Faça Login
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
