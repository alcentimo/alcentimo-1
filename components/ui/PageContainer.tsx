import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "main" | "section";
  /** Formularios y login: ancho cómodo en desktop */
  narrow?: boolean;
}

export function PageContainer({
  children,
  className = "",
  as: Tag = "div",
  narrow = false,
}: PageContainerProps) {
  return (
    <Tag
      className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${
        narrow ? "max-w-2xl" : "max-w-screen-xl"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
