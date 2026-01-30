import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import AuthPage from "@/pages/Auth.tsx";
import InviteAcceptPage from "@/pages/InviteAccept.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import "./types/global.d.ts";
import Dashboard from "./pages/Dashboard.tsx";
import WorkgroupView from "./pages/WorkgroupView.tsx";
import ProjectView from "./pages/ProjectView.tsx";
import { LanguageProvider } from "@/contexts/LanguageContext.tsx";

// Suprimir avisos de aria-hidden - comportamento esperado do Radix UI em React 18
if (typeof window !== "undefined") {
  const originalWarn = console.warn;
  console.warn = function (...args: any[]) {
    const message = args[0]?.toString?.() || "";
    if (
      message.includes("Blocked aria-hidden on an element because its descendant retained focus") ||
      message.includes("aria-hidden section of the WAI-ARIA specification")
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

// Polyfill para evitar erros de DOM manipulation com Portals
const originalInsertBefore = Node.prototype.insertBefore;
Node.prototype.insertBefore = function<T extends Node>(newNode: Node, refNode: Node | null): T {
  try {
    // Se refNode for null, fazer appendChild
    if (!refNode) {
      return this.appendChild(newNode) as T;
    }
    // Tentar chamar o método original
    return originalInsertBefore.call(this, newNode, refNode) as T;
  } catch (e) {
    // Se falhar, tentar appendChild como fallback
    try {
      return this.appendChild(newNode) as T;
    } catch (appendError) {
      // Se appendChild também falhar, retornar o nó
      return newNode as T;
    }
  }
};

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <>
    <VlyToolbar />
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <LanguageProvider>
          <BrowserRouter>
            <RouteSyncer />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<AuthPage redirectAfterAuth="/dashboard" />} />
              <Route path="/invite" element={<InviteAcceptPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/workgroup/:workgroupId" element={<WorkgroupView />} />
              <Route path="/project/:projectId" element={<ProjectView />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </LanguageProvider>
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </>
);
