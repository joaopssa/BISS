import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../src/contexts/AuthContexts";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ForgotPasswordScreen from "./components/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "./components/auth/ResetPasswordScreen";

// Importe suas páginas/telas
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserProfilePage from "./pages/UserProfilePage";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Carregando aplicação...</div>; // Ou um componente de spinner
  }

  return (
    <Routes>
      {/* Rotas Públicas: Login, Registro e AGORA a configuração de perfil */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} />
      <Route path="/profile-setup" element={isAuthenticated ? <Navigate to="/" /> : <UserProfilePage />} />


      {/* Rotas Protegidas (Área VIP) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Index />} />
        {/* Adicione outras rotas que precisam de login aqui */}
      </Route>

      <Route path="*" element={<NotFound />} />
    
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/" /> : <ForgotPasswordScreen />}
      />
      <Route
        path="/reset-password"
        element={isAuthenticated ? <Navigate to="/" /> : <ResetPasswordScreen />}
      />
    </Routes>
  );
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;