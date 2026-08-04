"use client";

import { useEffect, useState, useTransition } from "react";
import { Lock, Loader2 } from "lucide-react";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import {
  getCatalogAccessAdminState,
  saveCatalogAccessSettings,
} from "@/lib/catalog-access/actions";
import {
  CATALOG_ACCESS_MODE_LABELS,
  CATALOG_ACCESS_MODES,
  type CatalogAccessMode,
} from "@/lib/catalog-access/types";

interface CatalogAccessTabProps {
  initialMode: CatalogAccessMode;
}

export function CatalogAccessTab({ initialMode }: CatalogAccessTabProps) {
  const [mode, setMode] = useState<CatalogAccessMode>(initialMode);
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const state = await getCatalogAccessAdminState();
      if (state.mode) setMode(state.mode);
      if (typeof state.hasPassword === "boolean") {
        setHasPassword(state.hasPassword);
      }
    });
  }, []);

  function persist(nextMode: CatalogAccessMode, options?: { clearPassword?: boolean }) {
    setSaving(true);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveCatalogAccessSettings({
        mode: nextMode,
        password: password.trim() || undefined,
        clearPassword: options?.clearPassword,
      });
      setSaving(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMode(nextMode);
      setPassword("");
      setMessage("Acceso del catálogo actualizado.");
      const state = await getCatalogAccessAdminState();
      if (typeof state.hasPassword === "boolean") {
        setHasPassword(state.hasPassword);
      }
    });
  }

  return (
    <SettingsTabShell error={error} hideSaveBar>
      <SettingsSection
        title="Acceso al catálogo"
        description="Controla quién puede ver tu tienda pública. Útil para pruebas internas sin exponer el catálogo."
        variant="payments"
      >
        <div className="space-y-3">
          {CATALOG_ACCESS_MODES.map((option) => {
            const selected = mode === option;
            return (
              <label
                key={option}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition ${
                  selected
                    ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
              >
                <input
                  type="radio"
                  name="catalog-access-mode"
                  className="mt-1"
                  checked={selected}
                  disabled={saving}
                  onChange={() => {
                    if (option === "password") {
                      setMode(option);
                      return;
                    }
                    persist(option);
                  }}
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {CATALOG_ACCESS_MODE_LABELS[option]}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {option === "public"
                      ? "Cualquiera con el enlace puede ver productos y comprar."
                      : option === "draft"
                        ? "No aparece para visitantes. Solo tú (con sesión) puedes previsualizarlo."
                        : option === "private"
                          ? "Bloqueado al público. Ideal mientras preparas o pruebas tu catálogo."
                          : "Los visitantes deben ingresar una contraseña antes de ver productos."}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {mode === "password" ? (
          <div className="mt-4 space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              {hasPassword
                ? "Ya hay una contraseña configurada. Ingresa una nueva solo si quieres cambiarla."
                : "Define la contraseña que compartirás con quienes puedan ver el catálogo."}
            </p>
            <div>
              <label htmlFor="catalog-access-new-password" className="label-field">
                {hasPassword ? "Nueva contraseña (opcional)" : "Contraseña"}
              </label>
              <input
                id="catalog-access-new-password"
                type="password"
                className="input-field"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={saving}
                placeholder={hasPassword ? "Dejar vacío para mantener" : "Mínimo 4 caracteres"}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-brand !min-h-10 !px-4 !text-sm"
                disabled={saving || (!hasPassword && password.trim().length < 4)}
                onClick={() => persist("password")}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Guardar acceso protegido
              </button>
              {hasPassword ? (
                <button
                  type="button"
                  className="btn-brand-outline !min-h-10 !px-4 !text-sm"
                  disabled={saving}
                  onClick={() => persist("public", { clearPassword: true })}
                >
                  Quitar protección
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {message ? (
          <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {message}
          </p>
        ) : null}
      </SettingsSection>
    </SettingsTabShell>
  );
}
