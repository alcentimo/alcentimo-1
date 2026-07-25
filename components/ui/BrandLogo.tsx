"use client";

import Image from "next/image";
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
      container: "h-10 w-auto max-w-[9rem] md:h-12 md:max-w-[14rem]",
      width: 224,
      height: 48,
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
  if (logoUrl) {
    const resolvedLogoUrl = logoUrl;
    const imageSize = brandMarkImageSize(size);
    const mobileImageSize =
      size === "lg"
        ? { container: "h-10 w-auto max-w-[9rem]", width: 160, height: 40 }
        : brandMarkImageSize("sm");

    function LogoImage({
      containerClass,
      width,
      height,
    }: {
      containerClass: string;
      width: number;
      height: number;
    }) {
      return (
        <span
          className={cn(
            "relative flex shrink-0 items-center justify-center self-center overflow-visible",
            containerClass,
          )}
        >
          <Image
            src={resolvedLogoUrl}
            alt={`Logo de ${platformName}`}
            width={width}
            height={height}
            className="block h-full w-auto max-h-full max-w-full object-contain object-left"
            unoptimized={
              resolvedLogoUrl.includes("?v=") || isVectorLogoUrl(resolvedLogoUrl)
            }
          />
        </span>
      );
    }

    if (responsive) {
      return (
        <>
          <LogoImage
            containerClass={cn(mobileImageSize.container, "md:hidden")}
            width={mobileImageSize.width}
            height={mobileImageSize.height}
          />
          <LogoImage
            containerClass={cn(imageSize.container, "hidden md:flex")}
            width={imageSize.width}
            height={imageSize.height}
          />
        </>
      );
    }

    return (
      <LogoImage
        containerClass={imageSize.container}
        width={imageSize.width}
        height={imageSize.height}
      />
    );
  }

  if (responsive) {
    return (
      <>
        <BrandIsotype
          size={size}
          variant={variant}
          className="brand-logo-responsive-mark md:hidden"
        />
        <BrandLogoFull
          size={size}
          variant={variant}
          platformName={platformName}
          className="brand-logo-responsive-full hidden md:block"
        />
      </>
    );
  }

  return <BrandIsotype size={size} variant={variant} />;
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
