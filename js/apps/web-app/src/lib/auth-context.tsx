"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setAccessToken } from "@/lib/token-store";
import { apolloClient } from "@/lib/apollo-instance";

export interface AuthUser {
  id: string;
  displayName: string;
  tenantId: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    tenantSlug?: string
  ) => Promise<{ mfaRequired: true; mfaChallengeToken: string } | { mfaRequired: false }>;
  completeMfa: (challengeToken: string, code: string) => Promise<void>;
  switchTenant: (tenantSlug: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On mount: restore session from the httpOnly refresh token cookie
  useEffect(() => {
    fetch("/api/auth/refresh", { method: "POST" })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          setUser(data.user ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string, tenantSlug?: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, ...(tenantSlug ? { tenantSlug } : {}) }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Login failed");

    if (data.mfaRequired) {
      return { mfaRequired: true as const, mfaChallengeToken: data.mfaChallengeToken };
    }

    setAccessToken(data.accessToken);
    setUser(data.user ?? null);
    return { mfaRequired: false as const };
  }, []);

  const completeMfa = useCallback(async (challengeToken: string, code: string) => {
    const res = await fetch("/api/auth/mfa-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mfaChallengeToken: challengeToken, code }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "MFA verification failed");

    setAccessToken(data.accessToken);
    setUser(data.user ?? null);
  }, []);

  const switchTenant = useCallback(
    async (tenantSlug: string) => {
      const res = await fetch("/api/auth/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Tenant switch failed");

      setAccessToken(data.accessToken);
      setUser(data.user ?? null);

      // WA-091: clear and re-fetch all active queries with the new tenant's access token
      await apolloClient.resetStore();

      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setAccessToken(null);
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, completeMfa, switchTenant, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
