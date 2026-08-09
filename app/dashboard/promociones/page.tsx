import { redirect } from "next/navigation";

/** Ruta legada: Promociones vive en Configuración de Tienda → Clientes. */
export default function PromocionesPage() {
  redirect("/dashboard/ajustes?tab=promotions");
}
