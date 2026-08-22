import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { SupplierLoginPanel } from "@/components/supplier/SupplierLoginPanel";

export const metadata = {
  title: "Acceso proveedores | Alcéntimo",
  description:
    "Inicia sesión en el hub de suministro de Alcéntimo.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProveedorLoginPage() {
  return (
    <AuthPageShell
      sectionLabel="Proveedores"
      title="Accede al hub de suministro"
      description="Usa el correo y la contraseña de tu cuenta de proveedor de Alcéntimo."
    >
      <SupplierLoginPanel />
    </AuthPageShell>
  );
}
