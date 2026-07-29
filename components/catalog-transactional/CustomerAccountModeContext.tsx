"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CustomerAccountMode } from "@/lib/store-settings/types";

interface CustomerAccountModeContextValue {
  accountMode: CustomerAccountMode;
  /** true cuando el modo permite registro / login de clientes. */
  accountsEnabled: boolean;
}

const CustomerAccountModeContext =
  createContext<CustomerAccountModeContextValue>({
    accountMode: "hibrido",
    accountsEnabled: true,
  });

export function CustomerAccountModeProvider({
  accountMode,
  children,
}: {
  accountMode: CustomerAccountMode;
  children: ReactNode;
}) {
  const value: CustomerAccountModeContextValue = {
    accountMode,
    accountsEnabled: accountMode === "hibrido",
  };

  return (
    <CustomerAccountModeContext.Provider value={value}>
      {children}
    </CustomerAccountModeContext.Provider>
  );
}

export function useCustomerAccountMode(): CustomerAccountModeContextValue {
  return useContext(CustomerAccountModeContext);
}
