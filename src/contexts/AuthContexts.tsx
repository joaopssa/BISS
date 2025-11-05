import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import api from "../services/api";

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  setAuthenticated: (value: boolean) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔐 Verifica se há login persistente ao iniciar o app
  useEffect(() => {
    const token = localStorage.getItem("biss_token");
    const storedUser = localStorage.getItem("biss_user");

    if (token && storedUser) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(JSON.parse(storedUser));
      setAuthenticated(true);
    } else {
      setAuthenticated(false);
    }

    setLoading(false);
  }, []);

  // 🔑 Login e persistência local
  const login = (token: string, userData: User) => {
    localStorage.setItem("biss_token", token);
    localStorage.setItem("biss_user", JSON.stringify(userData));
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser(userData);
    setAuthenticated(true);
  };

  // 🚪 Logout total (limpa sessão e token)
  const logout = () => {
    localStorage.removeItem("biss_token");
    localStorage.removeItem("biss_user");
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
        setAuthenticated, // ✅ novo setter exposto
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar o contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
