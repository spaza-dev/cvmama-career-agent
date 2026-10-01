import React from "react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { WifiSlashIcon } from "@phosphor-icons/react";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-xl bg-zinc-900/90 text-white px-3.5 py-2 text-xs font-medium backdrop-blur-md border border-zinc-700/80 shadow-lg animate-in fade-in slide-in-from-bottom duration-200">
      <WifiSlashIcon size={16} className="text-amber-400 shrink-0" />
      <span>Offline Mode — Cached data and app shell active</span>
    </div>
  );
}
