import "@fontsource-variable/overpass";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/noto-sans-jp";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { tr } from "./i18n";
import { loadSim } from "./sim/Simulator";
import { useDemo } from "./state/store";
import "./styles.css";

// Dev only: the store and the translator, for scripts that capture screens for the video.
if (import.meta.env.DEV) Object.assign(window, { __demo: useDemo, __tr: tr });

void loadSim().catch(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
