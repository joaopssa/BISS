// src/pages/Index.tsx
import React from "react";
import { MainApp, AppScreen } from "@/components/app/MainApp";

type Props = { initialScreen?: AppScreen };

export default function Index({ initialScreen }: Props) {
  return <MainApp initialScreen={initialScreen ?? "home"} />;
}
