"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/Accordion";
import Breadcrumbs from "@components/Breadcrumbs";
import { Input } from "@components/Input";
import ArticleContent from "@components/support/ArticleContent";
import Paragraph from "@components/Paragraph";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { BookOpen, Search } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSupportStatus } from "@/hooks/useSupportEnabled";
import { SupportArticle } from "@/interfaces/Support";
import PageContainer from "@/layouts/PageContainer";

const ALL_CATEGORIES = "";
const UNCATEGORIZED = "Other";

function matches(article: SupportArticle, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [article.title, article.description ?? "", article.content].some(
    (text) => text.toLowerCase().includes(needle),
  );
}

function FaqContent() {
  const { data: articles, isLoading, error } = useFetchApi<SupportArticle[]>(
    "/ui/support/faq",
    true,
    false,
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);

  const categories = useMemo(
    () =>
      Array.from(
        new Set((articles ?? []).map((a) => a.category || UNCATEGORIZED)),
      ).sort(),
    [articles],
  );

  const visible = useMemo(
    () =>
      (articles ?? []).filter(
        (article) =>
          (category === ALL_CATEGORIES ||
            (article.category || UNCATEGORIZED) === category) &&
          matches(article, query),
      ),
    [articles, category, query],
  );

  if (isLoading) return <FullScreenLoading />;

  if (error) {
    return (
      <Paragraph className={"mt-6"}>
        The help articles could not be loaded right now. Try again later.
      </Paragraph>
    );
  }

  return (
    <>
      <div className={"mt-8 flex flex-col gap-5"}>
        <Input
          value={query}
          placeholder={"Search articles…"}
          icon={<Search size={14} />}
          onChange={(event) => setQuery(event.target.value)}
        />
        {categories.length > 1 && (
          <div className={"flex flex-wrap gap-2"}>
            {[ALL_CATEGORIES, ...categories].map((name) => (
              <button
                key={name || "all"}
                type={"button"}
                onClick={() => setCategory(name)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs transition-colors",
                  category === name
                    ? "border-nb-gray-600 bg-nb-gray-800 text-white"
                    : "border-nb-gray-800 text-nb-gray-300 hover:bg-nb-gray-900",
                )}
              >
                {name || "All"}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <Paragraph className={"mt-8"}>
          {articles?.length
            ? "No articles match your search."
            : "There are no help articles yet."}{" "}
          Use the support button in the bottom-right corner to ask us directly.
        </Paragraph>
      ) : (
        <Accordion
          type={"single"}
          collapsible
          className={"mt-10 flex flex-col gap-3"}
        >
          {visible.map((article) => (
            <AccordionItem
              key={article.id}
              value={String(article.id)}
              className={cn(
                "rounded-md border border-nb-gray-900 bg-nb-gray-930/60 transition-colors",
                "hover:border-nb-gray-800 data-[state=open]:border-nb-gray-800 data-[state=open]:bg-nb-gray-920/60",
              )}
            >
              <AccordionTrigger className={"text-sm text-nb-gray-100 !my-0 px-5 py-4"}>
                {article.title}
              </AccordionTrigger>
              <AccordionContent>
                <div
                  className={
                    "mx-5 border-t border-nb-gray-900 pt-5 pb-6 text-sm text-nb-gray-300 break-words [&>*:first-child]:mt-0"
                  }
                >
                  <ArticleContent>{article.content}</ArticleContent>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </>
  );
}

export default function HelpPage() {
  const { enabled, isLoading } = useSupportStatus();

  return (
    <PageContainer>
      <div className={"p-default py-6 max-w-6xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/help"}
            label={"Help"}
            icon={<BookOpen size={13} />}
          />
        </Breadcrumbs>
        <h1>Help</h1>
        <Paragraph>
          Answers to common questions. If you cannot find yours, contact
          support with the button in the bottom-right corner.
        </Paragraph>
        {isLoading ? (
          <FullScreenLoading />
        ) : enabled ? (
          <FaqContent />
        ) : (
          <Paragraph className={"mt-6"}>
            Help articles are not available for this installation.
          </Paragraph>
        )}
      </div>
    </PageContainer>
  );
}
