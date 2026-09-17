import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { desktopAvailable, loadSettings, restartEngine, saveSettings } from "../engine/client";
import type { Settings } from "./types";
import { SettingsPane } from "./SettingsPane";

export function SettingsWindowApp() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    let live = true;
    void loadSettings().then((value) => { if (live) setSettings(value); })
      .catch((caught) => { if (live) setError(String(caught)); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings?.theme ?? "system";
    document.documentElement.dataset.boardAppearance = settings?.boardAppearance ?? "warm";
  }, [settings?.theme, settings?.boardAppearance]);

  useEffect(() => {
    if (!desktopAvailable) return;
    let dispose: (() => void) | undefined;
    let mounted = true;
    listen<string>("engine-log", (event) => setLog((lines) => [...lines.slice(-49), event.payload])).then((cleanup) => {
      if (mounted) dispose = cleanup;
      else cleanup();
    });
    return () => { mounted = false; dispose?.(); };
  }, []);

  const close = () => { if (desktopAvailable) void getCurrentWindow().close(); else window.close(); };
  const save = async (next: Settings) => {
    await saveSettings(next);
    setSettings(next);
  };
  if (error) return <div className="settings-load-error" role="alert">{error}</div>;
  if (!settings) return <div className="settings-load-error">Loading Settings…</div>;
  return <SettingsPane settings={settings} onSave={save} onClose={close}
    onRestart={desktopAvailable ? restartEngine : async () => {}}
    engineLog={log} windowed />;
}
