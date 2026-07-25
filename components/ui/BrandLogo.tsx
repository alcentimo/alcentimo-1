"use client";

import Link from "next/link";
import { BrandIsotype } from "@/components/ui/BrandIsotype";
import { BrandLogoFull } from "@/components/ui/BrandLogoFull";
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
  /** Móvil: solo isotipo. Desktop (md+): logo horizontal completo. */
  responsive?: boolean;
  /** Sobrescribe el logo de plataforma (p. ej. vista previa en admin). */
  logoUrl?: string | null;
  /** Sobrescribe el nombre de plataforma. */
  platformName?: string;
}

function brandMarkImageSize(size: "sm" | "md" | "lg") {
  if (size === "sm") {
    return {
      container: "h-10 w-auto max-w-[9rem]",
      width: 144,
      height: 40,
    };
  }
  if (size === "lg") {
    return {
      container:
        "brand-logo-header-public h-10 w-auto max-w-[16rem] md:h-11 md:max-w-[18rem]",
      width: 360,
      height: 44,
    };
  }
  return {
    container: "h-11 w-auto max-w-[11rem]",
    width: 176,
    height: 44,
  };
}

function isVectorLogoUrl(logoUrl: string): boolean {
  const normalized = logoUrl.split("?")[0]?.toLowerCase() ?? "";
  return normalized.endsWith(".svg");
}

/** Marca vectorial predeterminada solo cuando no hay logo global en BD. */
function shouldUseBuiltInSvgBrand(logoUrl: string | null): boolean {
  return !logoUrl;
}

function BrandSvgMark({
  size,
  variant,
  platformName,
  responsive,
  markClassName,
  fullClassName,
}: {
  size: "sm" | "md" | "lg";
  variant: "default" | "landing";
  platformName: string;
  responsive: boolean;
  markClassName?: string;
  fullClassName?: string;
}) {
  if (responsive) {
    return (
      <>
        <span
          className={cn(
            "brand-logo-mark-wrap brand-logo-mark-wrap-isotype md:hidden",
            markClassName,
          )}
        >
          <BrandIsotype size={size} variant={variant} className="brand-logo-responsive-mark" />
        </span>
        <span
          className={cn(
            "brand-logo-mark-wrap brand-logo-mark-wrap-full hidden md:flex",
            fullClassName,
          )}
        >
          <BrandLogoFull
            size={size}
            variant={variant}
            platformName={platformName}
            className="brand-logo-responsive-full"
          />
        </span>
      </>
    );
  }

  return (
    <span className={cn("brand-logo-mark-wrap brand-logo-mark-wrap-isotype", markClassName)}>
      <BrandIsotype size={size} variant={variant} />
    </span>
  );
}

function BrandMark({
  size,
  logoUrl,
  platformName,
  variant = "default",
  responsive = false,
}: {
  size: "sm" | "md" | "lg";
  logoUrl: string | null;
  platformName: string;
  variant?: "default" | "landing";
  responsive?: boolean;
}) {
  if (shouldUseBuiltInSvgBrand(logoUrl)) {
    return (
      <BrandSvgMark
        size={size}
        variant={variant}
        platformName={platformName}
        responsive={responsive}
      />
    );
  }

  const resolvedLogoUrl = logoUrl!;
  const imageSize = brandMarkImageSize(size);

  return (
    <span
      className={cn(
        "brand-logo-mark-wrap brand-logo-dynamic relative flex shrink-0 items-center justify-center self-center overflow-visible",
        imageSize.container,
      )}
    >
      {/* img nativo evita recompresión y mantiene nitidez en Retina */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedLogoUrl}
        alt={`Logo de ${platformName}`}
        width={imageSize.width}
        height={imageSize.height}
        className={cn(
          "brand-logo-dynamic-img block h-full w-auto max-h-full object-contain object-center",
          isVectorLogoUrl(resolvedLogoUrl) && "brand-logo-svg-img",
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
  const useResponsiveSvg = responsive && !logoUrl;

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

  const showWordmarkText = showName && !useResponsiveSvg;

  const content = (
    <>
      <BrandMark
        size={size}
        logoUrl={logoUrl}
        platformName={platformName}
        variant={variant}
        responsive={responsive}
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
    responsive && "brand-logo-responsive",
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
