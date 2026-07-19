import { cn } from "@/lib/cn";
import { CatalogMobileMockup } from "@/components/landing/CatalogMobileMockup";
import { DashboardMockup } from "@/components/landing/DashboardMockup";

interface HeroCompositeMockupProps {
  className?: string;
}

export function HeroCompositeMockup({ className }: HeroCompositeMockupProps) {
  return (
    <div className={cn("landing-hero-composite", className)} aria-hidden="true">
      <div className="landing-hero-composite-glow" />
      <div className="landing-hero-composite-inner">
        <DashboardMockup className="landing-hero-composite-dashboard" />
        <CatalogMobileMockup className="landing-hero-composite-mobile" />
      </div>
    </div>
  );
}
