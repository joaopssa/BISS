
import React, { useState } from 'react';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { RegisterScreen } from '@/components/auth/RegisterScreen';
import { UserProfileScreen } from '@/components/auth/UserProfileScreen';
import { MainApp } from '@/components/app/MainApp';
import { ThemeProvider } from '@/contexts/ThemeContext';

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

  if (currentScreen === 'app') {
    return renderScreen();
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-neutral-900 dark:to-neutral-800">
        {renderScreen()}
      </div>
    </ThemeProvider>
  );
};

export default Index;
