"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loadCustomerCheckoutContext } from "@/lib/customers/checkout-actions";
import {
  clearStoredCustomerSession,
  readStoredCustomerSession,
  writeStoredCustomerSession,
} from "@/lib/customers/customer-session-storage";

export interface CustomerSessionState {
  isCustomer: boolean;
  userId: string | null;
  displayName: string | null;
  phone: string | null;
}

interface CustomerSessionContextValue extends CustomerSessionState {
  signOut: () => Promise<void>;
  signOutPending: boolean;
  refreshSession: () => Promise<void>;
  setSessionFromRegistration: (profile: {
    displayName: string;
    phone: string;
    userId?: string | null;
  }) => void;
}

const CustomerSessionContext = createContext<CustomerSessionContextValue | null>(
  null,
);

interface CustomerSessionProviderProps {
  storeSlug: string;
  initial: CustomerSessionState;
  children: ReactNode;
}

function mergeSessionState(
  server: CustomerSessionState,
  stored: ReturnType<typeof readStoredCustomerSession>,
): CustomerSessionState {
  if (server.isCustomer && server.displayName && server.phone) {
    return server;
  }

  if (stored) {
    return {
      isCustomer: true,
      userId: server.userId ?? stored.userId,
      displayName: server.displayName ?? stored.displayName,
      phone: server.phone ?? stored.phone,
    };
  }

  return server;
}

export function CustomerSessionProvider({
  storeSlug,
  initial,
  children,
}: CustomerSessionProviderProps) {
  const router = useRouter();
  const [session, setSession] = useState<CustomerSessionState>(initial);
  const [signOutPending, setSignOutPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const persistSession = useCallback(
    (next: CustomerSessionState) => {
      setSession(next);
      if (
        next.isCustomer &&
        next.displayName &&
        next.phone &&
        next.displayName.length >= 2 &&
        next.phone.length >= 10
      ) {
        writeStoredCustomerSession(storeSlug, {
          userId: next.userId,
          displayName: next.displayName,
          phone: next.phone,
        });
      }
    },
    [storeSlug],
  );

  useEffect(() => {
    const stored = readStoredCustomerSession(storeSlug);
    persistSession(mergeSessionState(initial, stored));
    setHydrated(true);
  }, [
    storeSlug,
    initial.isCustomer,
    initial.userId,
    initial.displayName,
    initial.phone,
    persistSession,
  ]);

  const refreshSession = useCallback(async () => {
    try {
      const context = await loadCustomerCheckoutContext(storeSlug);
      persistSession({
        isCustomer: context.isCustomer,
        userId: context.userId,
        displayName: context.displayName,
        phone: context.phone,
      });
    } catch (error) {
      console.error("[CustomerSessionProvider] refreshSession failed", error);
    }
  }, [persistSession, storeSlug]);

  useEffect(() => {
    if (!hydrated) return;

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearStoredCustomerSession(storeSlug);
        setSession({
          isCustomer: false,
          userId: null,
          displayName: null,
          phone: null,
        });
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void refreshSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [hydrated, refreshSession, storeSlug]);

  useEffect(() => {
    if (!hydrated) return;
    void refreshSession();
  }, [hydrated, refreshSession]);

  const setSessionFromRegistration = useCallback(
    (profile: {
      displayName: string;
      phone: string;
      userId?: string | null;
    }) => {
      persistSession({
        isCustomer: true,
        userId: profile.userId ?? session.userId,
        displayName: profile.displayName.trim(),
        phone: profile.phone.trim(),
      });
      router.refresh();
    },
    [persistSession, router, session.userId],
  );

  const signOut = useCallback(async () => {
    setSignOutPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      clearStoredCustomerSession(storeSlug);
      setSession({
        isCustomer: false,
        userId: null,
        displayName: null,
        phone: null,
      });
      router.refresh();
    } finally {
      setSignOutPending(false);
    }
  }, [router, storeSlug]);

  const value = useMemo<CustomerSessionContextValue>(
    () => ({
      ...session,
      signOut,
      signOutPending,
      refreshSession,
      setSessionFromRegistration,
    }),
    [
      session,
      signOut,
      signOutPending,
      refreshSession,
      setSessionFromRegistration,
    ],
  );

  return (
    <CustomerSessionContext.Provider value={value}>
      {children}
    </CustomerSessionContext.Provider>
  );
}

export function useCustomerSession(): CustomerSessionContextValue {
  const context = useContext(CustomerSessionContext);
  if (!context) {
    throw new Error(
      "useCustomerSession debe usarse dentro de CustomerSessionProvider.",
    );
  }
  return context;
}

export function useCustomerSessionOptional():
  | CustomerSessionContextValue
  | null {
  return useContext(CustomerSessionContext);
}

/** Datos del cliente para autocompletar checkout (local + remoto). */
export function useCustomerCheckoutPrefill(): {
  displayName: string | null;
  phone: string | null;
} {
  const session = useCustomerSessionOptional();
  return {
    displayName: session?.displayName ?? null,
    phone: session?.phone ?? null,
  };
}
