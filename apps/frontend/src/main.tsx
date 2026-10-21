import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/app/App";
import { AppProvider } from "@/providers/app-provider";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
);
if (import.meta.env.PROD && "serviceWorker" in navigator)
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => console.warn("Service worker registration failed"));
  });
