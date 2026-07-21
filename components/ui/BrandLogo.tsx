"use client";

import Image from "next/image";
import Link from "next/link";
import { usePlatformSettings } from "@/components/providers/PlatformSettingsProvider";
import { cn } from "@/lib/cn";

interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
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

function brandMarkImageSize(size: "sm" | "md" | "lg") {
  if (size === "sm") {
    return {
      container: "h-8 max-w-[7.5rem]",
      width: 120,
      height: 32,
    };
  }
  if (size === "lg") {
    return {
      container: "h-10 max-w-[11rem] sm:h-11 sm:max-w-[13rem]",
      width: 208,
      height: 44,
    };
  }
  return {
    container: "h-9 max-w-[9rem]",
    width: 144,
    height: 36,
  };
}

function BrandMark({
  size,
  logoUrl,
  platformName,
}: {
  size: "sm" | "md" | "lg";
  logoUrl: string | null;
  platformName: string;
}) {
  const markSize =
    size === "sm"
      ? "brand-mark-sm"
      : size === "lg"
        ? "brand-mark-lg"
        : "brand-mark-md";
  const imageSize = brandMarkImageSize(size);

  if (logoUrl) {
    return (
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden",
          imageSize.container,
        )}
      >
        <Image
          src={logoUrl}
          alt={`Logo de ${platformName}`}
          width={imageSize.width}
          height={imageSize.height}
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
