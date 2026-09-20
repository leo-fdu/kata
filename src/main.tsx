import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { isMacPlatform } from "./platform";
import { SettingsWindowApp } from "./settings/SettingsWindowApp";
import "./styles/app.css";

document.documentElement.dataset.platform = isMacPlatform() ? "macos" : "other";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {new URLSearchParams(window.location.search).get("window") === "settings" ? <SettingsWindowApp /> : <App />}
  </StrictMode>,
);
