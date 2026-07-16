import { redirect } from "next/navigation";

export default function NewProductPage() {
  redirect("/dashboard/inventario?nuevo=1");
}
