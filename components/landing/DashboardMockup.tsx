import {
  LayoutGrid,
  Package,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

interface DashboardMockupProps {
  className?: string;
}

const MOCK_PRODUCTS = [
  { name: "Aceite 900ml", price: "$4.50", stock: "24 u." },
  { name: "Arroz 1kg", price: "$2.80", stock: "18 u." },
  { name: "Harina PAN", price: "$1.90", stock: "42 u." },
] as const;

export function DashboardMockup({ className }: DashboardMockupProps) {
  return (
    <div
      className={cn("landing-dashboard-mockup", className)}
      aria-hidden="true"
    >
      <div className="landing-dashboard-mockup-glow" />

      <div className="landing-dashboard-mockup-frame">
        <div className="landing-dashboard-mockup-chrome">
          <span className="landing-dashboard-mockup-dot bg-red-400/90" />
          <span className="landing-dashboard-mockup-dot bg-amber-400/90" />
          <span className="landing-dashboard-mockup-dot bg-emerald-400/90" />
          <span className="ml-3 truncate text-[10px] text-zinc-400">
            alcentimo.com/dashboard
          </span>
        </div>

        <div className="landing-dashboard-mockup-body">
          <aside className="landing-dashboard-mockup-sidebar">
            <div className="landing-dashboard-mockup-logo">A</div>
            <div className="landing-dashboard-mockup-nav-item landing-dashboard-mockup-nav-item-active">
              <LayoutGrid className="h-3.5 w-3.5" />
            </div>
            <div className="landing-dashboard-mockup-nav-item">
              <Package className="h-3.5 w-3.5" />
            </div>
            <div className="landing-dashboard-mockup-nav-item">
              <ShoppingBag className="h-3.5 w-3.5" />
            </div>
          </aside>

          <div className="landing-dashboard-mockup-main">
            <div className="landing-dashboard-mockup-topbar">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-600">
                  Mi tienda
                </p>
                <p className="text-sm font-semibold text-zinc-900">Ferretería El Sol</p>
              </div>
              <Badge variant="success" className="text-[10px]">
                Catálogo activo
              </Badge>
            </div>

            <div className="landing-dashboard-mockup-stats">
              <div className="landing-dashboard-mockup-stat">
                <p className="text-[10px] text-zinc-500">Pedidos hoy</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-zinc-900">
                  12
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                </p>
              </div>
              <div className="landing-dashboard-mockup-stat">
                <p className="text-[10px] text-zinc-500">Tasa BCV</p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-900">Bs. 68,42</p>
              </div>
            </div>

            <div className="landing-dashboard-mockup-products">
              {MOCK_PRODUCTS.map((product) => (
                <div key={product.name} className="landing-dashboard-mockup-product">
                  <div className="landing-dashboard-mockup-product-thumb" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-zinc-800">
                      {product.name}
                    </p>
                    <p className="text-[10px] text-zinc-500">{product.stock}</p>
                  </div>
                  <p className="text-[11px] font-semibold text-emerald-700">
                    {product.price}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
