"use client";

import { useState } from "react";
import type { PlatformSettings } from "@/lib/platform/platform-settings";
import { PlatformLogoField } from "@/components/admin/PlatformLogoField";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface PlatformLogoConfigCardProps {
  initialSettings: PlatformSettings;
}

export function PlatformLogoConfigCard({
  initialSettings,
}: PlatformLogoConfigCardProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialSettings.logoUrl);

  return (
    <div className="max-w-xl rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Logo de la plataforma
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Se muestra en login, barra superior, landing y el resto de la aplicación.
      </p>

      <div className="mt-5 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Vista previa
        </p>
        <BrandLogo
          href=""
          logoUrl={logoUrl}
          platformName={initialSettings.platformName}
          subtitle={initialSettings.tagline}
        />
      </div>

      <div className="mt-5">
        <PlatformLogoField
          platformName={initialSettings.platformName}
          value={logoUrl}
          onChange={setLogoUrl}
        />
      </div>
    </div>
  );
}
