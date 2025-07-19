import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";

interface LoginScreenProps {
  onLogin: () => void;
  onGoToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGoToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
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

          {/* 🎯 Aqui entra o Typewriter */}
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

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Entrar
            </Button>

            <Button type="button" variant="ghost" className="w-full text-blue-600">
              Esqueci a senha
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
