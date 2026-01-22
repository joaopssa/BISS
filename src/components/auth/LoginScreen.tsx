import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";
import api from "@/services/api";
import { useAuth } from "../../contexts/AuthContexts";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface LoginScreenProps {
  onGoToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGoToRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const auth = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      auth.login(token, user);

      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo de volta, ${user.nome || user.name || "usuário"}.`,
      });

      navigate("/");
    } catch (err: any) {
      const message = err.response?.data?.message || "Ocorreu um erro no login.";
      setError(message);
      toast({
        title: "Erro no Login",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10 bg-gray-50 dark:bg-neutral-950">
      {/* Background no estilo “Panel” */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -right-28 h-80 w-80 rounded-full bg-[#014a8f]/10 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-emerald-200/25 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-950" />
      </div>

      <Card className="relative w-full max-w-xl lg:max-w-2xl overflow-hidden rounded-3xl border border-gray-200/70 dark:border-neutral-800/70 shadow-xl shadow-blue-500/10 bg-white/80 dark:bg-neutral-950/50 backdrop-blur">
        {/* “Top strip” */}
        <div className="relative overflow-hidden border-b border-gray-200/60 dark:border-neutral-800/60 bg-gradient-to-r from-[#014a8f]/10 via-white to-emerald-50 dark:from-[#014a8f]/15 dark:via-neutral-950 dark:to-emerald-950/20">
          <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#014a8f]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-500/10" />

          <CardHeader className="relative text-center py-8 sm:py-10">
            {/* Logo */}
            <div className="mx-auto mb-5 sm:mb-6 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white/80 dark:bg-neutral-900/40 border border-gray-200/60 dark:border-neutral-800/60 shadow-sm flex items-center justify-center p-3">
              <img
                src="/lovable-uploads/logonormal.jpg"
                alt="BISS Logo"
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>

            {/* Slogan (Typewriter) */}
            <div className="mt-2 flex justify-center">
              <div className="w-full max-w-[760px] px-2 sm:px-4">
                <div className="min-h-[44px] sm:min-h-[52px] md:min-h-[60px] flex items-center justify-center">
                  <div className="origin-center scale-[1.10] sm:scale-[1.20] md:scale-[1.30]">
                    <TypewriterEffectSmooth
                      words={[
                        { text: "Inteligência" },
                        { text: "que" },
                        { text: "joga" },
                        { text: "do" },
                        { text: "seu" },
                        { text: "lado.", className: "text-[#014a8f] dark:text-[#014a8f]" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ Microcopy curta (sem competir com o slogan) */}
            <p className="mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              Acompanhe jogos, odds e seu desempenho em um só lugar.
            </p>
          </CardHeader>
        </div>

        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 sm:h-12 rounded-xl bg-white/80 dark:bg-neutral-900/40 border-gray-200/70 dark:border-neutral-800 focus-visible:ring-[#014a8f]/30"
                required
                disabled={loading}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-11 sm:h-12 rounded-xl bg-white/80 dark:bg-neutral-900/40 border-gray-200/70 dark:border-neutral-800 focus-visible:ring-[#014a8f]/30"
                required
                disabled={loading}
              />

              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
                {error}
              </div>
            )}

            {/* ✅ Botão Entrar: mais dominante + ícone + shadow */}
            <Button
              type="submit"
              disabled={loading}
              className="
                w-full h-11 sm:h-12 rounded-xl
                bg-[#014a8f] hover:bg-[#003b70]
                text-white font-extrabold
                shadow-lg shadow-blue-500/25
                transition
                disabled:opacity-70 disabled:cursor-not-allowed
              "
            >
              <span className="inline-flex items-center justify-center gap-2">
                {loading ? "Entrando..." : "Entrar"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </span>
            </Button>

            {/* ✅ Criar conta como link secundário */}
            <div className="pt-2 text-center text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                Não tem conta?{" "}
              </span>
              <button
                type="button"
                onClick={onGoToRegister}
                className="text-[#014a8f] font-semibold hover:underline"
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
