"use client";

import Badge from "@components/Badge";
import { useApiCall } from "@utils/api";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import React, { useState } from "react";
import { useUsers } from "@/contexts/UsersProvider";
import {
  AccessPolicySimulationRequest,
  AccessPolicySimulationResponse,
  SimulationChange,
  SimulationVerdict,
} from "@/interfaces/AccessPolicy";

const changeBadges: Record<SimulationChange, { label: string; variant: "green" | "red" | "yellow" }> = {
  gained: { label: "Gains access", variant: "green" },
  lost: { label: "Loses access", variant: "red" },
  traffic_changed: { label: "Other ports", variant: "yellow" },
};

// Runs POST /ui/access-policies/simulate; errors (a draft that does not compile) stay in the dialog, not a toast
export function usePolicySimulation() {
  const call = useApiCall<AccessPolicySimulationResponse>("/ui/access-policies/simulate", true);
  const [result, setResult] = useState<AccessPolicySimulationResponse>();
  const [error, setError] = useState<string>();
  const [running, setRunning] = useState(false);

  const run = (draft: AccessPolicySimulationRequest) => {
    setRunning(true);
    setError(undefined);
    return call
      .post(draft)
      .then(setResult)
      .catch((err: { message?: string }) => {
        setResult(undefined);
        setError(err?.message || "Simulation failed");
      })
      .finally(() => setRunning(false));
  };
  const reset = () => {
    setResult(undefined);
    setError(undefined);
  };
  return { run, reset, result, error, running } as const;
}

// "all traffic", or e.g. "tcp 22, 443 · icmp"; "no access" when not granted
function trafficLabel(v: SimulationVerdict) {
  if (!v.granted) return v.denied ? "denied" : "no access";
  if (!v.traffic?.length) return "all traffic";
  return v.traffic
    .map((f) => (f.ports?.length ? `${f.protocol} ${f.ports.join(", ")}` : f.protocol === "icmp" ? "icmp" : `${f.protocol} all ports`))
    .join(" · ");
}

// the resource or network id is enough to tell rows apart, the full ARN sits in the tooltip
function shortARN(arn: string) {
  const parts = arn.split(":");
  return parts.length >= 7 ? `${parts[5]}:${parts[6].slice(0, 8)}…` : arn;
}

type Props = {
  result?: AccessPolicySimulationResponse;
  error?: string;
  running: boolean;
};

export default function PolicySimulationResult({ result, error, running }: Readonly<Props>) {
  const { users } = useUsers();
  const userLabel = (id: string) => {
    const u = users?.find((x) => x.id === id);
    return u?.displayName || u?.email || id.slice(0, 8);
  };

  if (running) return <p className={"text-sm text-nb-gray-400"}>Checking the impact…</p>;
  if (error)
    return (
      <div className={"flex gap-2 text-sm text-red-400"}>
        <AlertTriangle size={16} className={"shrink-0 mt-0.5"} />
        <span>{error}</span>
      </div>
    );
  if (!result) return null;

  const rows = [
    ...result.sessions.map((r) => ({ ...r, where: `session on ${r.deviceId}` })),
    ...result.access.map((r) => ({ ...r, where: "user" })),
  ];

  return (
    <div className={"flex flex-col gap-3"}>
      <p className={"text-sm text-nb-gray-300"}>
        Checked {result.evaluatedGrants} active grant{result.evaluatedGrants === 1 ? "" : "s"} and{" "}
        {result.evaluatedPairs} user × resource pair{result.evaluatedPairs === 1 ? "" : "s"}
        {result.truncated && " (stopped at the limit, more may change)"}.{" "}
        {rows.length === 0 ? "Nothing changes." : `${rows.length} change${rows.length === 1 ? "" : "s"}:`}
      </p>
      {rows.length > 0 && (
        <div className={"max-h-72 overflow-y-auto rounded-md border border-nb-gray-900"}>
          <table className={"w-full text-xs"}>
            <thead className={"text-nb-gray-400 text-left"}>
              <tr>
                <th className={"px-3 py-2 font-normal"}>Who</th>
                <th className={"px-3 py-2 font-normal"}>Target</th>
                <th className={"px-3 py-2 font-normal"}>Change</th>
                <th className={"px-3 py-2 font-normal"}>Before → after</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={"border-t border-nb-gray-900 text-nb-gray-200"}>
                  <td className={"px-3 py-2"}>
                    {userLabel(r.userId)}
                    <div className={"text-nb-gray-500"}>{r.where}</div>
                  </td>
                  <td className={"px-3 py-2 font-mono"} title={r.arn}>
                    {shortARN(r.arn)}
                  </td>
                  <td className={"px-3 py-2"}>
                    <Badge variant={changeBadges[r.change].variant} size={"xs"}>
                      {changeBadges[r.change].label}
                    </Badge>
                    {r.postureDependent && (
                      <span title={"A rule for this target has posture checks; the result assumes the device's claimed posture fails them"}>
                        <ShieldAlert size={13} className={"inline ml-1 text-yellow-400"} />
                      </span>
                    )}
                  </td>
                  <td className={"px-3 py-2"}>
                    {trafficLabel(r.before)} → {trafficLabel(r.after)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {result.warnings?.map((w) => (
        <p key={w} className={"text-xs text-yellow-400"}>
          {w}
        </p>
      ))}
    </div>
  );
}
