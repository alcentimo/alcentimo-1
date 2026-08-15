import { redirect } from "next/navigation";

/** Dropshipping puro: no hay editor local de productos. */
export default function EditProductPage() {
  redirect("/dashboard/catalogo");
}
