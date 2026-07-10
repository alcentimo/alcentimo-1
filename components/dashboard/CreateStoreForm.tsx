"use client";

import { useActionState } from "react";
import { createStore, type StoreFormState } from "@/lib/products/actions";

const initialState: StoreFormState = {};

export function CreateStoreForm() {
  const [state, formAction, pending] = useActionState(createStore, initialState);

  if (state.success) {
    return (
      <div className="alert-success text-base text-teal-800 sm:text-sm dark:text-teal-200">
        ¡Tienda creada! Recarga la página para continuar.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="store_name" className="label-field">
          Nombre de tu negocio
        </label>
        <input
          id="store_name"
          name="name"
          required
          placeholder="Ej: Ferretería El Progreso"
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="store_slug" className="label-field">
          URL de tu catálogo
        </label>
        <div className="input-prefix-group">
          <span className="input-prefix-label">/tienda/</span>
          <input
            id="store_slug"
            name="slug"
            placeholder="mi-negocio"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            className="input-prefix-field"
          />
        </div>
        <p className="mt-1.5 text-xs text-zinc-500 sm:text-sm">
          Solo minúsculas, números y guiones. Si lo dejas vacío, se genera del nombre.
        </p>
      </div>

      {state.error && <p className="alert-error">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Creando…" : "Crear mi tienda"}
      </button>
    </form>
  );
}
