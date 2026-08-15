import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { SupplierLoginPanel } from "@/components/supplier/SupplierLoginPanel";

export const metadata = {
  title: "Acceso proveedores | Alcéntimo",
  description:
    "Inicia sesión en el panel de proveedores y mayoristas de Alcéntimo.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProveedorLoginPage() {
  return (
    <AuthPageShell
      sectionLabel="Proveedores"
      title="Accede a tu panel mayorista"
      description="Usa el correo y la contraseña de tu cuenta de proveedor."
    >
      <SupplierLoginPanel />
    </AuthPageShell>
  );
}
