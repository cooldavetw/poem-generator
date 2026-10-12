import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import PoemApp from "./poem-app";
import "@copilotkit/react-core/v2/styles.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PoemApp />
  </StrictMode>,
);
