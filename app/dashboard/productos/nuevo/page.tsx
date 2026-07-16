import { redirect } from "next/navigation";

export default function NewProductPage() {
  redirect("/dashboard/catalogo?tab=inventario&nuevo=1");
}
