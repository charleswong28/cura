"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client/react";
import QRCode from "qrcode";
import { Shield, ShieldCheck, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { MeDocument } from "@/graphql/generated/graphql";
import { cn } from "@/lib/utils";

type Step = "idle" | "scan" | "verify" | "backup";

export default function MfaSettingsPage() {
  const { data, loading, refetch } = useQuery(MeDocument);
  const user = data?.me;

  const [step, setStep] = useState<Step>("idle");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!otpauthUrl) return;
    QRCode.toDataURL(otpauthUrl, { width: 200, margin: 2 }).then(setQrDataUrl).catch(() => {});
  }, [otpauthUrl]);

  async function startEnrolment() {
    if (!user?.authIdentityId || !user?.email) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/mfa-enrol-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.authIdentityId, email: user.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to start MFA enrolment");
      setOtpauthUrl(data.otpauthUrl);
      setSecret(data.secret);
      setStep("scan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmEnrolment(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.authIdentityId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/mfa-enrol-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authIdentityId: user.authIdentityId, totpCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "MFA confirmation failed");
      setBackupCodes(data.backupCodes);
      setStep("backup");
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setCode("");
    } finally {
      setIsSubmitting(false);
    }
  }

  function downloadBackupCodes() {
    const content = backupCodes.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cura-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function copySecret() {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg">
      <PageHeader
        title="Two-Factor Authentication"
        description="Add an extra layer of security to your account."
      />

      <div className="mt-8 space-y-6">
        {/* Current status */}
        {step === "idle" && (
          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-3">
              {user?.mfaEnrolled ? (
                <>
                  <ShieldCheck className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium">MFA is enabled</p>
                    <p className="text-sm text-muted-foreground">
                      Your account is protected with an authenticator app.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Shield className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <p className="font-medium">MFA is not enabled</p>
                    <p className="text-sm text-muted-foreground">
                      Protect your account with a time-based one-time password.
                    </p>
                  </div>
                </>
              )}
            </div>

            {!user?.mfaEnrolled && (
              <Button onClick={startEnrolment} disabled={isSubmitting || !user?.authIdentityId}>
                {isSubmitting ? "Starting…" : "Set up authenticator app"}
              </Button>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {/* Step 1: Scan QR code */}
        {step === "scan" && (
          <div className="rounded-lg border p-6 space-y-5">
            <div>
              <p className="font-medium">Scan this QR code</p>
              <p className="text-sm text-muted-foreground mt-1">
                Open your authenticator app (Google Authenticator, Authy, etc.) and scan the code
                below.
              </p>
            </div>

            {qrDataUrl ? (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="TOTP QR code" className="rounded border p-2 bg-white" />
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="h-[216px] w-[216px] animate-pulse rounded bg-muted" />
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Can&apos;t scan? Enter this key manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">
                  {secret}
                </code>
                <Button variant="ghost" size="icon" onClick={copySecret} className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button className="w-full" onClick={() => setStep("verify")}>
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Verify TOTP code */}
        {step === "verify" && (
          <div className="rounded-lg border p-6 space-y-5">
            <div>
              <p className="font-medium">Verify your setup</p>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the 6-digit code from your authenticator app to confirm enrolment.
              </p>
            </div>

            <form onSubmit={confirmEnrolment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="totp-code">Authentication code</Label>
                <Input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoFocus
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className={cn("tracking-widest text-center text-lg")}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={isSubmitting || code.length !== 6}>
                {isSubmitting ? "Verifying…" : "Confirm"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={() => {
                  setStep("scan");
                  setError(null);
                  setCode("");
                }}
              >
                Back
              </Button>
            </form>
          </div>
        )}

        {/* Step 3: Backup codes */}
        {step === "backup" && (
          <div className="rounded-lg border p-6 space-y-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-green-500 shrink-0" />
              <div>
                <p className="font-medium">MFA enabled successfully</p>
                <p className="text-sm text-muted-foreground">
                  Save these backup codes somewhere safe. Each can be used once if you lose access
                  to your authenticator app.
                </p>
              </div>
            </div>

            <div className="rounded bg-muted p-4 font-mono text-sm grid grid-cols-2 gap-x-6 gap-y-1">
              {backupCodes.map((code) => (
                <span key={code}>{code}</span>
              ))}
            </div>

            <Button variant="outline" className="w-full gap-2" onClick={downloadBackupCodes}>
              <Download className="h-4 w-4" />
              Download backup codes
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              These codes will not be shown again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
