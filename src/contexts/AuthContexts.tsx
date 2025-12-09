// src/contexts/AuthContexts.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import api from "../services/api";

// 🔹 Agora o User conhece o favoriteTeam
interface User {
  id: number;
  name: string;
  email: string;
  favoriteTeam?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string, userData: any) => void;
  logout: () => void;
  setAuthenticated: (value: boolean) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔐 Recupera sessão ao iniciar
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      try {
        const parsed: User = JSON.parse(storedUser);
        setUser(parsed);
        setAuthenticated(true);
      } catch {
        setUser(null);
        setAuthenticated(false);
      }
    } else {
      setAuthenticated(false);
    }

    setLoading(false);
  }, []);

  // 🔑 Login normalizando o usuário que veio do backend
  const login = (token: string, userData: any) => {
    const normalizedUser: User = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      favoriteTeam: userData.favoriteTeam ?? null,
    };

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser(normalizedUser);
    setAuthenticated(true);
  };

  // 🚪 Logout total
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        setAuthenticated,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
