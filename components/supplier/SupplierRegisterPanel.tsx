"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SUPPLIER_PRODUCT_CATEGORIES } from "@/lib/supplier/categories";
import { registerSupplierAction } from "@/lib/supplier/register-actions";
import { SUPPLIER_DASHBOARD_PATH } from "@/lib/landing/supplier-zone-href";

export function SupplierRegisterPanel() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [productCategory, setProductCategory] = useState(
    SUPPLIER_PRODUCT_CATEGORIES[0]?.value ?? "otros",
  );
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await registerSupplierAction({
        companyName,
        contactName,
        email,
        password,
        phone,
        productCategory,
        acceptedLegalTerms,
      });

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      window.location.assign(result.redirectTo || SUPPLIER_DASHBOARD_PATH);
    } catch {
      setError("No se pudo completar el registro. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="card-panel mx-auto w-full max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="supplier_company_name" className="label-field">
            Nombre de la empresa
          </label>
          <input
            id="supplier_company_name"
            name="companyName"
            type="text"
            autoComplete="organization"
            required
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            className="input-field"
            placeholder="Distribuidora Ejemplo C.A."
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="supplier_contact_name" className="label-field">
            Nombre de contacto
          </label>
          <input
            id="supplier_contact_name"
            name="contactName"
            type="text"
            autoComplete="name"
            required
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            className="input-field"
            placeholder="María Pérez"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="supplier_email" className="label-field">
            Correo electrónico
          </label>
          <input
            id="supplier_email"
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
          <label htmlFor="supplier_password" className="label-field">
            Contraseña
          </label>
          <PasswordInput
            id="supplier_password"
            name="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input-field"
            placeholder="Mínimo 6 caracteres"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="supplier_phone" className="label-field">
            Teléfono / WhatsApp comercial
          </label>
          <input
            id="supplier_phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="input-field"
            placeholder="0412 000 0000"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="supplier_category" className="label-field">
            Categoría de productos
          </label>
          <select
            id="supplier_category"
            name="productCategory"
            required
            value={productCategory}
            onChange={(event) => setProductCategory(event.target.value)}
            className="input-field"
            disabled={loading}
          >
            {SUPPLIER_PRODUCT_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <input
            id="supplier_accept_legal"
            type="checkbox"
            checked={acceptedLegalTerms}
            onChange={(event) => setAcceptedLegalTerms(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600"
            disabled={loading}
          />
          <span>
            Acepto los{" "}
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="link-brand"
            >
              Términos y Condiciones
            </Link>{" "}
            y la{" "}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="link-brand"
            >
              Política de Privacidad
            </Link>
            .
          </span>
        </label>

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
          {loading ? "Creando cuenta…" : "Crear cuenta de proveedor"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={`/dashboard/login?next=${encodeURIComponent(SUPPLIER_DASHBOARD_PATH)}`}
          className="link-brand"
        >
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
