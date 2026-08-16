"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { getAuthCaughtMessage } from "@/lib/auth/auth-log";
import {
  SUPPLIER_DASHBOARD_PATH,
  SUPPLIER_REGISTER_PATH,
} from "@/lib/landing/supplier-zone-href";

export function SupplierLoginPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/proveedor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });

      let payload: { ok?: boolean; redirectTo?: string; error?: string } = {};
      try {
        payload = (await response.json()) as typeof payload;
      } catch {
        payload = {};
      }

      if (!response.ok || payload.error) {
        setError(
          formatAuthError(
            payload.error ||
              "No se pudo iniciar sesión como proveedor. Intenta de nuevo.",
          ),
        );
        setLoading(false);
        return;
      }

      window.location.replace(payload.redirectTo || SUPPLIER_DASHBOARD_PATH);
    } catch (caught) {
      const message = getAuthCaughtMessage(caught);
      setError(
        formatAuthError(
          message ||
            "No se pudo iniciar sesión como proveedor. Intenta de nuevo.",
        ),
      );
      setLoading(false);
    }
  }

  return (
    <div className="card-panel mx-auto w-full max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="supplier_login_email" className="label-field">
            Correo electrónico
          </label>
          <input
            id="supplier_login_email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input-field"
            placeholder="tu@empresa.com"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="supplier_login_password" className="label-field">
            Contraseña
          </label>
          <PasswordInput
            id="supplier_login_password"
            name="password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input-field"
            disabled={loading}
          />
        </div>

        {error ? (
          <p className="alert-error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading}
        >
          {loading ? "Entrando…" : "Entrar al panel de proveedores"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
        ¿Aún no tienes cuenta de proveedor?{" "}
        <Link href={SUPPLIER_REGISTER_PATH} className="link-brand">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
