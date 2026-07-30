"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { AccountSettingsPanel } from "@/components/dashboard/account/AccountSettingsPanel";
import { getAccountSnapshotAction } from "@/lib/account/actions";
import type { AccountSnapshot } from "@/lib/account/types";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface AccountSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: string;
  showBillingTab?: boolean;
  canUpgradeToBusiness?: boolean;
  onTabChange?: (tab: string) => void;
  /** Snapshot precargado con el chrome del dashboard (apertura instantánea). */
  initialAccount?: AccountSnapshot | null;
  /** Dispara prefetch en segundo plano (p. ej. hover del menú). */
  prefetchToken?: number;
}

export function AccountSettingsSheet({
  open,
  onOpenChange,
  initialTab,
  showBillingTab = false,
  canUpgradeToBusiness = false,
  onTabChange,
  initialAccount = null,
  prefetchToken = 0,
}: AccountSettingsSheetProps) {
  const [account, setAccount] = useState<AccountSnapshot | null>(
    initialAccount,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const accountRef = useRef(account);
  accountRef.current = account;

  useEffect(() => {
    if (!initialAccount) return;
    setAccount((prev) => prev ?? initialAccount);
  }, [initialAccount]);

  function loadAccount(options?: { background?: boolean }) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const background = options?.background ?? false;
    if (!background && !accountRef.current) {
      setLoading(true);
      setError(null);
    }

    void getAccountSnapshotAction()
      .then((result) => {
        if (!result.ok) {
          if (!accountRef.current) {
            setError(result.error);
          }
          return;
        }
        setAccount(result.account);
        setError(null);
      })
      .finally(() => {
        setLoading(false);
        inFlightRef.current = false;
      });
  }

  useEffect(() => {
    if (prefetchToken <= 0) return;
    if (accountRef.current) return;
    loadAccount({ background: true });
  }, [prefetchToken]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setLoading(false);
      return;
    }

    // Shell o caché: abrir al instante sin spinner.
    if (accountRef.current) return;

    loadAccount({ background: false });
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onClose={() => onOpenChange(false)}
        className="account-settings-sheet w-full max-w-3xl sm:max-w-4xl lg:max-w-5xl"
      >
        <SheetHeader>
          <SheetTitle>Perfil y cuenta</SheetTitle>
          <SheetDescription>
            Administra tus datos personales, seguridad y facturación de tu cuenta.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex min-h-0 flex-1 flex-col px-4 pb-6 sm:px-6">
          {loading && !account ? (
            <div className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Cargando tu cuenta…
            </div>
          ) : null}

          {error && !account && !loading ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          ) : null}

          {account ? (
            <AccountSettingsPanel
              account={account}
              initialTab={initialTab}
              showBillingTab={showBillingTab}
              canUpgradeToBusiness={canUpgradeToBusiness}
              onNavigate={() => onOpenChange(false)}
              onTabChange={onTabChange}
            />
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
