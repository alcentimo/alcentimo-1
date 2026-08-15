/**
 * Hub de proveedores (`/proveedor`): carga y gestión de productos del catálogo global.
 * Acceso: SUPPLIER_EMAILS, support-admin o perfil en supplier_profiles.
 */
export const metadata = {
  title: "Hub de proveedores",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProveedorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
