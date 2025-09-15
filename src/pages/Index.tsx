import { MainApp } from "@/components/app/MainApp";
import { useAuth } from "@/contexts/AuthContexts";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    // A navegação para /login é opcional, pois o ProtectedRoute já fará isso.
    // Mas é uma boa prática para garantir o redirecionamento imediato.
    navigate('/login'); 
  };

  return (
    <div>
      {/* Botão de Logout para teste (opcional, mas recomendado) */}
      <header className="absolute top-4 right-4 z-50">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 hidden sm:inline">
            Olá, {user?.name || 'Usuário'}
          </span>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </header>
      
      {/* Aqui é a mágica: renderizamos o seu aplicativo principal */}
      <MainApp />
    </div>
  );
};

export default Index;