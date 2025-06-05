
import React from 'react';
import { Home, DollarSign, History, Users, User } from 'lucide-react';
import { AppScreen } from './MainApp';
import { FloatingDock } from '@/components/ui/floating-dock';

interface BottomNavigationProps {
  currentScreen: AppScreen;
  onScreenChange: (screen: AppScreen) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  currentScreen, 
  onScreenChange 
}) => {
  const navItems = [
    { 
      title: 'Partidas', 
      icon: <Home className={`w-full h-full ${currentScreen === 'home' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`} />, 
      onClick: () => onScreenChange('home')
    },
    { 
      title: 'Balanço', 
      icon: <DollarSign className={`w-full h-full ${currentScreen === 'balance' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`} />, 
      onClick: () => onScreenChange('balance')
    },
    { 
      title: 'Histórico', 
      icon: <History className={`w-full h-full ${currentScreen === 'history' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`} />, 
      onClick: () => onScreenChange('history')
    },
    { 
      title: 'Amigos', 
      icon: <Users className={`w-full h-full ${currentScreen === 'friends' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`} />, 
      onClick: () => onScreenChange('friends')
    },
    { 
      title: 'Perfil', 
      icon: <User className={`w-full h-full ${currentScreen === 'profile' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`} />, 
      onClick: () => onScreenChange('profile')
    },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <FloatingDock items={navItems} />
    </div>
  );
};
