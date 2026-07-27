"use client";

import Link from "next/link";
import { usePlatformSettings } from "@/components/providers/PlatformSettingsProvider";
import { BRAND_ISOTYPE_PATH, BRAND_LOGO_FULL_PATH } from "@/lib/brand/assets";
import { cn } from "@/lib/cn";

export type BrandMarkMode = "isotype" | "full" | "responsive";

interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  subtitle?: string;
  className?: string;
  centered?: boolean;
  theme?: "light" | "dark";
  variant?: "default" | "landing";
  /** Móvil: isotipo. Desktop (md+): logo completo. */
  responsive?: boolean;
  /** Isotipo, logo completo o ambos según viewport. */
  mark?: BrandMarkMode;
  /** Logo externo solo para vista previa admin; null fuerza el isotipo oficial. */
  logoUrl?: string | null;
  platformName?: string;
}

function brandMarkImageSize(size: "sm" | "md" | "lg") {
  if (size === "sm") {
    return { width: 144, height: 40 };
  }
  if (size === "lg") {
    return { width: 512, height: 64 };
  }
  return { width: 176, height: 44 };
}

function isVectorLogoUrl(logoUrl: string): boolean {
  const normalized = logoUrl.split("?")[0]?.toLowerCase() ?? "";
  return normalized.endsWith(".svg");
}

function isotypeSizeClass(size: "sm" | "md" | "lg") {
  if (size === "lg") return "brand-logo-mark-img-isotype-lg";
  if (size === "sm") return "brand-logo-mark-img-isotype-sm";
  return "brand-logo-mark-img-isotype-md";
}

function fullSizeClass(size: "sm" | "md" | "lg") {
  if (size === "lg") return "brand-logo-mark-img-full-lg";
  if (size === "sm") return "brand-logo-mark-img-full-sm";
  return "brand-logo-mark-img-full-md";
}

function BrandImageMark({
  src,
  alt,
  wrapClassName,
  imgClassName,
}: {
  src: string;
  alt: string;
  wrapClassName?: string;
  imgClassName?: string;
}) {
  return (
    <span
      className={cn(
        "brand-logo-mark-wrap flex shrink-0 items-center justify-center self-center bg-transparent p-0 shadow-none ring-0",
        wrapClassName,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "brand-logo-mark-img block h-full w-auto max-w-full object-contain object-center",
          imgClassName,
        )}
        decoding="async"
      />
    </span>
  );
}

function BrandBuiltInMark({
  size,
  mark,
  platformName,
  markClassName,
  fullClassName,
}: {
  size: "sm" | "md" | "lg";
  mark: BrandMarkMode;
  platformName: string;
  markClassName?: string;
  fullClassName?: string;
}) {
  const alt = platformName.trim() || "Alcentimo";

  if (mark === "responsive") {
    return (
      <>
        <BrandImageMark
          src={BRAND_ISOTYPE_PATH}
          alt={alt}
          wrapClassName={cn(
            isotypeSizeClass(size),
            "brand-logo-mark-responsive-mobile",
            markClassName,
          )}
        />
        <BrandImageMark
          src={BRAND_LOGO_FULL_PATH}
          alt={alt}
          wrapClassName={cn(
            fullSizeClass(size),
            "brand-logo-mark-responsive-desktop",
            fullClassName,
          )}
        />
      </>
    );
  }

  if (mark === "full") {
    return (
      <BrandImageMark
        src={BRAND_LOGO_FULL_PATH}
        alt={alt}
        wrapClassName={cn(fullSizeClass(size), fullClassName)}
      />
    );
  }

  return (
    <BrandImageMark
      src={BRAND_ISOTYPE_PATH}
      alt={alt}
      wrapClassName={cn(isotypeSizeClass(size), markClassName)}
    />
  );
}

function BrandMark({
  size,
  explicitLogoUrl,
  platformName,
  mark,
}: {
  size: "sm" | "md" | "lg";
  explicitLogoUrl: string | null;
  platformName: string;
  mark: BrandMarkMode;
}) {
  if (!explicitLogoUrl) {
    return (
      <BrandBuiltInMark size={size} mark={mark} platformName={platformName} />
    );
  }

  const imageSize = brandMarkImageSize(size);

  return (
    <span
      className={cn(
        "brand-logo-mark-wrap brand-logo-dynamic relative flex shrink-0 items-center justify-center self-center overflow-visible bg-transparent p-0 shadow-none ring-0",
        size === "lg"
          ? "brand-logo-header-public h-14 w-auto max-w-[min(80vw,20rem)] md:h-16 md:max-w-[24rem]"
          : size === "sm"
            ? "h-10 w-auto max-w-[9rem]"
            : "h-11 w-auto max-w-[11rem]",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={explicitLogoUrl}
        alt={`Logo de ${platformName}`}
        width={imageSize.width}
        height={imageSize.height}
        className={cn(
          "brand-logo-dynamic-img block h-full w-auto max-h-full object-contain object-center",
          isVectorLogoUrl(explicitLogoUrl) && "brand-logo-svg-img",
        )}
        decoding="async"
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
  responsive = false,
  mark: markProp,
  logoUrl: logoUrlOverride,
  platformName: platformNameOverride,
}: BrandLogoProps) {
  const platform = usePlatformSettings();
  const platformName =
    platformNameOverride !== undefined
      ? platformNameOverride
      : platform.platformName;

  const mark: BrandMarkMode = markProp ?? (responsive ? "responsive" : "isotype");
  const explicitLogoUrl =
    logoUrlOverride !== undefined ? logoUrlOverride?.trim() || null : null;
  const isLanding = variant === "landing";
  const resolvedTheme = isLanding ? "light" : theme;
  const usesBuiltInResponsive = !explicitLogoUrl && mark === "responsive";

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

  const showWordmarkText = showName && !usesBuiltInResponsive;

  const content = (
    <>
      <BrandMark
        size={size}
        explicitLogoUrl={explicitLogoUrl}
        platformName={platformName}
        mark={mark}
      />
      {(showWordmarkText || subtitle) && (
        <span className="brand-logo-wordmark flex min-w-0 flex-col justify-center gap-0.5">
          {showWordmarkText && <span className={nameClass}>{displayName}</span>}
          {subtitle && <span className={subtitleClass}>{subtitle}</span>}
        </span>
      )}
    </>
  );

  const baseClass = cn(
    "brand-logo inline-flex min-w-0 items-center gap-2.5 self-center",
    mark === "responsive" && "brand-logo-responsive",
    isLanding && "brand-logo-landing",
    centered && "justify-center",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={baseClass} aria-label={platformName}>
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
