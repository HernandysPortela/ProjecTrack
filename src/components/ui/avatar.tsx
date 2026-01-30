"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const AvatarContext = React.createContext<{
  hasError: boolean;
  setHasError: (value: boolean) => void;
} | null>(null);

function Avatar({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  const [hasError, setHasError] = React.useState(false);

  return (
    <AvatarContext.Provider value={{ hasError, setHasError }}>
      <AvatarPrimitive.Root
        data-slot="avatar"
        data-error={hasError ? "true" : undefined}
        className={cn(
          "relative flex size-8 shrink-0 overflow-hidden rounded-full transition ring-1 ring-transparent data-[error=true]:ring-destructive/40",
          className
        )}
        {...props}
      >
        {children}
      </AvatarPrimitive.Root>
    </AvatarContext.Provider>
  );
}

function AvatarImage({
  className,
  onError,
  onLoad,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  const avatarContext = React.useContext(AvatarContext);
  const [hasError, setHasError] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
    // Only reset isLoaded if the src actually changes to a new value
    // This prevents flickering when the component re-renders with the same src
    if (props.src) {
        setIsLoaded(false);
    }
    avatarContext?.setHasError(false);
  }, [props.src]);

  if (hasError) {
    return null;
  }

  return (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 animate-pulse rounded-full bg-muted",
          isLoaded ? "hidden" : "block"
        )}
      />
      <AvatarPrimitive.Image
        data-slot="avatar-image"
        className={cn(
          "aspect-square size-full object-cover transition-opacity",
          !isLoaded ? "opacity-0" : "opacity-100",
          className
        )}
        onError={(event) => {
          setHasError(true);
          avatarContext?.setHasError(true);
          onError?.(event);
        }}
        onLoad={(event) => {
          setIsLoaded(true);
          avatarContext?.setHasError(false);
          onLoad?.(event);
        }}
        {...props}
      />
    </>
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  const avatarContext = React.useContext(AvatarContext);

  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      data-error={avatarContext?.hasError ? "true" : undefined}
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full text-xs font-semibold uppercase tracking-wide transition",
        avatarContext?.hasError
          ? "bg-destructive/10 text-destructive ring-1 ring-destructive/50"
          : "",
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback }
