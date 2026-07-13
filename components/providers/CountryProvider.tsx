"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { StoreCountryOption } from "@/lib/onboarding/countries";
import {
  getCountryConfig,
  getPaymentGroupsForCountry,
  getSalesPaymentMethodsForCountry,
  getShippingMethodsForCountry,
  resolveStoreCountry,
  type CountryConfig,
} from "@/lib/country-config";
import type { PaymentMethodGroupDefinition } from "@/src/config/payment-methods";
import type { ShippingMethodDefinition } from "@/src/config/shipping-methods";
import type { SalesPaymentMethodDefinition } from "@/src/config/sales-payment-methods";

export interface CountryContextValue {
  country: StoreCountryOption;
  config: CountryConfig;
  paymentGroups: PaymentMethodGroupDefinition[];
  shippingMethods: ShippingMethodDefinition[];
  salesPaymentMethods: SalesPaymentMethodDefinition[];
}

const CountryContext = createContext<CountryContextValue | null>(null);

interface CountryProviderProps {
  children: ReactNode;
  /** Valor de `stores.country` resuelto en el servidor. */
  country: string | null | undefined;
}

/**
 * Provee la configuración regional de la tienda activa.
 * El valor se calcula una vez por sesión de layout (sin fetch extra).
 */
export function CountryProvider({ children, country }: CountryProviderProps) {
  const value = useMemo<CountryContextValue>(() => {
    const resolved = resolveStoreCountry(country);
    const config = getCountryConfig(resolved);

    return {
      country: resolved,
      config,
      paymentGroups: getPaymentGroupsForCountry(resolved),
      shippingMethods: getShippingMethodsForCountry(resolved),
      salesPaymentMethods: getSalesPaymentMethodsForCountry(resolved),
    };
  }, [country]);

  return (
    <CountryContext.Provider value={value}>{children}</CountryContext.Provider>
  );
}

export function useCountry(): CountryContextValue {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error("useCountry debe usarse dentro de CountryProvider.");
  }
  return context;
}

/** Variante segura para componentes compartidos fuera del dashboard. */
export function useOptionalCountry(): CountryContextValue | null {
  return useContext(CountryContext);
}
