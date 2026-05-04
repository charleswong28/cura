"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Step = "credentials" | "mfa";

function LoginForm() {
  const { login, completeMfa } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [step, setStep] = useState<Step>("credentials");
  const [mfaChallengeToken, setMfaChallengeToken] = useState("");

  // Credentials step
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // MFA step
  const [code, setCode] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (result.mfaRequired) {
        setMfaChallengeToken(result.mfaChallengeToken);
        setStep("mfa");
      } else {
        router.push(redirectTo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await completeMfa(mfaChallengeToken, code);
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "MFA verification failed");
      setCode("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8 px-4">
      {/* Brand */}
      <div className="text-center">
        <span className="text-3xl font-semibold tracking-tight">Cura</span>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === "credentials" ? "Sign in to your account" : "Two-factor authentication"}
        </p>
      </div>

      {step === "credentials" ? (
        <form onSubmit={handleCredentials} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>

          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Forgot your password?
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleMfa} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app.
          </p>

          <div className="space-y-2">
            <Label htmlFor="code">Authentication code</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className={cn("tracking-widest", "text-center text-lg")}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting || code.length !== 6}>
            {isSubmitting ? "Verifying…" : "Verify"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-sm"
            onClick={() => {
              setStep("credentials");
              setError(null);
              setCode("");
            }}
          >
            Back to sign in
          </Button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
