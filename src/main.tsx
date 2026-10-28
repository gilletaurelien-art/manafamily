import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA : mise en cache offline des parcours (uniquement en prod,
// jamais en dev ni sur http non sécurisé).
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // échec silencieux : la vitrine reste utilisable en ligne
    });
  });
}
