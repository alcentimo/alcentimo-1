import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ContextModuleCardProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}

export function ContextModuleCard({
  title,
  icon: Icon,
  children,
  className = "",
}: ContextModuleCardProps) {
  return (
    <section className={`inbox-context-module ${className}`}>
      <header className="inbox-context-module-header">
        <Icon className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          {title}
        </h3>
      </header>
      <div className="inbox-context-module-body">{children}</div>
    </section>
  );
}
