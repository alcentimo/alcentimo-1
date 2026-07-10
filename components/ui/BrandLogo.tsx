import Link from "next/link";

interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md";
  showName?: boolean;
  subtitle?: string;
  className?: string;
  centered?: boolean;
  theme?: "light" | "dark";
}

export function BrandLogo({
  href = "/",
  size = "md",
  showName = true,
  subtitle,
  className = "",
  centered = false,
  theme = "light",
}: BrandLogoProps) {
  const markSize = size === "sm" ? "brand-mark-sm" : "brand-mark-md";
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
      <span className={`brand-mark ${markSize}`}>a</span>
      {(showName || subtitle) && (
        <div className="min-w-0">
          {showName && <span className={nameClass}>alcentimo</span>}
          {subtitle && <span className={subtitleClass}>{subtitle}</span>}
        </div>
      )}
    </>
  );

  const baseClass = `flex min-w-0 items-center gap-2.5 ${centered ? "justify-center" : ""} ${className}`;

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
