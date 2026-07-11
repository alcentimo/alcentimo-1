import type { Venta } from "@/lib/database.types";

export type { Venta };

export interface VentaWithProduct extends Venta {
  product_name: string;
  thumb_url: string | null;
  category_name: string | null;
}

export type CreateSaleFormState = {
  error?: string;
  success?: string;
};
