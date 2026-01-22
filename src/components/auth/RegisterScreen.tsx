import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Mail, Lock, User, Calendar, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContexts";
import api from "@/services/api";

interface RegisterScreenProps {
  onGoToLogin: () => void;
}

const MIN_AGE = 18;

function calcAge(dateISO: string) {
  // dateISO esperado: "YYYY-MM-DD"
  const [y, m, d] = dateISO.split("-").map(Number);
  if (!y || !m || !d) return NaN;

  const today = new Date();
  const birth = new Date(y, m - 1, d);

  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());

  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function maxDateForMinAge(minAge: number) {
  const t = new Date();
  const y = t.getFullYear() - minAge;
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  // Ex.: hoje 2026-01-22 => max 2008-01-22 (para 18+)
  return `${y}-${m}-${d}`;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onGoToLogin }) => {
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const maxDOB = useMemo(() => maxDateForMinAge(MIN_AGE), []);
  const age = useMemo(() => (dataNascimento ? calcAge(dataNascimento) : NaN), [dataNascimento]);
  const isUnderage = Number.isFinite(age) ? age < MIN_AGE : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!nomeCompleto || !email || !dataNascimento || !password || !confirmPassword) {
      setError("Todos os campos são obrigatórios.");
      return;
    }

    // ✅ BLOQUEIO 18+
    if (isUnderage) {
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (!termosAceitos) {
      setError("Você deve aceitar os termos de consentimento para continuar.");
      return;
    }

    try {
      await api.post("/auth/register-complete", {
        nomeCompleto,
        email,
        dataNascimento,
        senha: password,
      });

      const registrationData = { nomeCompleto, email, dataNascimento, senha: password };
      localStorage.setItem("registrationData", JSON.stringify(registrationData));

      const resp = await api.post("/auth/login", { email, password });
      const { token, user } = resp.data;

      login(token, user);

      toast({
        title: `Conta criada com sucesso, ${nomeCompleto}!`,
        description: "Personalize suas preferências na próxima tela.",
      });

      navigate("/profile-setup", { replace: true });
    } catch (err: any) {
      const message = err.response?.data?.message || "Erro ao registrar usuário.";
      setError(message);

      toast({
        title: "Erro no cadastro",
        description: message,
        variant: "destructive",
      });
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
        {/* “Top strip” igual suas telas */}
        <div className="relative overflow-hidden border-b border-gray-200/60 dark:border-neutral-800/60 bg-gradient-to-r from-[#014a8f]/10 via-white to-emerald-50 dark:from-[#014a8f]/15 dark:via-neutral-950 dark:to-emerald-950/20">
          <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#014a8f]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-500/10" />

          <CardHeader className="relative text-center py-8 sm:py-10">
            <div className="mx-auto mb-5 sm:mb-6 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white/80 dark:bg-neutral-900/40 border border-gray-200/60 dark:border-neutral-800/60 shadow-sm flex items-center justify-center p-3">
              <img
                src="/lovable-uploads/logonormal.jpg"
                alt="BISS Logo"
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>

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

            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              Crie sua conta em poucos passos.
            </p>
          </CardHeader>
        </div>

        <CardContent className="p-6 sm:p-8">
            <form noValidate onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Nome completo"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                className="pl-10 h-11 sm:h-12 rounded-xl bg-white/80 dark:bg-neutral-900/40 border-gray-200/70 dark:border-neutral-800 focus-visible:ring-[#014a8f]/30"
                required
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 sm:h-12 rounded-xl bg-white/80 dark:bg-neutral-900/40 border-gray-200/70 dark:border-neutral-800 focus-visible:ring-[#014a8f]/30"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="pl-10 h-11 sm:h-12 rounded-xl bg-white/80 dark:bg-neutral-900/40 border-gray-200/70 dark:border-neutral-800 focus-visible:ring-[#014a8f]/30"
                  required
                />
              </div>

              <div className="min-h-[18px]">
                {dataNascimento && isUnderage && (
                  <p className="text-xs sm:text-sm text-red-600 dark:text-red-300 pl-1">
                    Cadastro permitido apenas para maiores de {MIN_AGE} anos.
                  </p>
                )}
              </div>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Crie uma senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 sm:h-12 rounded-xl bg-white/80 dark:bg-neutral-900/40 border-gray-200/70 dark:border-neutral-800 focus-visible:ring-[#014a8f]/30"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmar senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 sm:h-12 rounded-xl bg-white/80 dark:bg-neutral-900/40 border-gray-200/70 dark:border-neutral-800 focus-visible:ring-[#014a8f]/30"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label={showConfirmPassword ? "Ocultar confirmação" : "Mostrar confirmação"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* ✅ MANTIDO: Termo de Consentimento */}
            <div className="rounded-2xl border border-gray-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/20 px-4 py-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms1"
                  checked={termosAceitos}
                  onCheckedChange={(checked) => setTermosAceitos(checked as boolean)}
                  className="mt-0.5"
                />
                <div className="grid gap-1 leading-none">
                  <Label
                    htmlFor="terms1"
                    className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Termo de Consentimento
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Declaro que todas as informações aqui contidas são verdadeiras.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 sm:h-12 rounded-xl bg-[#014a8f] hover:bg-[#003b70] text-white font-semibold"
            >
              Continuar
            </Button>

            <div className="pt-2 text-center">
              <span className="text-gray-600 dark:text-gray-300">Já tem uma conta? </span>
              <button
                type="button"
                onClick={onGoToLogin}
                className="text-[#014a8f] font-semibold hover:underline"
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
