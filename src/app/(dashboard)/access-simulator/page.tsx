"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import Card from "@components/Card";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import Paragraph from "@components/Paragraph";
import { SmallBadge } from "@components/ui/SmallBadge";
import useFetchApi from "@utils/api";
import { SignedRequestError } from "@utils/deviceAuth/signedFetch";
import { useSignedApiCall } from "@/hooks/useSignedApiCall";
import { AlertCircle, CheckCircle2, CheckIcon, CopyIcon, FlaskConicalIcon, ShieldCheckIcon, XCircle } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLoggedInUser, useUsers } from "@/contexts/UsersProvider";
import { Resource } from "@/interfaces/Resource";
import PageContainer from "@/layouts/PageContainer";
import { buildResourceArn } from "@/utils/arn";

interface EvaluateResponse {
  allow: boolean;
  reason?: string;
  decision_token?: string;
  policy?: unknown;
  delivery_preview?: { kind?: string; credProfile?: string };
  signature?: {
    alg?: string;
    kid?: string;
    value?: string;
    nonce?: string;
    public_key?: string;
    certificate?: string;
  };
}

const NO_RESOURCE = "__manual__";

type EvaluateError = {
  title: string;
  message: string;
  /** The server only evaluates access for the signed-in user, so offer to switch to them. */
  subjectMismatch?: boolean;
};

function describeEvaluateError(err: unknown): EvaluateError {
  const message = err instanceof Error ? err.message : "Evaluate failed";
  if (err instanceof SignedRequestError) {
    if (err.untrusted) {
      return {
        title: "Untrusted response",
        message: `The response signature did not verify against the pinned CA: ${message}`,
      };
    }
    if (err.code === 403 && /subject mismatch/i.test(message)) {
      return {
        title: "Subject mismatch",
        message:
          "The server only evaluates access for the account you are signed in with, and the selected subject is a different user.",
        subjectMismatch: true,
      };
    }
    if (err.code === 401) {
      return {
        title: "Not authorized",
        message: `The request was rejected: ${message}`,
      };
    }
  }
  return { title: "Evaluation failed", message };
}

