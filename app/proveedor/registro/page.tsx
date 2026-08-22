import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { SupplierRegisterPanel } from "@/components/supplier/SupplierRegisterPanel";

export const metadata = {
  title: "Registro de proveedores | Alcéntimo",
  description:
    "Regístrate como proveedor de Alcéntimo y surte las órdenes de compra del inventario corporativo.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function ProveedorRegistroPage() {
  return (
    <AuthPageShell
      sectionLabel="Proveedores"
      title="Regístrate como proveedor de Alcéntimo"
      description="Carga tu inventario para que Alcéntimo te compre y recoja el stock. Tú no vendes al cliente final."
    >
      <SupplierRegisterPanel />
    </AuthPageShell>
  );
}
