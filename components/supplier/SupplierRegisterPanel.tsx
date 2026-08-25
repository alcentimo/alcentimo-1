"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SignupEmailVerificationPanel } from "@/components/dashboard/SignupEmailVerificationPanel";
import { SUPPLIER_PRODUCT_CATEGORIES } from "@/lib/supplier/categories";
import { registerSupplierAction } from "@/lib/supplier/register-actions";
import {
  SUPPLIER_DASHBOARD_PATH,
  SUPPLIER_LOGIN_PATH,
} from "@/lib/landing/supplier-zone-href";

export function SupplierRegisterPanel() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [productCategory, setProductCategory] = useState<string>("electronica");
  const [warehouseAddress, setWarehouseAddress] = useState("");
  const [pickupHours, setPickupHours] = useState("");
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null,
  );
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(
    null,
  );
  const [requiresLoginNotice, setRequiresLoginNotice] = useState<string | null>(
    null,
  );

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
        warehouseAddress,
        pickupHours,
        acceptedLegalTerms,
      });

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result.needsEmailConfirmation) {
        setConfirmationEmail(result.email);
        setConfirmationNotice(result.notice);
        setLoading(false);
        return;
      }

      if (result.requiresLogin) {
        setRequiresLoginNotice(result.notice);
        setLoading(false);
        return;
      }

      setLoading(false);
    } catch {
      setError("No se pudo completar el registro. Intenta de nuevo.");
      setLoading(false);
    }
  }

  if (confirmationEmail) {
    return (
      <div className="card-panel mx-auto w-full max-w-lg">
        <SignupEmailVerificationPanel
          email={confirmationEmail}
          nextPath={SUPPLIER_DASHBOARD_PATH}
          notice={confirmationNotice}
          freshSignup
          signupPassword={password}
        />
        <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <Link href={SUPPLIER_LOGIN_PATH} className="link-brand">
            Ir a iniciar sesión
          </Link>
        </p>
      </div>
    );
  }

  if (requiresLoginNotice) {
    return (
      <div className="card-panel mx-auto w-full max-w-lg space-y-4">
        <p className="alert-success text-sm" role="status">
          {requiresLoginNotice}
        </p>
        <Link href={SUPPLIER_LOGIN_PATH} className="btn-primary inline-flex w-full justify-center">
          Iniciar sesión en el panel de proveedores
        </Link>
      </div>
    );
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
            placeholder="0412-1234567"
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

        <div>
          <label htmlFor="supplier_warehouse_address" className="label-field">
            Dirección física de almacén/tienda
          </label>
          <textarea
            id="supplier_warehouse_address"
            name="warehouseAddress"
            required
            value={warehouseAddress}
            onChange={(event) =>
              setWarehouseAddress(event.target.value.slice(0, 400))
            }
            className="input-field min-h-[4.5rem] resize-y"
            placeholder="Calle, número, urbanización, ciudad"
            disabled={loading}
          />
          <p className="mt-1 text-[11px] text-zinc-500">
            Alcéntimo va a retirar el producto en esta dirección. No es una
            vitrina pública.
          </p>
        </div>

        <div>
          <label htmlFor="supplier_pickup_hours" className="label-field">
            Horarios de retiro
          </label>
          <input
            id="supplier_pickup_hours"
            name="pickupHours"
            type="text"
            required
            value={pickupHours}
            onChange={(event) => setPickupHours(event.target.value.slice(0, 200))}
            className="input-field"
            placeholder="Lun–Vie 8:00–16:00"
            disabled={loading}
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            className="mt-1"
            checked={acceptedLegalTerms}
            onChange={(event) => setAcceptedLegalTerms(event.target.checked)}
            disabled={loading}
            required
          />
          <span>
            Acepto los{" "}
            <Link href="/terminos" className="link-brand" target="_blank">
              Términos y Condiciones
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" className="link-brand" target="_blank">
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
        <Link href={SUPPLIER_LOGIN_PATH} className="link-brand">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