export default function AccessSimulatorPage() {
  const { users } = useUsers();
  const { data: resources } = useFetchApi<Resource[]>("/ui/resources");
  const evaluateRequest = useSignedApiCall<EvaluateResponse>("/access/evaluate");

  const [resourceId, setResourceId] = useState(NO_RESOURCE);
  const [arn, setArn] = useState("");
  const [subject, setSubject] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [error, setError] = useState<EvaluateError | null>(null);
  const [copied, setCopied] = useState(false);
  const { loggedInUser } = useLoggedInUser();

  const selectedResource = useMemo(
    () => resources?.find((r) => r.id === resourceId),
    [resources, resourceId],
  );

  const effectiveArn = useMemo(() => {
    if (selectedResource) return buildResourceArn(selectedResource);
    return arn;
  }, [selectedResource, arn]);

  const handleResourceChange = (id: string) => {
    setResourceId(id);
    if (id === NO_RESOURCE) setArn("");
  };

  const evaluate = () => {
    setIsLoading(true);
    setResult(null);
    setError(null);
    evaluateRequest
      .post({ arn: effectiveArn.trim(), subject: subject.trim() })
      .then((res) => res && setResult(res))
      .catch((err) => setError(describeEvaluateError(err)))
      .finally(() => setIsLoading(false));
  };

  const signingReady = evaluateRequest.support === "supported";
  const copyResponse = () => {
    if (!result) return;
    navigator.clipboard
      .writeText(JSON.stringify(result, null, 2))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error("Could not copy to clipboard"));
  };

  const canEvaluate = signingReady && !!effectiveArn.trim() && !!subject.trim() && !isLoading;

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/access-simulator"}
            label={"Access Simulator"}
            icon={<FlaskConicalIcon size={13} />}
          />
        </Breadcrumbs>
        <h1>Access Simulator</h1>
        <Paragraph>
          Dry-run{" "}
          <code className={"font-mono text-xs whitespace-nowrap"}>
            POST /access/evaluate
          </code>{" "}
          against the live PDP — no session or credentials are issued.
          Posture is omitted, so posture-conditional rules evaluate as not
          satisfied.
        </Paragraph>
      </div>

      <div className={"px-8 pb-8 flex flex-wrap xl:flex-nowrap gap-10 max-w-[1800px]"}>
        <Card className={"w-full xl:w-[420px] xl:shrink-0 xl:self-start p-6 flex flex-col gap-4"}>
          <div>
            <Label>Resource</Label>
            <HelpText>
              Pick a resource to build its ARN, or choose &quot;Manual ARN&quot;
              to type one directly.
            </HelpText>
            <select
              className={
                "w-full bg-nb-gray-900/30 border border-nb-gray-900 rounded-md px-3 py-2.5 text-sm focus:outline-none"
              }
              value={resourceId}
              onChange={(e) => handleResourceChange(e.target.value)}
            >
              <option value={NO_RESOURCE}>Manual ARN…</option>
              {resources?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.kind}, {r.region})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>ARN</Label>
            <Input
              value={effectiveArn}
              onChange={(e) => setArn(e.target.value)}
              placeholder={"arn:atla:net:eu-west-1:<tenant-id>:resource:<resource-id>"}
              disabled={!!selectedResource}
              className={"font-mono text-xs"}
            />
          </div>

          <div>
            <Label>Subject</Label>
            <HelpText>User UUID the policy is evaluated for.</HelpText>
            <select
              className={
                "w-full bg-nb-gray-900/30 border border-nb-gray-900 rounded-md px-3 py-2.5 text-sm focus:outline-none"
              }
              value={users?.some((u) => u.id === subject) ? subject : ""}
              onChange={(e) => e.target.value && setSubject(e.target.value)}
            >
              <option value={""}>Manual subject…</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName || u.email || u.id}
                </option>
              ))}
            </select>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={"user UUID"}
              className={"font-mono text-xs mt-2"}
            />
          </div>

          {evaluateRequest.support === "insecure-context" && (
            <HelpText>Request signing needs HTTPS (or localhost).</HelpText>
          )}
          {evaluateRequest.support === "unsupported" && (
            <HelpText>This browser lacks Ed25519 support, so signed responses cannot be verified.</HelpText>
          )}
          {evaluateRequest.deviceId && (
            <HelpText>
              Signing as device <code className={"font-mono"}>{evaluateRequest.deviceId}</code>
            </HelpText>
          )}

          <Button
            variant={"primary"}
            onClick={evaluate}
            disabled={!canEvaluate}
            className={"mt-2"}
          >
            <FlaskConicalIcon size={14} />
            {isLoading ? "Evaluating…" : "Evaluate"}
          </Button>
        </Card>

        <div className={"w-full xl:flex-1 xl:min-w-0"}>
          {error && (
            <Card
              className={
                "w-full p-6 flex flex-col gap-3 border-red-500/30 bg-red-500/5"
              }
            >
              <div className={"flex items-center gap-2"}>
                <AlertCircle size={20} className={"text-red-400"} />
                <span className={"text-lg font-medium"}>{error.title}</span>
              </div>
              <p className={"text-sm text-nb-gray-300"}>{error.message}</p>
              {error.subjectMismatch && loggedInUser && (
                <div>
                  <Button
                    variant={"secondary"}
                    onClick={() => {
                      setSubject(loggedInUser.id);
                      setError(null);
                    }}
                  >
                    Use my account
                  </Button>
                </div>
              )}
            </Card>
          )}
          {!result && !error && (
            <Card className={"w-full p-6 text-sm text-nb-gray-400"}>
              Fill in a resource (or ARN) and a subject, then Evaluate to see
              the PDP decision here.
            </Card>
          )}
          {result && (
            <Card className={"relative w-full p-6 flex flex-col gap-4"}>
              <button
                type={"button"}
                onClick={copyResponse}
                title={"Copy response JSON"}
                className={
                  "absolute top-4 right-4 p-2 rounded-md text-nb-gray-300 hover:text-white hover:bg-nb-gray-900/60 transition-colors"
                }
              >
                {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              </button>
              <div className={"flex items-center gap-2"}>
                {result.allow ? (
                  <CheckCircle2 size={20} className={"text-emerald-400"} />
                ) : (
                  <XCircle size={20} className={"text-red-400"} />
                )}
                <span className={"text-lg font-medium"}>
                  {result.allow ? "Allow" : "Deny"}
                </span>
                <SmallBadge
                  text={result.allow ? "allow" : "deny"}
                  variant={result.allow ? "green" : "yellow"}
                  size={"md"}
                />
              </div>

              {result.reason && (
                <div>
                  <Label>Reason</Label>
                  <p className={"text-sm text-nb-gray-300"}>{result.reason}</p>
                </div>
              )}

              {result.delivery_preview && (
                <div>
                  <Label>Delivery preview</Label>
                  <div className={"flex gap-2 mt-1"}>
                    {result.delivery_preview.kind && (
                      <SmallBadge
                        text={`kind: ${result.delivery_preview.kind}`}
                        variant={"blue"}
                        size={"md"}
                      />
                    )}
                    {result.delivery_preview.credProfile && (
                      <SmallBadge
                        text={`creds: ${result.delivery_preview.credProfile}`}
                        variant={"sky"}
                        size={"md"}
                      />
                    )}
                  </div>
                </div>
              )}

              {result.signature && (
                <div>
                  <Label>Response signature</Label>
                  <div className={"flex flex-wrap items-center gap-2 mt-1"}>
                    <SmallBadge text={"verified against pinned CA"} variant={"green"} size={"md"} />
                    {result.signature.alg && (
                      <SmallBadge text={result.signature.alg} variant={"blue"} size={"md"} />
                    )}
                    {result.signature.kid && (
                      <SmallBadge text={`kid: ${result.signature.kid}`} variant={"sky"} size={"md"} />
                    )}
                  </div>
                  <p className={"font-mono text-xs text-nb-gray-400 break-all mt-2"}>
                    <ShieldCheckIcon size={12} className={"inline mr-1"} />
                    {result.signature.value}
                  </p>
                </div>
              )}

              <div>
                <Label>Raw response</Label>
                <pre
                  className={
                    "font-mono text-xs bg-nb-gray-900/40 rounded-md p-3 overflow-x-auto"
                  }
                >
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
