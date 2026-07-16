import { redirect } from "next/navigation";

export default function NewProductPage() {
  redirect("/dashboard/catalogo?nuevo=1");
}
