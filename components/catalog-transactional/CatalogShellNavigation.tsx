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

export type CatalogCustomerAuthMode = "register" | "login";

interface CatalogShellNavigationContextValue {
  profileOpen: boolean;
  registerOpen: boolean;
  registerMode: CatalogCustomerAuthMode;
  cartActive: boolean;
  searchActive: boolean;
  openProfile: () => void;
  closeProfile: () => void;
  openRegister: (mode?: CatalogCustomerAuthMode) => void;
  closeRegister: () => void;
  setRegisterMode: (mode: CatalogCustomerAuthMode) => void;
  openCart: () => void;
  closeCart: () => void;
  setCartActive: (active: boolean) => void;
  focusSearch: () => void;
  clearSearchActive: () => void;
  registerCartController: (controller: CatalogCartController | null) => void;
  registerSearchFocus: (focus: (() => void) | null) => void;
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
  const searchFocusRef = useRef<(() => void) | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerMode, setRegisterMode] =
    useState<CatalogCustomerAuthMode>("register");
  const [cartActive, setCartActive] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  const registerCartController = useCallback(
    (controller: CatalogCartController | null) => {
      cartControllerRef.current = controller;
    },
    [],
  );

  const registerSearchFocus = useCallback((focus: (() => void) | null) => {
    searchFocusRef.current = focus;
  }, []);

  const clearSearchActive = useCallback(() => {
    setSearchActive(false);
  }, []);

  const focusSearch = useCallback(() => {
    cartControllerRef.current?.close();
    setCartActive(false);
    setProfileOpen(false);
    setRegisterOpen(false);
    setSearchActive(true);
    searchFocusRef.current?.();
  }, []);

  const openCart = useCallback(() => {
    if (cartControllerRef.current) {
      cartControllerRef.current.open();
      setCartActive(true);
      setProfileOpen(false);
      setRegisterOpen(false);
      setSearchActive(false);
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
    setSearchActive(false);
  }, []);

  const closeProfile = useCallback(() => {
    setProfileOpen(false);
  }, []);

  const openRegister = useCallback((mode: CatalogCustomerAuthMode = "register") => {
    cartControllerRef.current?.close();
    setProfileOpen(false);
    setRegisterMode(mode);
    setRegisterOpen(true);
    setCartActive(false);
    setSearchActive(false);
  }, []);

  const closeRegister = useCallback(() => {
    setRegisterOpen(false);
    setRegisterMode("register");
  }, []);

  const value = useMemo<CatalogShellNavigationContextValue>(
    () => ({
      profileOpen,
      registerOpen,
      registerMode,
      cartActive,
      searchActive,
      openProfile,
      closeProfile,
      openRegister,
      closeRegister,
      setRegisterMode,
      openCart,
      closeCart,
      setCartActive,
      focusSearch,
      clearSearchActive,
      registerCartController,
      registerSearchFocus,
    }),
    [
      profileOpen,
      registerOpen,
      registerMode,
      cartActive,
      searchActive,
      openProfile,
      closeProfile,
      openRegister,
      closeRegister,
      openCart,
      closeCart,
      focusSearch,
      clearSearchActive,
      registerCartController,
      registerSearchFocus,
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

/** Conecta el foco del buscador del catálogo con la pestaña Buscar. */
export function useRegisterCatalogSearchFocus(focusSearchInput: () => void) {
  const shellNav = useCatalogShellNavigationOptional();

  useEffect(() => {
    if (!shellNav) return;
    shellNav.registerSearchFocus(focusSearchInput);
    return () => {
      shellNav.registerSearchFocus(null);
    };
  }, [shellNav, focusSearchInput]);
}
