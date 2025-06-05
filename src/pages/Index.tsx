import React, { useState } from 'react';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { RegisterScreen } from '@/components/auth/RegisterScreen';
import { UserProfileScreen } from '@/components/auth/UserProfileScreen';
import { MainApp } from '@/components/app/MainApp';

export type AuthFlow = 'login' | 'register' | 'profile' | 'app';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<AuthFlow>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentScreen('app');
  };

  const handleRegister = () => {
    setCurrentScreen('profile');
  };

  const handleProfileComplete = () => {
    setIsAuthenticated(true);
    setCurrentScreen('app');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return (
          <LoginScreen 
            onLogin={handleLogin}
            onGoToRegister={() => setCurrentScreen('register')}
          />
        );
      case 'register':
        return (
          <RegisterScreen 
            onRegister={handleRegister}
            onGoToLogin={() => setCurrentScreen('login')}
          />
        );
      case 'profile':
        return (
          <UserProfileScreen onComplete={handleProfileComplete} />
        );
      case 'app':
        return <MainApp />;
      default:
        return (
          <LoginScreen 
            onLogin={handleLogin}
            onGoToRegister={() => setCurrentScreen('register')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {renderScreen()}
    </div>
  );
};

export default Index;
