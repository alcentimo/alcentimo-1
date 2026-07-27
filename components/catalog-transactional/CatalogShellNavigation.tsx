"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getStoreCatalogBasePath } from "@/lib/store-host";

interface CatalogCartController {
  open: () => void;
  close: () => void;
}

interface CatalogShellNavigationContextValue {
  profileOpen: boolean;
  registerOpen: boolean;
  cartActive: boolean;
  openProfile: () => void;
  closeProfile: () => void;
  openRegister: () => void;
  closeRegister: () => void;
  openCart: () => void;
  closeCart: () => void;
  setCartActive: (active: boolean) => void;
  registerCartController: (controller: CatalogCartController | null) => void;
}

const CatalogShellNavigationContext =
  createContext<CatalogShellNavigationContextValue | null>(null);

interface CatalogShellNavigationProviderProps {
  storeSlug: string;
  children: ReactNode;
}

export function CatalogShellNavigationProvider({
  storeSlug,
  children,
}: CatalogShellNavigationProviderProps) {
  const router = useRouter();
  const cartControllerRef = useRef<CatalogCartController | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [cartActive, setCartActive] = useState(false);

  const registerCartController = useCallback(
    (controller: CatalogCartController | null) => {
      cartControllerRef.current = controller;
    },
    [],
  );

  const openCart = useCallback(() => {
    if (cartControllerRef.current) {
      cartControllerRef.current.open();
      setCartActive(true);
      setProfileOpen(false);
      setRegisterOpen(false);
      return;
    }

    const base = getStoreCatalogBasePath(storeSlug);
    const href = base === "/" ? "/?carrito=1" : `${base}?carrito=1`;
    router.push(href);
  }, [router, storeSlug]);

  const closeCart = useCallback(() => {
    cartControllerRef.current?.close();
    setCartActive(false);
  }, []);

  const openProfile = useCallback(() => {
    cartControllerRef.current?.close();
    setProfileOpen(true);
    setRegisterOpen(false);
    setCartActive(false);
  }, []);

  const closeProfile = useCallback(() => {
    setProfileOpen(false);
  }, []);

  const openRegister = useCallback(() => {
    cartControllerRef.current?.close();
    setProfileOpen(false);
    setRegisterOpen(true);
    setCartActive(false);
  }, []);

  const closeRegister = useCallback(() => {
    setRegisterOpen(false);
  }, []);

  const value = useMemo<CatalogShellNavigationContextValue>(
    () => ({
      profileOpen,
      registerOpen,
      cartActive,
      openProfile,
      closeProfile,
      openRegister,
      closeRegister,
      openCart,
      closeCart,
      setCartActive,
      registerCartController,
    }),
    [
      profileOpen,
      registerOpen,
      cartActive,
      openProfile,
      closeProfile,
      openRegister,
      closeRegister,
      openCart,
      closeCart,
      registerCartController,
    ],
  );

  return (
    <CatalogShellNavigationContext.Provider value={value}>
      {children}
    </CatalogShellNavigationContext.Provider>
  );
}

export function useCatalogShellNavigation(): CatalogShellNavigationContextValue {
  const context = useContext(CatalogShellNavigationContext);
  if (!context) {
    throw new Error(
      "useCatalogShellNavigation debe usarse dentro de CatalogShellNavigationProvider.",
    );
  }
  return context;
}

export function useCatalogShellNavigationOptional():
  | CatalogShellNavigationContextValue
  | null {
  return useContext(CatalogShellNavigationContext);
}

/** Conecta el carrito de una página del catálogo con la barra inferior. */
export function useRegisterCatalogCartController(
  openCartSummary: () => void,
  closeCart: () => void,
) {
  const shellNav = useCatalogShellNavigationOptional();

  useEffect(() => {
    if (!shellNav) return;
    shellNav.registerCartController({
      open: openCartSummary,
      close: closeCart,
    });
    return () => {
      shellNav.registerCartController(null);
    };
  }, [shellNav, openCartSummary, closeCart]);
}
