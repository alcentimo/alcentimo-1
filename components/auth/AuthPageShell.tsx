import type { ReactNode } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface AuthPageShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthPageShell({
  title,
  description,
  children,
  footer,
}: AuthPageShellProps) {
  return (
    <main className="page-shell-auth flex min-h-dvh flex-col justify-center safe-area-inset">
      <div className="auth-shell-grid" aria-hidden="true" />

      <PageContainer narrow className="relative py-10 sm:py-14">
        <div className="mb-8 text-center">
          <BrandLogo href="/" centered className="justify-center" />
          <p className="section-label mt-6">Panel del negocio</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-zinc-500 sm:text-sm lg:text-base dark:text-zinc-400">
            {description}
          </p>
        </div>

        {children}

        {footer ? <div className="mt-6">{footer}</div> : null}
      </PageContainer>
    </main>
  );
}
