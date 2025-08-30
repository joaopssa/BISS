import React, { useState } from "react";
import { HomeScreen } from "./HomeScreen";
import { FinancialBalanceScreen } from "./FinancialBalanceScreen";
import { BettingHistoryScreen } from "./BettingHistoryScreen";
import { FriendsBetsScreen } from "./FriendsBetsScreen";
import { ProfileRankingScreen } from "./ProfileRankingScreen";
import { BottomNavigation } from "./BottomNavigation";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Sidebar (padrão shadcn/ui)
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";

// Ícones
import { Home, DollarSign, History, Users, User } from "lucide-react";

// Logo (use caminho público do Vite).
// Se o arquivo está em "public/lovable-uploads/logonormal.jpg",
// referência correta é "/lovable-uploads/logonormal.jpg".
const LOGO_SRC = "/lovable-uploads/logonormal.jpg";

export type AppScreen = "home" | "balance" | "history" | "friends" | "profile";

export const MainApp: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("home");

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return <HomeScreen />;
      case "balance":
        return <FinancialBalanceScreen />;
      case "history":
        return <BettingHistoryScreen />;
      case "friends":
        return <FriendsBetsScreen />;
      case "profile":
        return <ProfileRankingScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <ThemeProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          {/* Sidebar - visível em >= md */}
          <Sidebar collapsible="icon" className="hidden md:flex">
            <SidebarContent>
              <SidebarHeader>
                <img
                  src={LOGO_SRC}
                  alt="Logo do App"
                  className="h-10 w-10 object-contain transition-all duration-300"
                />
              </SidebarHeader>

              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setCurrentScreen("home")}
                    isActive={currentScreen === "home"}
                  >
                    <Home className="h-4 w-4" />
                    <span>Partidas</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setCurrentScreen("balance")}
                    isActive={currentScreen === "balance"}
                  >
                    <DollarSign className="h-4 w-4" />
                    <span>Balanço</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setCurrentScreen("history")}
                    isActive={currentScreen === "history"}
                  >
                    <History className="h-4 w-4" />
                    <span>Histórico</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setCurrentScreen("friends")}
                    isActive={currentScreen === "friends"}
                  >
                    <Users className="h-4 w-4" />
                    <span>Amigos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setCurrentScreen("profile")}
                    isActive={currentScreen === "profile"}
                  >
                    <User className="h-4 w-4" />
                    <span>Perfil</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>

          {/* Conteúdo principal */}
          <SidebarInset className="bg-gray-50 dark:bg-neutral-950 pb-24 w-full">
            {/* Área de conteúdo com padding (desktop e mobile) */}
            <div className="p-4">{renderScreen()}</div>

            {/* BottomNavigation — visível em < md */}
            <div className="md:hidden">
              <BottomNavigation
                currentScreen={currentScreen}
                onScreenChange={setCurrentScreen}
              />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default MainApp;
