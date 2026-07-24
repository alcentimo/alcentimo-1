"use client";

import Link from "next/link";
import { Fragment, useMemo } from "react";
import { cn } from "@/lib/cn";

type MessageSegment =
  | { type: "text"; value: string }
  | { type: "link"; label: string; href: string };

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

const ALLOWED_LINK_PREFIXES = [
  "/dashboard/catalogo",
  "/dashboard/pedidos",
  "/dashboard/clientes",
  "/dashboard/analiticas",
  "/dashboard/asistente",
  "/dashboard/ajustes",
  "/dashboard/productos",
  "/dashboard/inventario",
];

function normalizeHref(rawHref: string): string {
  const href = rawHref.trim();
  if (!href.startsWith("/")) return "";
  if (href.includes("://") || href.startsWith("//")) return "";
  const [pathname] = href.split(/[?#]/);
  const allowed = ALLOWED_LINK_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return allowed ? href : "";
}

function parseAssistantMessageContent(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(MARKDOWN_LINK_PATTERN)) {
    const fullMatch = match[0];
    const label = match[1]?.trim() ?? "";
    const href = normalizeHref(match[2] ?? "");
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      segments.push({
        type: "text",
        value: content.slice(lastIndex, matchIndex),
      });
    }

    if (label && href) {
      segments.push({ type: "link", label, href });
    } else {
      segments.push({ type: "text", value: fullMatch });
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: content }];
}

interface AssistantMessageContentProps {
  content: string;
  variant?: "assistant" | "user";
}

export function AssistantMessageContent({
  content,
  variant = "assistant",
}: AssistantMessageContentProps) {
  const segments = useMemo(
    () => parseAssistantMessageContent(content),
    [content],
  );

  return (
    <span className="owner-assistant-message-content">
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return (
            <Fragment key={`text-${index}`}>
              {segment.value.split("\n").map((line, lineIndex, lines) => (
                <Fragment key={`line-${index}-${lineIndex}`}>
                  {line}
                  {lineIndex < lines.length - 1 ? <br /> : null}
                </Fragment>
              ))}
            </Fragment>
          );
        }

        return (
          <Link
            key={`link-${index}-${segment.href}`}
            href={segment.href}
            className={cn(
              "owner-assistant-inline-link",
              variant === "user" && "owner-assistant-inline-link-user",
            )}
          >
            {segment.label}
          </Link>
        );
      })}
    </span>
  );
}
