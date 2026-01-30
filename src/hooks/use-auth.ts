import { api } from "@convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";

import { useEffect, useState } from "react";

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const { signIn, signOut } = useAuthActions();

  const [isLoading, setIsLoading] = useState(true);

  // This effect updates the loading state once auth is loaded
  // For authenticated users, we also wait for user data
  // For unauthenticated users, we only need auth to finish loading
  useEffect(() => {
    if (!isAuthLoading) {
      if (isAuthenticated) {
        // If authenticated, wait for user data to be available
        if (user !== undefined) {
          setIsLoading(false);
        }
      } else {
        // If not authenticated, we can stop loading immediately
        setIsLoading(false);
      }
    }
  }, [isAuthLoading, isAuthenticated, user]);

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}
