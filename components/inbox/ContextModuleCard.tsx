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
    <section className={`inbox-context-module ${className}`}>
      <h3 className="inbox-context-module-title">{title}</h3>
      <div className="inbox-context-module-body">{children}</div>
    </section>
  );
}
