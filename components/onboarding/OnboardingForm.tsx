"use client";

import { useActionState, useMemo, useState } from "react";
import { ExternalLink, Rocket, Store } from "lucide-react";
import {
  completeOnboarding,
  type OnboardingFormState,
} from "@/lib/onboarding/actions";
import { STORE_CATEGORY_OPTIONS } from "@/lib/onboarding/categories";
import { DEFAULT_STORE_COUNTRY } from "@/lib/onboarding/countries";
import { slugify } from "@/lib/slugify";
import { getPublicSiteHost } from "@/lib/site-url";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const initialState: OnboardingFormState = {};

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    completeOnboarding,
    initialState,
  );
  const [storeName, setStoreName] = useState("");
  const [category, setCategory] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const slugPreview = slugify(storeName) || "mi-tienda";
  const siteHost = useMemo(() => getPublicSiteHost(), []);
  const catalogUrl = `${siteHost}/c/${slugPreview}`;
  const normalizedWhatsApp = normalizeWhatsAppPhone(whatsapp);

  return (
    <form action={formAction} className="card-panel mx-auto w-full max-w-md space-y-6">
      <input type="hidden" name="country" value={DEFAULT_STORE_COUNTRY} />

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
          <Store className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
            Lanza tu tienda
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Tres datos y tu catálogo queda listo para recibir pedidos.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="store_name" className="label-field">
          Nombre de la tienda <span className="text-red-500">*</span>
        </label>
        <Input
          id="store_name"
          name="name"
          required
          maxLength={120}
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="Ej: Repuestos El Sol"
          autoFocus
        />
        {storeName.trim() ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              Tu enlace público
            </p>
            <p className="mt-1 break-all text-sm text-zinc-700 dark:text-zinc-200">
              <span className="text-zinc-400">{siteHost}/c/</span>
              <Badge variant="secondary" className="ml-0.5 align-middle font-mono text-[11px]">
                {slugPreview}
              </Badge>
            </p>
            <a
              href={`https://${catalogUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200"
            >
              Previsualizar enlace
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="category" className="label-field">
          Categoría / tipo de tienda <span className="text-red-500">*</span>
        </label>
        <Select
          id="category"
          name="category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="" disabled>
            Selecciona una opción
          </option>
          {STORE_CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </div>

      {category === "Otros" ? (
        <div className="space-y-2">
          <label htmlFor="custom_category" className="label-field">
            Especifica tu rubro <span className="text-red-500">*</span>
          </label>
          <Input
            id="custom_category"
            name="custom_category"
            required
            maxLength={80}
            placeholder="Ej: Ferretería"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="whatsapp" className="label-field">
          WhatsApp de contacto <span className="text-red-500">*</span>
        </label>
        <Input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="Ej: 0414-1234567"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Aquí llegarán las notificaciones de pedidos desde tu catálogo.
        </p>
        {whatsapp.trim() ? (
          <p className="text-xs text-zinc-400">
            {normalizedWhatsApp
              ? `Formato internacional: +${normalizedWhatsApp}`
              : "Revisa el número — debe tener al menos 10 dígitos."}
          </p>
        ) : null}
      </div>

      <Separator />

      {state.error ? <p className="alert-error">{state.error}</p> : null}

      <Button type="submit" disabled={pending} className="h-11 w-full text-sm">
        {pending ? (
          "Lanzando tu tienda…"
        ) : (
          <>
            <Rocket className="h-4 w-4" aria-hidden="true" />
            Finalizar y Lanzar
          </>
        )}
      </Button>
    </form>
  );
}
