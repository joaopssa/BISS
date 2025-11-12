import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../src/contexts/AuthContexts";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ForgotPasswordScreen from "./components/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "./components/auth/ResetPasswordScreen";

// Páginas / Telas
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserProfilePage from "./pages/UserProfilePage";
import React, { useEffect, useState } from "react";

const queryClient = new QueryClient();

// ---------------------------------------------------------
// Controle inicial de autenticação
// ---------------------------------------------------------
const AppRoutes = () => {
  const { isAuthenticated, loading, setAuthenticated } = useAuth();
  const [initialCheck, setInitialCheck] = useState(true);

  useEffect(() => {
    // Verifica se há token salvo (login persistente)
    const token = localStorage.getItem("token");
    if (token) {
      setAuthenticated(true);
    }
    setInitialCheck(false);
  }, [setAuthenticated]);

  if (loading || initialCheck) {
    return <div>Carregando aplicação...</div>;
  }

  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} />
      <Route path="/profile-setup" element={isAuthenticated ? <Navigate to="/" /> : <UserProfilePage />} />

      {/* Rotas Protegidas */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Index />} />
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

// ---------------------------------------------------------
// Estrutura principal
// ---------------------------------------------------------
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
