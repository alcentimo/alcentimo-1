import { Home, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/cn";

interface CatalogMobileMockupProps {
  className?: string;
}

const MOBILE_PRODUCTS = [
  { name: "Aceite 900ml", price: "$4.50" },
  { name: "Arroz 1kg", price: "$2.80" },
] as const;

export function CatalogMobileMockup({ className }: CatalogMobileMockupProps) {
  return (
    <div
      className={cn("landing-mobile-mockup", className)}
      aria-hidden="true"
    >
      <div className="landing-mobile-mockup-device">
        <div className="landing-mobile-mockup-notch" />
        <div className="landing-mobile-mockup-screen">
          <header className="landing-mobile-mockup-header">
            <div className="landing-mobile-mockup-store-logo">FS</div>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-semibold text-zinc-900">
                Ferretería El Sol
              </p>
              <p className="text-[8px] text-emerald-600">Catálogo</p>
            </div>
          </header>

          <div className="landing-mobile-mockup-grid">
            {MOBILE_PRODUCTS.map((product) => (
              <div key={product.name} className="landing-mobile-mockup-product">
                <div className="landing-mobile-mockup-product-img" />
                <p className="mt-1 truncate text-[7px] font-medium text-zinc-800">
                  {product.name}
                </p>
                <p className="text-[7px] font-semibold text-emerald-700">
                  {product.price}
                </p>
              </div>
            ))}
          </div>

          <div className="landing-mobile-mockup-tabbar">
            <Home className="h-3 w-3 text-emerald-600" />
            <ShoppingBag className="h-3 w-3 text-zinc-400" />
            <User className="h-3 w-3 text-zinc-400" />
          </div>
        </div>
      </div>
      <p className="landing-mobile-mockup-caption">Catálogo del cliente</p>
    </div>
  );
}
