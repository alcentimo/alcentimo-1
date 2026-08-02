"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CustomerAccountMode } from "@/lib/store-settings/types";

interface CustomerAccountModeContextValue {
  accountMode: CustomerAccountMode;
  /** Siempre true: invitado + login/registro opcional. */
  accountsEnabled: boolean;
}

const HYBRID_VALUE: CustomerAccountModeContextValue = {
  accountMode: "hibrido",
  accountsEnabled: true,
};

const CustomerAccountModeContext =
  createContext<CustomerAccountModeContextValue>(HYBRID_VALUE);

export function CustomerAccountModeProvider({
  accountMode: _accountMode,
  children,
}: {
  /** Ignorado: la plataforma fuerza siempre modo híbrido. */
  accountMode?: CustomerAccountMode;
  children: ReactNode;
}) {
  return (
    <CustomerAccountModeContext.Provider value={HYBRID_VALUE}>
      {children}
    </CustomerAccountModeContext.Provider>
  );
}

export function useCustomerAccountMode(): CustomerAccountModeContextValue {
  return useContext(CustomerAccountModeContext);
}
