import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { msalInstance } from "./auth/msalConfig";
import { App } from "./App";

const queryClient = new QueryClient();

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

await msalInstance.initialize();

createRoot(root).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </MsalProvider>
  </StrictMode>,
);
