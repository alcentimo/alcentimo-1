"use client";

import { useActionState, useState } from "react";
import {
  completeOnboarding,
  type OnboardingFormState,
} from "@/lib/onboarding/actions";
import { STORE_CATEGORY_OPTIONS } from "@/lib/onboarding/categories";
import { DEFAULT_STORE_COUNTRY } from "@/lib/onboarding/countries";

const initialState: OnboardingFormState = {};

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    completeOnboarding,
    initialState,
  );
  const [category, setCategory] = useState("");

  return (
    <form action={formAction} className="card-panel mx-auto w-full max-w-md space-y-5">
      <input type="hidden" name="country" value={DEFAULT_STORE_COUNTRY} />

      <div>
        <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
          Configura tu tienda
        </h2>
        <p className="mt-1 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
          Cuéntanos sobre tu negocio para crear tu catálogo digital en Venezuela.
        </p>
      </div>

      <div>
        <label htmlFor="store_name" className="label-field">
          Nombre de la tienda <span className="text-red-500">*</span>
        </label>
        <input
          id="store_name"
          name="name"
          required
          maxLength={120}
          placeholder="Ej: Ferretería El Progreso"
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="category" className="label-field">
          Categoría del negocio <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          name="category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input-field"
        >
          <option value="" disabled>
            Selecciona una categoría
          </option>
          {STORE_CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {category === "Otros" && (
        <div>
          <label htmlFor="custom_category" className="label-field">
            Especifica tu categoría <span className="text-red-500">*</span>
          </label>
          <input
            id="custom_category"
            name="custom_category"
            required
            maxLength={80}
            placeholder="Ej: Artículos deportivos"
            className="input-field"
          />
        </div>
      )}

      {state.error && <p className="alert-error">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Creando tu tienda…" : "Continuar al panel"}
      </button>
    </form>
  );
}
