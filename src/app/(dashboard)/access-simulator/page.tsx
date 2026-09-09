"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import Card from "@components/Card";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import Paragraph from "@components/Paragraph";
import { SmallBadge } from "@components/ui/SmallBadge";
import useFetchApi, { useApiCall } from "@utils/api";
import { CheckCircle2, FlaskConicalIcon, XCircle } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useUsers } from "@/contexts/UsersProvider";
import { Resource } from "@/interfaces/Resource";
import PageContainer from "@/layouts/PageContainer";
import { buildResourceArn } from "@/utils/arn";

interface EvaluateResponse {
  allow: boolean;
  reason?: string;
  decision_token?: string;
  policy?: unknown;
  delivery_preview?: { kind?: string; credProfile?: string };
}

const NO_RESOURCE = "__manual__";

export default function AccessSimulatorPage() {
  const { users } = useUsers();
  const { data: resources } = useFetchApi<Resource[]>("/ui/resources");
  const evaluateRequest = useApiCall<EvaluateResponse>("/access/evaluate");

  const [resourceId, setResourceId] = useState(NO_RESOURCE);
  const [arn, setArn] = useState("");
  const [subject, setSubject] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EvaluateResponse | null>(null);

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
    evaluateRequest
      .post({ arn: effectiveArn.trim(), subject: subject.trim() })
      .then((res) => res && setResult(res))
      .finally(() => setIsLoading(false));
  };

  const canEvaluate = !!effectiveArn.trim() && !!subject.trim() && !isLoading;

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
        <Card className={"w-full xl:w-[420px] xl:shrink-0 p-6 flex flex-col gap-4"}>
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
          {!result && (
            <Card className={"w-full p-6 text-sm text-nb-gray-400"}>
              Fill in a resource (or ARN) and a subject, then Evaluate to see
              the PDP decision here.
            </Card>
          )}
          {result && (
            <Card className={"w-full p-6 flex flex-col gap-4"}>
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

              {result.policy !== undefined && result.policy !== null && (
                <div>
                  <Label>Raw decision</Label>
                  <pre
                    className={
                      "font-mono text-xs bg-nb-gray-900/40 rounded-md p-3 overflow-x-auto"
                    }
                  >
                    {JSON.stringify(result.policy, null, 2)}
                  </pre>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
