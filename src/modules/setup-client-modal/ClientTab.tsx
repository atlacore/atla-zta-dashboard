import Code from "@components/Code";
import InlineLink from "@components/InlineLink";
import Steps from "@components/Steps";
import TabsContentPadding, { TabsContent } from "@components/Tabs";
import loadConfig from "@utils/config";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon, TerminalSquareIcon } from "lucide-react";
import React, { useState } from "react";
import {
  ClientArch,
  REPOSITORY_URL,
  useLatestClientRelease,
} from "@/hooks/useLatestClientRelease";
import { OperatingSystem } from "@/interfaces/OperatingSystem";

type Props = {
  os: OperatingSystem.LINUX | OperatingSystem.APPLE;
};

// The commands point at the main (production) host from the dashboard config.
const config = loadConfig();

const ARN_PLACEHOLDER =
  "arn:atla:net:<region>:<tenant-id>:resource:<resource-id>";

const ARCHES: ClientArch[] = ["amd64", "arm64"];

// Linux: the prebuilt archive from the latest GitHub release.
function LinuxInstall() {
  const [arch, setArch] = useState<ClientArch>("amd64");
  const { version, releaseUrl, asset } = useLatestClientRelease();
  const download = asset(arch);

  const commands = download
    ? [
        `curl -fsSLO ${download.url}`,
        `tar -xzf ${download.name}`,
        `sudo install -m 0755 ${download.name.replace(
          /\.tar\.gz$/,
          "",
        )}/atla-client /usr/local/bin/atla-client`,
      ]
    : [
        `tar -xzf atla-client_*_linux_${arch}.tar.gz`,
        "sudo install -m 0755 atla-client_*/atla-client /usr/local/bin/atla-client",
      ];

  return (
    <>
      <p>
        Download the latest <code>atla-client</code> release and install it
      </p>
      <div className={"mt-2 flex flex-wrap items-center gap-3 text-xs"}>
        <div
          className={
            "flex items-center gap-1 rounded-md border border-nb-gray-900 bg-nb-gray-930/70 p-0.5"
          }
        >
          {ARCHES.map((option) => (
            <button
              key={option}
              type={"button"}
              onClick={() => setArch(option)}
              className={cn(
                "rounded px-2.5 py-1 transition-colors",
                arch === option
                  ? "bg-nb-gray-800 text-nb-gray-50"
                  : "text-nb-gray-400 hover:text-nb-gray-200",
              )}
            >
              linux {option}
            </button>
          ))}
        </div>
        <InlineLink href={download?.url ?? releaseUrl} target={"_blank"}>
          {download
            ? `${download.name}${version ? ` (${version})` : ""}`
            : "Latest release on GitHub"}
          <ExternalLinkIcon size={12} />
        </InlineLink>
      </div>
      <Code codeToCopy={commands.join("\n")}>
        {commands.map((line) => (
          <Code.Line key={line}>{line}</Code.Line>
        ))}
      </Code>
    </>
  );
}

// macOS has no prebuilt archive yet, so the client is built from the repository.
function MacInstall() {
  const commands = [
    "go build -o atla-client ./cmd/atla-client",
    "sudo install -m 0755 atla-client /usr/local/bin/atla-client",
  ];

  return (
    <>
      <p>
        Build <code>atla-client</code> from the{" "}
        <InlineLink href={REPOSITORY_URL} target={"_blank"}>
          atla-zta repository
          <ExternalLinkIcon size={12} />
        </InlineLink>{" "}
        (Go required) and install it
      </p>
      <Code codeToCopy={commands.join("\n")}>
        {commands.map((line) => (
          <Code.Line key={line}>{line}</Code.Line>
        ))}
      </Code>
    </>
  );
}

export default function ClientTab({ os }: Readonly<Props>) {
  const url = config.publicUrl;
  const isLinux = os === OperatingSystem.LINUX;

  const runCommand = [
    "export ATLA_DEVICE_KEY_PASSPHRASE='choose-a-passphrase'",
    "sudo -E atla-client \\",
    `  --control-plane ${url} \\`,
    '  --token "$TOKEN" \\',
    "  --device-id my-laptop \\",
    `  --arn ${ARN_PLACEHOLDER}`,
  ].join("\n");

  const loginCommand = [
    `export TOKEN=$(curl -s ${url}/api/auth/login \\`,
    "  -H 'Content-Type: application/json' \\",
    `  -d '{"email":"you@example.com","password":"..."}' | jq -r .token)`,
  ].join("\n");

  return (
    <TabsContent value={String(os)}>
      <TabsContentPadding>
        <p className={"font-medium flex gap-3 items-center text-base"}>
          <TerminalSquareIcon size={16} />
          Install and connect from the terminal
        </p>
        <Steps>
          <Steps.Step step={1}>
            {isLinux ? <LinuxInstall /> : <MacInstall />}
          </Steps.Step>

          <Steps.Step step={2}>
            <p>
              Create an SDK key on the{" "}
              <InlineLink href={"/sdk-keys"} target={"_blank"}>
                SDK Keys
                <ExternalLinkIcon size={12} />
              </InlineLink>{" "}
              page (it is shown once) and export it. The client sends it as{" "}
              <code>X-SDK-Key</code>; it acts as you and, unlike a login token,
              does not expire after an hour
            </p>
            <Code codeToCopy={"export TOKEN='<your-sdk-key>'"}>
              <Code.Line>{"export TOKEN='<your-sdk-key>'"}</Code.Line>
            </Code>
            <p className={"mt-3 text-xs text-nb-gray-400"}>
              For a quick try you can use a login token instead (valid for about
              an hour):
            </p>
            <Code codeToCopy={loginCommand}>
              {loginCommand.split("\n").map((line) => (
                <Code.Line key={line}>{line}</Code.Line>
              ))}
            </Code>
          </Steps.Step>

          <Steps.Step step={3} line={false}>
            <p>
              Run the client: it enrolls this device and brings up the tunnel.
              Pick the ARN of a resource or network you have access to, for
              example from the Resources page or the Access Simulator
            </p>
            <Code codeToCopy={runCommand}>
              {runCommand.split("\n").map((line) => (
                <Code.Line key={line}>{line}</Code.Line>
              ))}
            </Code>
          </Steps.Step>
        </Steps>
      </TabsContentPadding>
    </TabsContent>
  );
}
