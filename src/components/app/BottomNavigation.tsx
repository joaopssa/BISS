import React from 'react';
import { Home, DollarSign, History, Users, User } from 'lucide-react';
import { AppScreen } from './MainApp';

interface BottomNavigationProps {
  currentScreen: AppScreen;
  onScreenChange: (screen: AppScreen) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  currentScreen, 
  onScreenChange 
}) => {
  const navItems = [
    { id: 'home' as AppScreen, icon: Home, label: 'Partidas' },
    { id: 'balance' as AppScreen, icon: DollarSign, label: 'Balanço' },
    { id: 'history' as AppScreen, icon: History, label: 'Histórico' },
    { id: 'friends' as AppScreen, icon: Users, label: 'Amigos' },
    { id: 'profile' as AppScreen, icon: User, label: 'Perfil' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onScreenChange(item.id)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
