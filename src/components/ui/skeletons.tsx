import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70",
        className
      )}
    />
  );
}

export function SkeletonMatchCard() {
  return (
    <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/40 p-4 shadow-xl shadow-blue-500/5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-60" />
        </div>
        <Skeleton className="h-10 w-20 rounded-xl" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonKPI() {
  return (
    <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/40 p-4 shadow-xl shadow-blue-500/5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-4 h-10 w-full rounded-xl" />
    </div>
  );
}
