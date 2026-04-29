"use client";

import loadConfig from "@utils/config";
import { cn } from "@utils/helpers";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useId, useState } from "react";
import { auth } from "@/utils/auth";

const config = loadConfig();

// ─── LoginForm ────────────────────────────────────────────────────────────────
// Isolated in its own component so useSearchParams() can be wrapped in Suspense.

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(
        `${(config as any).apiOrigin}/api/ui/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || "Invalid credentials");
      }

      const { token } = await res.json();
      auth.setToken(token);
      router.replace(redirect);
    } catch (err: any) {
      setError(err.message ?? "Login failed. Please try again.");
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
  const inputError =
    "border-red-500/40 focus-visible:ring-red-500/20";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* ── Background effects ─────────────────────────────────────────── */}
      {/* Subtle grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), " +
            "linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      {/* Top glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[680px] -translate-x-1/2 rounded-full bg-netbird/6 blur-3xl"
      />
      {/* Bottom glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 left-1/2 h-[360px] w-[480px] -translate-x-1/2 rounded-full bg-nb-blue/4 blur-3xl"
      />

      {/* ── Main card ──────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md">

        {/* Logo mark */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-nb-gray-900/80 bg-nb-gray-930 shadow-lg ring-1 ring-white/[0.04]">
            <ShieldCheck
              size={26}
              className="text-netbird"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </div>
          <p className="text-[22px] font-semibold tracking-tight text-nb-gray-100">
            Atla{" "}
            <span className="text-netbird">ZTA</span>
          </p>
          <p className="mt-1 text-[13px] text-nb-gray-500">
            Zero Trust Access Platform
          </p>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-nb-gray-900/80 bg-nb-gray-930 shadow-2xl ring-1 ring-white/[0.03]">

          {/* Thin accent bar at top */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-netbird/40 to-transparent" />

          <div className="px-8 py-8">

            <div className="mb-6">
              <h1 className="text-base font-semibold text-nb-gray-100">
                Sign in to your account
              </h1>
              <p className="mt-1 text-[13px] text-nb-gray-500">
                Enter your credentials to access the dashboard
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              aria-label="Sign in form"
              className="space-y-4"
            >
              {/* Email */}
              <div>
                <label
                  htmlFor={emailId}
                  className="mb-1.5 block text-[13px] font-medium text-nb-gray-300"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    size={14}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-nb-gray-600"
                  />
                  <input
                    id={emailId}
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    className={cn(inputBase, "pl-9 pr-4", error ? inputError : inputNormal)}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor={passwordId}
                  className="mb-1.5 block text-[13px] font-medium text-nb-gray-300"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={14}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-nb-gray-600"
                  />
                  <input
                    id={passwordId}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    className={cn(inputBase, "pl-9 pr-10", error ? inputError : inputNormal)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-0 top-0 flex h-10 w-10 cursor-pointer items-center justify-center text-nb-gray-600 transition-colors duration-150 hover:text-nb-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-netbird/40 rounded-lg"
                  >
                    {showPassword ? (
                      <EyeOff size={14} aria-hidden="true" />
                    ) : (
                      <Eye size={14} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div
                  id={errorId}
                  role="alert"
                  aria-live="polite"
                  className="flex items-start gap-2.5 rounded-lg border border-red-500/15 bg-red-950/30 px-3.5 py-3"
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden="true"
                    className="mt-px h-3.5 w-3.5 shrink-0 text-red-400"
                  >
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z" />
                  </svg>
                  <p className="text-[13px] leading-snug text-red-400">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className={cn(
                  "relative mt-2 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg",
                  "bg-netbird text-sm font-medium text-white",
                  "transition-all duration-200",
                  "hover:bg-netbird-500 active:scale-[0.99]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-netbird/50 focus-visible:ring-offset-2 focus-visible:ring-offset-nb-gray-930",
                  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-netbird disabled:active:scale-100",
                )}
              >
                {loading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin text-white/70"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span>Signing in…</span>
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-nb-gray-700">
          <ShieldCheck size={11} aria-hidden="true" />
          <span>Protected by Zero Trust policy enforcement</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
