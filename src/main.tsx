import "@fontsource-variable/overpass";
import "@fontsource-variable/atkinson-hyperlegible-next";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { useDemo } from "./state/store";
import "./styles.css";

if (import.meta.env.DEV) (window as unknown as { __demo: typeof useDemo }).__demo = useDemo;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
