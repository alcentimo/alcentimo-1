import type { ReactNode } from "react";

interface ContextModuleCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function ContextModuleCard({
  title,
  children,
  className = "",
}: ContextModuleCardProps) {
  return (
    <section className={`inbox-pro-module ${className}`}>
      <h3 className="inbox-pro-module-title">{title}</h3>
      <div className="inbox-pro-module-body">{children}</div>
    </section>
  );
}
