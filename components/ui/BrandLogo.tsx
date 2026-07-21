"use client";

import Image from "next/image";
import Link from "next/link";
import { usePlatformSettings } from "@/components/providers/PlatformSettingsProvider";
import { cn } from "@/lib/cn";

interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md";
  showName?: boolean;
  subtitle?: string;
  className?: string;
  centered?: boolean;
  theme?: "light" | "dark";
  /** Sobrescribe el logo de plataforma (p. ej. vista previa en admin). */
  logoUrl?: string | null;
  /** Sobrescribe el nombre de plataforma. */
  platformName?: string;
}

function BrandMark({
  size,
  logoUrl,
  platformName,
}: {
  size: "sm" | "md";
  logoUrl: string | null;
  platformName: string;
}) {
  const markSize = size === "sm" ? "brand-mark-sm" : "brand-mark-md";

  if (logoUrl) {
    return (
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden",
          size === "sm" ? "h-8 max-w-[7.5rem]" : "h-9 max-w-[9rem]",
        )}
      >
        <Image
          src={logoUrl}
          alt={`Logo de ${platformName}`}
          width={size === "sm" ? 120 : 144}
          height={size === "sm" ? 32 : 36}
          className="h-full w-auto max-w-full object-contain object-left"
          unoptimized={logoUrl.includes("?v=")}
        />
      </span>
    );
  }

  return <span className={cn("brand-mark", markSize)}>a</span>;
}

export function BrandLogo({
  href = "/",
  size = "md",
  showName = true,
  subtitle,
  className = "",
  centered = false,
  theme = "light",
  logoUrl: logoUrlOverride,
  platformName: platformNameOverride,
}: BrandLogoProps) {
  const platform = usePlatformSettings();
  const logoUrl = logoUrlOverride !== undefined ? logoUrlOverride : platform.logoUrl;
  const platformName =
    platformNameOverride !== undefined
      ? platformNameOverride
      : platform.platformName;

  const nameClass =
    theme === "dark"
      ? "block truncate text-base font-bold tracking-tight text-zinc-50"
      : "block truncate text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50";
  const subtitleClass =
    theme === "dark"
      ? "block truncate text-xs font-medium text-zinc-400"
      : "brand-subtitle block truncate";

  const content = (
    <>
      <BrandMark size={size} logoUrl={logoUrl} platformName={platformName} />
      {(showName || subtitle) && (
        <div className="min-w-0">
          {showName && (
            <span className={nameClass}>{platformName.toLowerCase()}</span>
          )}
          {subtitle && <span className={subtitleClass}>{subtitle}</span>}
        </div>
      )}
    </>
  );

  const baseClass = cn(
    "flex min-w-0 items-center gap-2.5",
    centered && "justify-center",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
