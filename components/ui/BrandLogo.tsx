"use client";

import Image from "next/image";
import Link from "next/link";
import { BrandIsotype } from "@/components/ui/BrandIsotype";
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
  /** Estilo de alto contraste para la landing pública. */
  variant?: "default" | "landing";
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

function isVectorLogoUrl(logoUrl: string): boolean {
  const normalized = logoUrl.split("?")[0]?.toLowerCase() ?? "";
  return normalized.endsWith(".svg");
}

function BrandMark({
  size,
  logoUrl,
  platformName,
  variant = "default",
}: {
  size: "sm" | "md" | "lg";
  logoUrl: string | null;
  platformName: string;
  variant?: "default" | "landing";
}) {
  const useSvgIsotype =
    variant === "landing" || !logoUrl || (logoUrl ? isVectorLogoUrl(logoUrl) : false);

  if (useSvgIsotype) {
    return <BrandIsotype size={size} variant={variant} />;
  }

  const imageSize = brandMarkImageSize(size);

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

export function BrandLogo({
  href = "/",
  size = "md",
  showName = true,
  subtitle,
  className = "",
  centered = false,
  theme = "light",
  variant = "default",
  logoUrl: logoUrlOverride,
  platformName: platformNameOverride,
}: BrandLogoProps) {
  const platform = usePlatformSettings();
  const logoUrl = logoUrlOverride !== undefined ? logoUrlOverride : platform.logoUrl;
  const platformName =
    platformNameOverride !== undefined
      ? platformNameOverride
      : platform.platformName;

  const isLanding = variant === "landing";
  const resolvedTheme = isLanding ? "light" : theme;

  const nameClass = cn(
    "brand-logo-name truncate font-bold tracking-tight leading-none",
    size === "lg" ? "text-lg sm:text-xl" : "text-base",
    isLanding
      ? "text-emerald-950"
      : resolvedTheme === "dark"
        ? "text-zinc-50"
        : "text-zinc-900 dark:text-zinc-50",
  );
  const subtitleClass =
    resolvedTheme === "dark"
      ? "truncate text-xs font-medium leading-tight text-zinc-400"
      : "brand-subtitle truncate leading-tight";

  const displayName = isLanding
    ? platformName.trim() || "Alcentimo"
    : platformName.toLowerCase();

  const content = (
    <>
      <BrandMark
        size={size}
        logoUrl={logoUrl}
        platformName={platformName}
        variant={variant}
      />
      {(showName || subtitle) && (
        <span className="brand-logo-wordmark flex min-w-0 flex-col justify-center gap-0.5">
          {showName && <span className={nameClass}>{displayName}</span>}
          {subtitle && <span className={subtitleClass}>{subtitle}</span>}
        </span>
      )}
    </>
  );

  const baseClass = cn(
    "brand-logo inline-flex min-w-0 items-center gap-2.5",
    isLanding && "brand-logo-landing",
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
