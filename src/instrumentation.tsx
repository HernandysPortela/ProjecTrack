import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dialog } from "@radix-ui/react-dialog";
import { ChevronDown, ExternalLink, RefreshCcw } from "lucide-react";
import React, { useEffect, useState } from "react";

// Suprimir aviso de aria-hidden com foco - é um comportamento esperado do Radix UI
if (typeof window !== "undefined") {
  const originalWarn = console.warn;
  console.warn = function (...args: any[]) {
    if (
      args[0]?.includes?.("Blocked aria-hidden on an element because its descendant retained focus")
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

type SyncError = {
  error: string;
  stack: string;
  filename: string;
  lineno: number;
  colno: number;
};

type AsyncError = {
  error: string;
  stack: string;
};

type GenericError = SyncError | AsyncError;

async function reportErrorToVly(errorData: {
  error: string;
  stackTrace?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
}) {
  if (!import.meta.env.VITE_VLY_APP_ID) {
    return;
  }

  try {
    await fetch(import.meta.env.VITE_VLY_MONITORING_URL, {
      method: "POST",
      body: JSON.stringify({
        ...errorData,
        url: window.location.href,
        projectSemanticIdentifier: import.meta.env.VITE_VLY_APP_ID,
      }),
    });
  } catch (error) {
    console.error("Failed to report error to Vly:", error);
  }
}

function ErrorDialog({
  error,
  setError,
}: {
  error: GenericError;
  setError: (error: GenericError | null) => void;
}) {
  return (
    <Dialog
      defaultOpen={true}
      onOpenChange={() => {
        setError(null);
      }}
    >
      <DialogContent className="bg-red-700 text-white max-w-4xl">
        <DialogHeader>
          <DialogTitle>Runtime Error</DialogTitle>
          <DialogDescription>
            A runtime error occurred. Open the vly editor to automatically debug the error.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Collapsible>
            <CollapsibleTrigger>
              <div className="flex items-center font-bold cursor-pointer">
                See error details <ChevronDown />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="max-w-[460px]">
              <div className="mt-2 p-3 bg-neutral-800 rounded text-white text-sm overflow-x-auto max-h-60 max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <pre className="whitespace-pre">{error.stack}</pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              sessionStorage.removeItem("build_retry_count");
              window.location.reload();
            }}
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Retry
          </Button>
          <a
            href={`https://vly.ai/project/${import.meta.env.VITE_VLY_APP_ID}`}
            target="_blank"
          >
            <Button>
              <ExternalLink /> Open editor
            </Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ErrorBoundaryState = {
  hasError: boolean;
  error: GenericError | null;
};

class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
  },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // logErrorToMyService(
    //   error,
    //   // Example "componentStack":
    //   //   in ComponentThatThrows (created by App)
    //   //   in ErrorBoundary (created by App)
    //   //   in div (created by App)
    //   //   in App
    //   info.componentStack,
    //   // Warning: `captureOwnerStack` is not available in production.
    //   React.captureOwnerStack(),
    // );
    reportErrorToVly({
      error: error.message,
      stackTrace: error.stack,
    });
    this.setState({
      hasError: true,
      error: {
        error: error.message,
        stack: info.componentStack ?? error.stack ?? "",
      },
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <ErrorDialog
          error={{
            error: "An error occurred",
            stack: "",
          }}
          setError={() => {}}
        />
      );
    }

    return this.props.children;
  }
}

export function InstrumentationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [error, setError] = useState<GenericError | null>(null);

  useEffect(() => {
    // Clear retry count on successful load after a delay
    const clearRetryTimeout = setTimeout(() => {
      sessionStorage.removeItem("build_retry_count");
    }, 5000);

    const handleError = async (event: ErrorEvent) => {
      try {
        console.log(event);
        event.preventDefault();
        setError({
          error: event.message,
          stack: event.error?.stack || "",
          filename: event.filename || "",
          lineno: event.lineno,
          colno: event.colno,
        });

        if (import.meta.env.VITE_VLY_APP_ID) {
          await reportErrorToVly({
            error: event.message,
            stackTrace: event.error?.stack,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          });
        }
      } catch (error) {
        console.error("Error in handleError:", error);
      }
    };

    const handleRejection = async (event: PromiseRejectionEvent) => {
      try {
        console.error(event);

        if (import.meta.env.VITE_VLY_APP_ID) {
          await reportErrorToVly({
            error: event.reason.message,
            stackTrace: event.reason.stack,
          });
        }

        setError({
          error: event.reason.message,
          stack: event.reason.stack,
        });
      } catch (error) {
        console.error("Error in handleRejection:", error);
      }
    };

    const handleBuildFailure = async (event: Event) => {
      try {
        const customEvent = event as CustomEvent<{ err?: { message?: string; stack?: string } }>;
        const errorMessage = customEvent.detail?.err?.message ?? "Build failed";
        const stackTrace = customEvent.detail?.err?.stack;

        console.error("Build failure detected:", customEvent.detail?.err);

        // Retry logic for build failures
        const MAX_RETRIES = 3;
        const retryCount = parseInt(sessionStorage.getItem("build_retry_count") || "0", 10);

        if (retryCount < MAX_RETRIES) {
          console.log(`Build failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          sessionStorage.setItem("build_retry_count", (retryCount + 1).toString());
          window.location.reload();
          return;
        }

        setError({
          error: errorMessage,
          stack: stackTrace ?? "",
        });

        if (import.meta.env.VITE_VLY_APP_ID) {
          await reportErrorToVly({
            error: errorMessage,
            stackTrace,
            filename: "vite-build",
          });
        }
      } catch (error) {
        console.error("Error handling build failure:", error);
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("vite:error", handleBuildFailure);

    return () => {
      clearTimeout(clearRetryTimeout);
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("vite:error", handleBuildFailure);
    };
  }, []);
  return (
    <>
      <ErrorBoundary>{children}</ErrorBoundary>
      {error && <ErrorDialog error={error} setError={setError} />}
    </>
  );
}
