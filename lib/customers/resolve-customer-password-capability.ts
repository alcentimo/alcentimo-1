import "server-only";

import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  customerCanManagePassword,
  formatCustomerExternalAuthProviderLabel,
  resolveCustomerExternalAuthProvider,
} from "@/lib/customers/phone-auth";

export interface CustomerPasswordCapability {
  canChangePassword: boolean;
  externalProvider: string | null;
  externalProviderLabel: string;
}

function toCapability(user: {
  email?: string | null;
  identities?: Array<{ provider: string }> | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}): CustomerPasswordCapability {
  const canChangePassword = customerCanManagePassword(user);
  const externalProvider = canChangePassword
    ? null
    : resolveCustomerExternalAuthProvider(user);

  return {
    canChangePassword,
    externalProvider,
    externalProviderLabel:
      formatCustomerExternalAuthProviderLabel(externalProvider),
  };
}

/**
 * Resuelve con datos completos de Auth (identities / app_metadata).
 * `getUser()` del cliente a veces no trae identities; el admin sí.
 */
export async function resolveCustomerPasswordCapability(
  user: User,
): Promise<CustomerPasswordCapability> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(user.id);
    if (!error && data.user) {
      return toCapability(data.user);
    }
  } catch {
    // Fallback al user de sesión.
  }

  return toCapability(user);
}
