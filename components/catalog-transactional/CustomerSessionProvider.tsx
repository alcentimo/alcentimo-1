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
import {
  isValidCustomerEmail,
  isValidCustomerPhone,
  normalizeCustomerPhone,
} from "@/lib/customers/phone-auth";

export interface CustomerSessionState {
  isAuthenticated: boolean;
  isCustomer: boolean;
  userId: string | null;
  displayName: string | null;
  phone: string | null;
  contactEmail: string | null;
}

interface CustomerSessionContextValue extends CustomerSessionState {
  signOut: () => Promise<void>;
  signOutPending: boolean;
  refreshSession: () => Promise<void>;
  setSessionFromRegistration: (profile: {
    displayName: string;
    phone?: string | null;
    contactEmail?: string | null;
    userId?: string | null;
  }) => void;
}

const CustomerSessionContext = createContext<CustomerSessionContextValue | null>(
  null,
);

interface CustomerSessionProviderProps {
  storeSlug: string;
  initial: Omit<CustomerSessionState, "isAuthenticated"> & {
    isAuthenticated?: boolean;
  };
  children: ReactNode;
}

function normalizeSessionPhone(phone: string | null | undefined): string | null {
  const trimmed = phone?.trim();
  if (!trimmed) return null;
  if (isValidCustomerPhone(trimmed)) {
    return normalizeCustomerPhone(trimmed);
  }
  return trimmed;
}

function hasSessionIdentity(state: {
  displayName: string | null;
  phone: string | null;
  contactEmail?: string | null;
}): boolean {
  const nameOk = Boolean(state.displayName && state.displayName.trim().length >= 2);
  const phoneOk = Boolean(
    state.phone && isValidCustomerPhone(state.phone.trim()),
  );
  const emailOk = Boolean(
    state.contactEmail && isValidCustomerEmail(state.contactEmail.trim()),
  );
  return nameOk && (phoneOk || emailOk);
}

function pickDisplayName(
  primary: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  const first = primary?.trim();
  if (first && first.length >= 2) return first;
  const second = fallback?.trim();
  if (second && second.length >= 2) return second;
  return null;
}

function pickPhone(
  primary: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  const first = normalizeSessionPhone(primary);
  if (first && isValidCustomerPhone(first)) return first;
  const second = normalizeSessionPhone(fallback);
  if (second && isValidCustomerPhone(second)) return second;
  return first ?? second;
}

function mergeSessionState(
  server: CustomerSessionState,
  stored: ReturnType<typeof readStoredCustomerSession>,
): CustomerSessionState {
  if (!stored) {
    return {
      ...server,
      phone: normalizeSessionPhone(server.phone),
      contactEmail: server.contactEmail ?? null,
    };
  }

  const sameUser =
    !server.userId || !stored.userId || server.userId === stored.userId;

  if (!sameUser) {
    if (server.isAuthenticated || server.isCustomer) {
      return {
        ...server,
        phone: normalizeSessionPhone(server.phone),
        contactEmail: server.contactEmail ?? null,
      };
    }

    return {
      isAuthenticated: Boolean(stored.userId),
      isCustomer: true,
      userId: stored.userId,
      displayName: stored.displayName,
      phone: normalizeSessionPhone(stored.phone),
      contactEmail: stored.contactEmail,
    };
  }

  const merged: CustomerSessionState = {
    isAuthenticated:
      server.isAuthenticated || server.isCustomer || Boolean(server.userId),
    isCustomer: server.isCustomer || hasSessionIdentity(stored),
    userId: server.userId ?? stored.userId,
    displayName: pickDisplayName(server.displayName, stored.displayName),
    phone: pickPhone(server.phone, stored.phone),
    contactEmail: server.contactEmail ?? stored.contactEmail,
  };

  return merged;
}

function toSessionState(
  initial: CustomerSessionProviderProps["initial"],
): CustomerSessionState {
  return {
    isAuthenticated:
      initial.isAuthenticated ??
      Boolean(initial.isCustomer || initial.userId),
    isCustomer: initial.isCustomer,
    userId: initial.userId,
    displayName: initial.displayName,
    phone: normalizeSessionPhone(initial.phone),
    contactEmail: initial.contactEmail ?? null,
  };
}

export function CustomerSessionProvider({
  storeSlug,
  initial,
  children,
}: CustomerSessionProviderProps) {
  const router = useRouter();
  const [session, setSession] = useState<CustomerSessionState>(() =>
    toSessionState(initial),
  );
  const [signOutPending, setSignOutPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const persistSession = useCallback(
    (next: CustomerSessionState) => {
      const normalized: CustomerSessionState = {
        ...next,
        phone: normalizeSessionPhone(next.phone),
        contactEmail: next.contactEmail ?? null,
      };
      setSession(normalized);
      if (normalized.isCustomer && hasSessionIdentity(normalized)) {
        writeStoredCustomerSession(storeSlug, {
          userId: normalized.userId,
          displayName: normalized.displayName!,
          phone: normalized.phone,
          contactEmail: normalized.contactEmail,
        });
      }
    },
    [storeSlug],
  );

  useEffect(() => {
    const stored = readStoredCustomerSession(storeSlug);
    persistSession(mergeSessionState(toSessionState(initial), stored));
    setHydrated(true);
  }, [
    storeSlug,
    initial.isAuthenticated,
    initial.isCustomer,
    initial.userId,
    initial.displayName,
    initial.phone,
    initial.contactEmail,
    persistSession,
  ]);

  const refreshSession = useCallback(async () => {
    try {
      const context = await loadCustomerCheckoutContext(storeSlug);
      const stored = readStoredCustomerSession(storeSlug);
      persistSession(
        mergeSessionState(
          {
            isAuthenticated: context.isAuthenticated,
            isCustomer: context.isCustomer,
            userId: context.userId,
            displayName: context.displayName,
            phone: context.phone,
            contactEmail: context.contactEmail ?? null,
          },
          stored,
        ),
      );
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
          isAuthenticated: false,
          isCustomer: false,
          userId: null,
          displayName: null,
          phone: null,
          contactEmail: null,
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
      phone?: string | null;
      contactEmail?: string | null;
      userId?: string | null;
    }) => {
      persistSession({
        isAuthenticated: true,
        isCustomer: true,
        userId: profile.userId ?? session.userId,
        displayName: profile.displayName.trim(),
        phone: profile.phone?.trim() || null,
        contactEmail: profile.contactEmail?.trim() || null,
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
        isAuthenticated: false,
        isCustomer: false,
        userId: null,
        displayName: null,
        phone: null,
        contactEmail: null,
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
  isAuthenticated: boolean;
  isCustomer: boolean;
  displayName: string | null;
  phone: string | null;
  contactEmail: string | null;
} {
  const session = useCustomerSessionOptional();
  return {
    isAuthenticated: session?.isAuthenticated ?? false,
    isCustomer: session?.isCustomer ?? false,
    displayName: session?.displayName ?? null,
    phone: session?.phone ?? null,
    contactEmail: session?.contactEmail ?? null,
  };
}
