"use client";
import React, { useState } from "react";
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
import { BottomNavigation } from "@/components/app/BottomNavigation";
import { Home, DollarSign, History, Users, User } from "lucide-react";

export type AppScreen = "home" | "balance" | "history" | "friends" | "profile";

export default function MainLayout() {
  const [screen, setScreen] = useState<AppScreen>("home");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Sidebar desktop */}
        <Sidebar collapsible="icon" className="hidden md:flex">
          <SidebarContent>
            <SidebarHeader>
              <span className="font-bold text-lg">BISS</span>
            </SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setScreen("home")}
                  isActive={screen === "home"}
                >
                  <Home className="h-4 w-4" />
                  <span>Partidas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setScreen("balance")}
                  isActive={screen === "balance"}
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Balanço</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setScreen("history")}
                  isActive={screen === "history"}
                >
                  <History className="h-4 w-4" />
                  <span>Histórico</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setScreen("friends")}
                  isActive={screen === "friends"}
                >
                  <Users className="h-4 w-4" />
                  <span>Amigos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setScreen("profile")}
                  isActive={screen === "profile"}
                >
                  <User className="h-4 w-4" />
                  <span>Perfil</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        {/* Conteúdo principal */}
        <SidebarInset>
          {/* Conteúdo da tela com base no estado */}
          <div className="p-4">{renderScreen(screen)}</div>

          {/* Bottom navigation (mobile only) */}
          <BottomNavigation
            currentScreen={screen}
            onScreenChange={setScreen}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function renderScreen(screen: AppScreen) {
  switch (screen) {
    case "home":
      return <div>🏠 Tela Home</div>;
    case "balance":
      return <div>💰 Tela Balanço</div>;
    case "history":
      return <div>📜 Tela Histórico</div>;
    case "friends":
      return <div>👥 Tela Amigos</div>;
    case "profile":
      return <div>👤 Tela Perfil</div>;
    default:
      return <div>Not found</div>;
  }
}
