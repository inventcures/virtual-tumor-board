"use client";

/**
 * Client-side providers for the app
 * Wraps children with context providers
 */

import { ReactNode } from "react";
import { UserProvider } from "@/lib/user-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  );
}
