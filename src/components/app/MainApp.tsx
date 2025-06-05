import React, { useState } from 'react';
import { HomeScreen } from './HomeScreen';
import { FinancialBalanceScreen } from './FinancialBalanceScreen';
import { BettingHistoryScreen } from './BettingHistoryScreen';
import { FriendsBetsScreen } from './FriendsBetsScreen';
import { ProfileRankingScreen } from './ProfileRankingScreen';
import { BottomNavigation } from './BottomNavigation';

export type AppScreen = 'home' | 'balance' | 'history' | 'friends' | 'profile';

export const MainApp: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />;
      case 'balance':
        return <FinancialBalanceScreen />;
      case 'history':
        return <BettingHistoryScreen />;
      case 'friends':
        return <FriendsBetsScreen />;
      case 'profile':
        return <ProfileRankingScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {renderScreen()}
      <BottomNavigation 
        currentScreen={currentScreen} 
        onScreenChange={setCurrentScreen} 
      />
    </div>
  );
};
