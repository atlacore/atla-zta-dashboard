import React from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown ignores raw HTML and filters unsafe URL schemes, so article bodies stay inert.
const components: Components = {
  h1: (props) => <h2 className={"text-lg font-medium text-nb-gray-100 mt-6 mb-2"} {...props} />,
  h2: (props) => <h2 className={"text-lg font-medium text-nb-gray-100 mt-6 mb-2"} {...props} />,
  h3: (props) => <h3 className={"text-base font-medium text-nb-gray-100 mt-5 mb-2"} {...props} />,
  h4: (props) => <h4 className={"text-sm font-medium text-nb-gray-100 mt-4 mb-1"} {...props} />,
  p: (props) => <p className={"my-3 leading-relaxed"} {...props} />,
  ul: (props) => <ul className={"my-3 list-disc pl-6 space-y-1"} {...props} />,
  ol: (props) => <ol className={"my-3 list-decimal pl-6 space-y-1"} {...props} />,
  a: ({ href, ...props }) => (
    <a
      href={href}
      target={"_blank"}
      rel={"noopener noreferrer"}
      className={"text-netbird underline underline-offset-2"}
      {...props}
    />
  ),
  img: ({ alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt ?? ""}
      loading={"lazy"}
      className={"my-4 h-auto w-auto max-h-[28rem] max-w-full rounded-md border border-nb-gray-900"}
      {...props}
    />
  ),
  code: (props) => (
    <code className={"rounded bg-nb-gray-900 px-1.5 py-0.5 text-xs font-mono"} {...props} />
  ),
  pre: (props) => (
    <pre
      className={"my-4 overflow-x-auto rounded-md bg-nb-gray-950 border border-nb-gray-900 p-3 text-xs [&_code]:bg-transparent [&_code]:p-0"}
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote className={"my-4 border-l-2 border-nb-gray-700 pl-4 text-nb-gray-400"} {...props} />
  ),
  table: (props) => (
    <div className={"my-4 overflow-x-auto"}>
      <table className={"w-full text-left text-sm"} {...props} />
    </div>
  ),
  th: (props) => <th className={"border-b border-nb-gray-800 px-3 py-2 font-medium"} {...props} />,
  td: (props) => <td className={"border-b border-nb-gray-900 px-3 py-2"} {...props} />,
  hr: () => <hr className={"my-6 border-nb-gray-900"} />,
};

export default function ArticleContent({ children }: Readonly<{ children: string }>) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
