"use client";

import loadConfig from "@utils/config";
import { cn } from "@utils/helpers";
import { Laptop, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { auth } from "@/utils/auth";
import { User } from "@/interfaces/User";

const config = loadConfig();

// The desktop client opens this page with its PKCE challenge and loopback address; the user approves it here,
// the control plane hands back a one-off code and the browser carries it to the client (RFC 8252).
type DeviceLoginRequest = {
  deviceId: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  state: string;
};

function readRequest(params: URLSearchParams): DeviceLoginRequest | null {
  const req = {
    deviceId: params.get("device_id") ?? "",
    codeChallenge: params.get("code_challenge") ?? "",
    codeChallengeMethod: params.get("code_challenge_method") ?? "",
    redirectUri: params.get("redirect_uri") ?? "",
    state: params.get("state") ?? "",
  };
  return Object.values(req).every(Boolean) ? req : null;
}

// Back to the login with this page (and the client's request in its query) as the place to return to
function signInAgain() {
  auth.clearToken();
  window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
}

// Only a loopback address may receive the code; the control plane checks again
function isLoopback(uri: string) {
  try {
    const u = new URL(uri);
    return u.protocol === "http:" && (u.hostname === "127.0.0.1" || u.hostname === "[::1]");
  } catch {
    return false;
  }
}

function DeviceLogin() {
  const params = useSearchParams();
  const request = readRequest(params);
  const [user, setUser] = useState<User>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string>();

  // A stored token the control plane no longer accepts (expired, keys rotated) means signing in again
  useEffect(() => {
    fetch(`${config.apiOrigin}/api/ui/user`, { headers: { "X-User-Token": auth.getToken() ?? "" } })
      .then((res) => {
        if (res.status === 401) signInAgain();
        return res.ok ? res.json() : undefined;
      })
      .then(setUser)
      .catch(() => undefined);
  }, []);

  if (!request || !isLoopback(request.redirectUri)) {
    return <Card><p className={"text-[13px] text-red-400"}>This sign-in link is incomplete. Start the sign-in again from the Atla app.</p></Card>;
  }

  const approve = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch(`${config.apiOrigin}/api/ui/device-logins`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Token": auth.getToken() ?? "" },
        body: JSON.stringify(request),
      });
      if (res.status === 401) return signInAgain();
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || body.error || body.validation_error || "Could not sign the device in");
      setDone("Returning to the Atla app…");
      window.location.href = body.redirectUrl;
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  const cancel = () => {
    setDone("Sign-in cancelled. You can close this tab.");
    const back = new URL(request.redirectUri);
    back.search = new URLSearchParams({ error: "access_denied", state: request.state }).toString();
    window.location.href = back.toString();
  };

  if (done) {
    return <Card><p className={"text-[13px] text-nb-gray-300"}>{done}</p></Card>;
  }

  return (
    <Card>
      <div className={"flex flex-col gap-4 text-left"}>
        <p className={"text-[15px] font-medium text-nb-gray-100"}>Sign in the Atla app on this device?</p>
        <div className={"flex items-center gap-3 rounded-lg border border-nb-gray-900 bg-nb-gray-940 px-3 py-2"}>
          <Laptop size={16} className={"shrink-0 text-nb-gray-400"} />
          <span className={"font-mono text-[13px] text-nb-gray-200 break-all"}>{request.deviceId}</span>
        </div>
        <p className={"text-[13px] text-nb-gray-400"}>
          The app will connect as {user?.email || user?.displayName || "you"} with your access policies. Only approve it if
          you just started the sign-in from the Atla app on your own computer.
        </p>
        {error && <p className={"text-[13px] text-red-400"}>{error}</p>}
        <div className={"flex gap-2"}>
          <button
            onClick={approve}
            disabled={busy}
            className={cn(
              "h-10 flex-1 rounded-lg bg-netbird text-sm font-medium text-white hover:bg-netbird-500",
              "disabled:opacity-60",
            )}
          >
            {busy ? "Signing in…" : "Allow"}
          </button>
          <button
            onClick={cancel}
            disabled={busy}
            className={"h-10 flex-1 rounded-lg border border-nb-gray-900 text-sm text-nb-gray-300 hover:bg-nb-gray-930"}
          >
            Cancel
          </button>
        </div>
      </div>
    </Card>
  );
}

function Card({ children }: Readonly<{ children: React.ReactNode }>) {
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
        </div>
        <div className="overflow-hidden rounded-2xl border border-nb-gray-900/80 bg-nb-gray-930 shadow-2xl ring-1 ring-white/[0.03]">
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-netbird/40 to-transparent" />
          <div className="px-8 py-8 text-center">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function DeviceLoginPage() {
  return (
    <Suspense>
      <DeviceLogin />
    </Suspense>
  );
}
