"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

const CatalogPreviewPortalContext = createContext<HTMLElement | null>(null);

/**
 * Contenedor de portal para overlays (filtros, etc.) dentro de la vista
 * previa del dashboard, para que no escapen al `document.body`.
 */
export function CatalogPreviewPortalProvider({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setPortalNode(rootRef.current);
  }, []);

  return (
    <CatalogPreviewPortalContext.Provider value={portalNode}>
      <div ref={rootRef} className={className} style={style}>
        {children}
      </div>
    </CatalogPreviewPortalContext.Provider>
  );
}

/** Elemento raíz de la vista previa, o `null` fuera de ella. */
export function useCatalogPreviewPortalContainer(): HTMLElement | null {
  return useContext(CatalogPreviewPortalContext);
}
