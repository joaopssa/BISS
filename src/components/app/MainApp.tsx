"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FinanceProvider } from "@/contexts/FinanceContext";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarInset,
} from "@/components/ui/sidebar";
import { BottomNavigation } from "./BottomNavigation";
import { HomeScreen } from "./HomeScreen";
import FinancialBalanceScreen from "./FinancialBalanceScreen";
import BettingHistoryScreen from "./BettingHistoryScreen";
import { ProfileRankingScreen } from "./ProfileRankingScreen";
import { Home, DollarSign, History, User, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContexts";
import { useNavigate, useLocation } from "react-router-dom";

export type AppScreen = "home" | "balance" | "history" | "profile";

type MainAppProps = {
  initialScreen?: AppScreen;
};

export const MainApp: React.FC<MainAppProps> = ({ initialScreen = "home" }) => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(initialScreen);

  const location = useLocation();
  useEffect(() => {
    const s = (location.state as any)?.screen as AppScreen | undefined;
    if (s) setCurrentScreen(s);
  }, [location.state]);

  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const SCREENS = useMemo(
    () =>
      ({
        home: { label: "Partidas", Icon: Home },
        balance: { label: "Balanço", Icon: DollarSign },
        history: { label: "Histórico", Icon: History },
        profile: { label: "Perfil", Icon: User },
      }) as const,
    []
  );

  const currentMeta = SCREENS[currentScreen];

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return <HomeScreen />;
      case "balance":
        return <FinancialBalanceScreen />;
      case "history":
        return <BettingHistoryScreen />;
      case "profile":
        return <ProfileRankingScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <ThemeProvider>
      <FinanceProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            {/* SIDEBAR (Desktop) */}
            <Sidebar
              collapsible="icon"
              className="group hidden md:flex border-r border-white/10 bg-[#014a8f] text-white"
            >
              <SidebarContent className="px-2 py-3">
                {/* HEADER */}
                <SidebarHeader className="px-2 group-data-[collapsible=icon]:px-1">
                  <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center">
                    {/* Logo do app + badge da tela atual */}
                    <div className="relative shrink-0">
                      <div
                        className="
                          h-11 w-11 rounded-2xl bg-white/10 ring-1 ring-white/15 shadow-sm
                          flex items-center justify-center overflow-hidden
                          group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10
                        "
                      >
                        <img
                          src="/lovable-uploads/logonormal.jpg"
                          alt="Logo do App"
                          className="h-8 w-8 object-contain group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7"
                        />
                      </div>

                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white text-[#014a8f] shadow flex items-center justify-center ring-2 ring-[#014a8f]">
                        <currentMeta.Icon className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    {/* Título + slogan */}
                    <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                      <div className="text-sm font-extrabold leading-tight truncate text-white">
                        BISS
                      </div>
                      <div className="text-[11px] leading-tight truncate text-white/80">
                        Inteligência que joga do seu lado
                      </div>
                    </div>
                  </div>
                </SidebarHeader>

                {/* Divider */}
                <div className="mt-4 px-2">
                  <div className="h-px bg-white/15" />
                </div>

                {/* MENU */}
                <SidebarMenu className="mt-3 px-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setCurrentScreen("home")}
                      isActive={currentScreen === "home"}
                      className="rounded-xl text-white/90 hover:text-white hover:bg-white/10 data-[active=true]:bg-white/15 data-[active=true]:text-white"
                    >
                      <Home className="h-4 w-4" /> <span>Partidas</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setCurrentScreen("balance")}
                      isActive={currentScreen === "balance"}
                      className="rounded-xl text-white/90 hover:text-white hover:bg-white/10 data-[active=true]:bg-white/15 data-[active=true]:text-white"
                    >
                      <DollarSign className="h-4 w-4" /> <span>Balanço</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setCurrentScreen("history")}
                      isActive={currentScreen === "history"}
                      className="rounded-xl text-white/90 hover:text-white hover:bg-white/10 data-[active=true]:bg-white/15 data-[active=true]:text-white"
                    >
                      <History className="h-4 w-4" /> <span>Histórico</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setCurrentScreen("profile")}
                      isActive={currentScreen === "profile"}
                      className="rounded-xl text-white/90 hover:text-white hover:bg-white/10 data-[active=true]:bg-white/15 data-[active=true]:text-white"
                    >
                      <User className="h-4 w-4" /> <span>Perfil</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>

                {/* FOOTER / SAIR */}
                <SidebarMenu className="mt-auto px-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={handleLogout}
                      className="rounded-xl text-white/90 hover:text-white hover:bg-white/10"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sair</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarContent>
            </Sidebar>

            {/* MAIN */}
            <SidebarInset className="relative pb-24 bg-gray-50 dark:bg-neutral-950">
              {/* background suave tipo “premium” */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-[#014a8f]/10 blur-3xl" />
                <div className="absolute -bottom-52 -left-52 h-[560px] w-[560px] rounded-full bg-emerald-200/30 dark:bg-emerald-500/10 blur-3xl" />
              </div>

              <div className="relative w-full">
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
                  <div className="rounded-2xl border border-gray-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-950/40 backdrop-blur shadow-sm">
                    <div className="p-4 sm:p-6">{renderScreen()}</div>
                  </div>
                </div>

                {/* Bottom nav (Mobile) */}
                <div className="md:hidden">
                  <BottomNavigation
                    currentScreen={currentScreen}
                    onScreenChange={setCurrentScreen}
                  />
                </div>
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </FinanceProvider>
    </ThemeProvider>
  );
};
