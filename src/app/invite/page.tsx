"use client";

import loadConfig from "@utils/config";
import { cn } from "@utils/helpers";
import { MailPlus, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useId, useState } from "react";
import { auth } from "@/utils/auth";

const config = loadConfig();

// ─── InviteAcceptForm ───────────────────────────────────────────────────────
// Isolated so useSearchParams() can be wrapped in Suspense

function InviteAcceptForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const tenantId = searchParams.get("tenantId") || "";

  const extSubId = useId();
  const errorId = useId();

  const [extSub, setExtSub] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const missingParams = !token || !tenantId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(
        `${(config as any).apiOrigin}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extSub,
            tenantId,
            inviteToken: token,
          }),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || "Invalid or expired invite");
      }

      const { token: userToken } = await res.json();
      auth.setToken(userToken);
      router.replace("/");
    } catch (err: any) {
      setError(err.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "w-full h-10 rounded-lg border bg-nb-gray-940 text-sm text-nb-gray-100 " +
    "placeholder:text-nb-gray-600 transition-colors duration-150 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0";
  const inputNormal =
    "border-nb-gray-900 hover:border-nb-gray-800 focus-visible:border-netbird/40 focus-visible:ring-netbird/20";
  const inputError = "border-red-500/40 focus-visible:ring-red-500/20";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-nb-gray-900/80 bg-nb-gray-930 shadow-lg ring-1 ring-white/[0.04]">
            <ShieldCheck size={26} className="text-netbird" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <p className="text-[22px] font-semibold tracking-tight text-nb-gray-100">
            Atla <span className="text-netbird">ZTA</span>
          </p>
          <p className="mt-1 text-[13px] text-nb-gray-500">
            You&apos;ve been invited to join a tenant
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-nb-gray-900/80 bg-nb-gray-930 shadow-2xl ring-1 ring-white/[0.03]">
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-netbird/40 to-transparent" />
          <div className="px-8 py-8">
            <div className="mb-6">
              <h1 className="text-base font-semibold text-nb-gray-100">
                Accept invite
              </h1>
              <p className="mt-1 text-[13px] text-nb-gray-500">
                Choose the identifier you&apos;ll sign in with
              </p>
            </div>

            {missingParams ? (
              <p className="text-[13px] text-red-400">
                This invite link is missing its token — ask the sender for a new one
              </p>
            ) : (
              <form onSubmit={handleSubmit} noValidate aria-label="Accept invite form" className="space-y-4">
                <div>
                  <label htmlFor={extSubId} className="mb-1.5 block text-[13px] font-medium text-nb-gray-300">
                    Identifier
                  </label>
                  <input
                    id={extSubId}
                    type="text"
                    autoComplete="username"
                    required
                    value={extSub}
                    onChange={(e) => setExtSub(e.target.value)}
                    placeholder="you@company.com"
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    className={cn(inputBase, "px-4", error ? inputError : inputNormal)}
                  />
                </div>

                {error && (
                  <div id={errorId} role="alert" aria-live="polite" className="rounded-lg border border-red-500/15 bg-red-950/30 px-3.5 py-3">
                    <p className="text-[13px] leading-snug text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !extSub}
                  className={cn(
                    "relative mt-2 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg",
                    "bg-netbird text-sm font-medium text-white",
                    "transition-all duration-200 hover:bg-netbird-500 active:scale-[0.99]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-netbird/50 focus-visible:ring-offset-2 focus-visible:ring-offset-nb-gray-930",
                    "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-netbird disabled:active:scale-100",
                  )}
                >
                  <MailPlus size={14} aria-hidden="true" />
                  {loading ? "Joining…" : "Accept & continue"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={null}>
      <InviteAcceptForm />
    </Suspense>
  );
}
