"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadSettings, saveSettings } from "@/lib/storage";
import type { Settings } from "@/lib/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({ muted: false, distance: "medium" });

  useEffect(() => {
    const timer = window.setTimeout(() => setSettings(loadSettings()), 0);

    function onSettingsChange() {
      setSettings(loadSettings());
    }

    window.addEventListener("hrc-settings-change", onSettingsChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hrc-settings-change", onSettingsChange);
    };
  }, []);

  function toggleMuted() {
    const nextSettings = { ...settings, muted: !settings.muted };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  }

  return (
    <div className="min-h-screen bg-[#f9f4e7] text-[#1d2428]">
      <header className="sticky top-0 z-40 border-b border-[#d9bd7f] bg-[#f9f4e7]/92 backdrop-blur">
        <nav className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="text-lg font-black tracking-normal text-[#243b31]">
            Derby Day
          </Link>
          <div className="flex items-center gap-2">
            <Link className="nav-link" href="/">
              Setup
            </Link>
            <Link className="nav-link" href="/history">
              History
            </Link>
            <button
              aria-label={settings.muted ? "Unmute audio" : "Mute audio"}
              className="icon-button"
              onClick={toggleMuted}
              title={settings.muted ? "Unmute audio" : "Mute audio"}
              type="button"
            >
              {settings.muted ? "🔇" : "🔊"}
            </button>
          </div>
        </nav>
      </header>
      {children}
    </div>
  );
}
