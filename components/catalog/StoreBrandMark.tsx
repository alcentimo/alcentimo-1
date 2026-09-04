"use client";

import { useEffect, useState } from "react";
import { getCatalogStoreInitials } from "@/components/catalog/CatalogStoreBrandingContext";
import { cn } from "@/lib/cn";

interface StoreBrandMarkProps {
  logoUrl?: string | null;
  storeName: string;
  className?: string;
  logoClassName?: string;
  imageClassName?: string;
  initialsClassName?: string;
}

/**
 * Marca de tienda en cabecera: pinta el logo de inmediato.
 * Las iniciales solo aparecen si no hay URL o si la imagen falla.
 */
export function StoreBrandMark({
  logoUrl,
  storeName,
  className,
  logoClassName,
  imageClassName,
  initialsClassName,
}: StoreBrandMarkProps) {
  const [failed, setFailed] = useState(false);
  const trimmedLogo = logoUrl?.trim() || null;

  useEffect(() => {
    setFailed(false);
  }, [trimmedLogo]);

  const initials = getCatalogStoreInitials(storeName);

  if (trimmedLogo && !failed) {
    return (
      <span className={cn(className, logoClassName)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trimmedLogo}
          alt=""
          className={imageClassName}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className={cn(className, initialsClassName)} aria-hidden="true">
      {initials}
    </span>
  );
}
