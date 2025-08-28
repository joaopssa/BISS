
import React, { useState } from 'react';
import { HomeScreen } from './HomeScreen';
import { FinancialBalanceScreen } from './FinancialBalanceScreen';
import { BettingHistoryScreen } from './BettingHistoryScreen';
import { FriendsBetsScreen } from './FriendsBetsScreen';
import { ProfileRankingScreen } from './ProfileRankingScreen';
import { BottomNavigation } from './BottomNavigation';
import { ThemeProvider } from '@/contexts/ThemeContext';

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
    <ThemeProvider>
<<<<<<< Updated upstream
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 pb-24">
        {renderScreen()}
        <BottomNavigation 
          currentScreen={currentScreen} 
          onScreenChange={setCurrentScreen} 
        />
      </div>
=======
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          {/* Sidebar desktop */}
          <Sidebar collapsible="icon" className="hidden md:flex">
            <SidebarContent>
              <SidebarHeader>
  <img
  src="public\lovable-uploads\logonormal.jpg"
  alt="Logo do App"
  className="h-10 w-10 object-contain transition-all duration-300"
/>
</SidebarHeader>

              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setCurrentScreen('home')}
                    isActive={currentScreen === 'home'}
                  >
                    <Home className="h-4 w-4" />
                    <span>Partidas</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setCurrentScreen('balance')}
                    isActive={currentScreen === 'balance'}
                  >
                    <DollarSign className="h-4 w-4" />
                    <span>Balanço</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setCurrentScreen('history')}
                    isActive={currentScreen === 'history'}
                  >
                    <History className="h-4 w-4" />
                    <span>Histórico</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setCurrentScreen('friends')}
                    isActive={currentScreen === 'friends'}
                  >
                    <Users className="h-4 w-4" />
                    <span>Amigos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setCurrentScreen('profile')}
                    isActive={currentScreen === 'profile'}
                  >
                    <User className="h-4 w-4" />
                    <span>Perfil</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>

          {/* Conteúdo principal */}
          <SidebarInset className="bg-gray-50 dark:bg-neutral-950 pb-24">
            <div className="p-4">{renderScreen()}</div>

            <div className="md:hidden">
              <BottomNavigation
                currentScreen={currentScreen}
                onScreenChange={setCurrentScreen}
              />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
>>>>>>> Stashed changes
    </ThemeProvider>
  );
};
