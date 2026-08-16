"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { getAuthCaughtMessage, logAuthEvent } from "@/lib/auth/auth-log";
import { signUpWithConfirmationEmailAction } from "@/lib/auth/auth-email-actions";
import {
  PENDING_CONFIRMATION_RESENT_MESSAGE,
  isPendingActivationNotice,
  isExistingConfirmedAccountError,
  parseAuthEmailActionResult,
} from "@/lib/auth/auth-email-types";
import { devSignUpAndSignIn } from "@/lib/auth/dev-signup";
import {
  isInvitationNextPath,
  resolvePostAuthPath,
} from "@/lib/auth/post-auth-redirect";
import { resolveAuthenticatedPostAuthPath } from "@/lib/auth/resolve-authenticated-post-auth-path";
import { createClient } from "@/lib/supabase/client";
import { ensureBrowserSessionReady } from "@/lib/auth/ensure-browser-session";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { CustomerVerificationFields } from "@/components/customers/CustomerVerificationFields";
import { SignupEmailVerificationPanel } from "@/components/dashboard/SignupEmailVerificationPanel";
import { DashboardPostAuthLoading } from "@/components/dashboard/DashboardPostAuthLoading";
import { markPostLoginNotify } from "@/lib/dashboard/post-login-notify";

const devSkipEmailConfirmation =
  process.env.NEXT_PUBLIC_DEV_SKIP_EMAIL_CONFIRMATION === "true";

function clearAuthErrorParamsFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("error") && !url.searchParams.has("error_description")) {
    return;
  }
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function AuthPanel({ defaultMode }: { defaultMode?: "login" | "signup" } = {}) {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const modeParam = searchParams.get("mode");
  const urlError = searchParams.get("error");
  const urlErrorDescription = searchParams.get("error_description");
  const postAuthPath = resolvePostAuthPath(nextParam);
  const isInvitationFlow = isInvitationNextPath(nextParam);

  const [mode, setMode] = useState<"login" | "signup">(
    isInvitationFlow || modeParam === "signup" || defaultMode === "signup"
      ? "signup"
      : "login",
  );
  const [displayName, setDisplayName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    if (!urlError && !urlErrorDescription) return null;
    return formatAuthError(urlErrorDescription || urlError);
  });
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupConfirmationSent, setSignupConfirmationSent] = useState(false);
  const [signupNotice, setSignupNotice] = useState<string | null>(null);
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);
  const [existingAccountNotice, setExistingAccountNotice] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const requireVerificationFields = mode === "signup" && !isInvitationFlow;

  function navigateAfterAuth(path: string) {
    markPostLoginNotify();
    setRedirecting(true);
    window.location.assign(path);
  }

  useEffect(() => {
    if (!urlError && !urlErrorDescription) return;
    const message = formatAuthError(urlErrorDescription || urlError);
    setError(message);
    logAuthEvent(
      "login_url_error",
      { code: urlError, description: urlErrorDescription },
      "warn",
    );
    clearAuthErrorParamsFromUrl();
  }, [urlError, urlErrorDescription]);

  function switchMode(nextMode: "login" | "signup") {
    setMode(nextMode);
    setError(null);
    setSuccessNotice(null);
    setSignupConfirmationSent(false);
    setSignupNotice(null);
    setAcceptedLegalTerms(false);
    if (nextMode === "signup") {
      setExistingAccountNotice(false);
    }
  }

  function goToLoginForExistingAccount() {
    setError(null);
    setSuccessNotice(null);
    setExistingAccountNotice(true);
    setMode("login");
    window.requestAnimationFrame(() => {
      document.getElementById("password")?.focus();
    });
  }

  function showPendingActivationNotice(notice?: string | null) {
    const message = notice?.trim() || PENDING_CONFIRMATION_RESENT_MESSAGE;
    setError(null);
    setSuccessNotice(message);
    setSignupNotice(message);
    setSignupConfirmationSent(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (mode === "signup" && !acceptedLegalTerms) {
      setError(
        "Debes aceptar los Términos y Condiciones y la Política de Privacidad.",
      );
      return;
    }

    setLoading(true);

    if (mode === "signup" && devSkipEmailConfirmation) {
      try {
        const devResult = await devSignUpAndSignIn(email, password, {
          requireVerificationFields,
          displayName,
          documentId,
          phone,
          businessName,
          city,
          state: stateRegion,
          socialUrl,
        });
        setLoading(false);

        if (!devResult.ok) {
          if (isExistingConfirmedAccountError(devResult.error)) {
            goToLoginForExistingAccount();
            return;
          }
          setError(formatAuthError(devResult.error));
          return;
        }

        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const destination = user
          ? await resolveAuthenticatedPostAuthPath(nextParam, {
              userId: user.id,
              email: user.email ?? null,
            })
          : resolvePostAuthPath(nextParam);
        navigateAfterAuth(destination);
      } catch (caught) {
        setLoading(false);
        const message = getAuthCaughtMessage(caught);
        logAuthEvent("dev_signup_exception", { message }, "error");
        setError(formatAuthError(message || "No se pudo completar el registro."));
      }
      return;
    }

    if (mode === "signup") {
      try {
        const rawResult = await signUpWithConfirmationEmailAction({
          email,
          password,
          nextPath: nextParam,
          requireVerificationFields,
          displayName,
          documentId,
          phone,
          businessName,
          city,
          state: stateRegion,
          socialUrl,
        });
        const signupResult = parseAuthEmailActionResult(rawResult);
        setLoading(false);

        if (signupResult.ok) {
          if (
            signupResult.resentPendingConfirmation ||
            (signupResult.notice &&
              isPendingActivationNotice(signupResult.notice))
          ) {
            showPendingActivationNotice(signupResult.notice);
            return;
          }

          setSignupNotice(signupResult.notice ?? null);
          setSignupConfirmationSent(true);
          return;
        }

        if (isPendingActivationNotice(signupResult.error)) {
          showPendingActivationNotice(signupResult.error);
          return;
        }

        if (isExistingConfirmedAccountError(signupResult.error)) {
          goToLoginForExistingAccount();
          return;
        }

        logAuthEvent("signup_failed", { error: signupResult.error }, "warn");
        setError(
          signupResult.error.startsWith("No pudimos reenviar")
            ? signupResult.error
            : formatAuthError(signupResult.error),
        );
      } catch (caught) {
        setLoading(false);
        const message = getAuthCaughtMessage(caught);

        if (isExistingConfirmedAccountError(message)) {
          goToLoginForExistingAccount();
          return;
        }

        if (isPendingActivationNotice(message)) {
          showPendingActivationNotice(message);
          return;
        }

        logAuthEvent("signup_exception", { message }, "error");
        setError(formatAuthError(message || "No se pudo completar el registro."));
      }
      return;
    }

    try {
      const supabase = createClient();
      const result = await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        setLoading(false);
        logAuthEvent(
          "signin_failed",
          {
            message: result.error.message,
            status: result.error.status ?? null,
            code: result.error.code ?? null,
          },
          "warn",
        );
        setError(formatAuthError(result.error.message));
        return;
      }

      if (!result.data.session) {
        setLoading(false);
        logAuthEvent("signin_no_session_payload", {}, "warn");
        setError(
          "El acceso se inició, pero la sesión no quedó lista en este dispositivo. Intenta de nuevo.",
        );
        return;
      }

      if (!result.data.user?.email_confirmed_at) {
        setLoading(false);
        await supabase.auth.signOut();
        setError(
          "Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja y spam.",
        );
        return;
      }

      const sessionReady = await ensureBrowserSessionReady(
        supabase,
        result.data.session,
      );
      setLoading(false);

      if (!sessionReady) {
        setError(
          "El acceso se inició, pero la sesión no quedó lista en este dispositivo. Intenta de nuevo.",
        );
        return;
      }

      logAuthEvent("signin_success", { hasUser: Boolean(result.data.user) });
      // Evitar Server Action que lea/escriba cookies tras signIn (rompe con
      // "Unexpected response"). Destino de tienda es local; solo consultamos
      // servidor si next pide explícitamente /proveedor.
      const nextPath = nextParam?.trim() || null;
      let destination = resolvePostAuthPath(nextPath);
      if (nextPath?.startsWith("/proveedor") && result.data.user) {
        destination = await resolveAuthenticatedPostAuthPath(nextPath, {
          userId: result.data.user.id,
          email: result.data.user.email ?? null,
        }).catch(() => resolvePostAuthPath(nextPath));
      }
      navigateAfterAuth(destination);
    } catch (caught) {
      setLoading(false);
      const message = getAuthCaughtMessage(caught);
      logAuthEvent("signin_exception", { message }, "error");
      setError(
        formatAuthError(
          message ||
            "No se pudo iniciar sesión. Revisa tu conexión e intenta de nuevo.",
        ),
      );
    }
  }

  if (signupConfirmationSent) {
    return (
      <SignupEmailVerificationPanel
        email={email}
        nextPath={postAuthPath}
        notice={signupNotice}
        isInvitationFlow={isInvitationFlow}
        freshSignup
        signupPassword={password}
      />
    );
  }

  if (redirecting) {
    return <DashboardPostAuthLoading />;
  }

  const isBusy = loading;

  return (
    <div
      className={`card-panel mx-auto w-full ${
        requireVerificationFields ? "max-w-lg" : "max-w-md"
      }`}
    >
      <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
        {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
      </h2>
      <p className="mt-1 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
        {isInvitationFlow
          ? "Crea tu cuenta o inicia sesión para aceptar la invitación al equipo."
          : mode === "signup"
            ? "Completa tus datos de verificación para registrar tu tienda."
            : "Accede al panel para gestionar tu catálogo."}
      </p>

      {isInvitationFlow ? (
        <p className="mt-3 rounded-lg border border-teal-200/80 bg-teal-50/70 px-3 py-2 text-xs text-teal-900 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-200">
          Usa el mismo correo al que te llegó la invitación.
        </p>
      ) : null}

      {devSkipEmailConfirmation && mode === "signup" ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          Modo desarrollo: el registro no envía correo de confirmación.
        </p>
      ) : null}

      {/* En registro verificado evitamos Google para no saltarse los campos. */}
      {!requireVerificationFields ? (
        <>
          <GoogleSignInButton
            postAuthPath={postAuthPath}
            disabled={isBusy}
            className="mt-6"
            buttonClassName="rounded-xl border-zinc-300 bg-white py-3.5 text-base font-semibold shadow-md shadow-zinc-900/10 ring-1 ring-zinc-900/5 hover:bg-zinc-50 hover:shadow-lg dark:border-zinc-600 dark:shadow-black/30 dark:ring-white/10 dark:hover:bg-zinc-800"
            onError={(message) => {
              logAuthEvent("google_signin_error", { message }, "warn");
              setError(formatAuthError(message));
            }}
          />

          <div className="relative my-6">
            <div
              className="absolute inset-x-0 top-1/2 border-t border-zinc-200 dark:border-zinc-700"
              aria-hidden="true"
            />
            <p className="relative mx-auto w-fit bg-white px-3 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:bg-zinc-950 dark:text-zinc-500">
              o con tu correo
            </p>
          </div>
        </>
      ) : (
        <div className="mt-6" />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {requireVerificationFields ? (
          <>
            <div>
              <label htmlFor="signup_display_name" className="label-field">
                Nombre y Apellido
              </label>
              <input
                id="signup_display_name"
                name="displayName"
                type="text"
                required
                minLength={2}
                autoComplete="name"
                value={displayName}
                disabled={isBusy}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
                placeholder="Nombre y apellido"
              />
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Datos de verificación
            </p>

            <CustomerVerificationFields
              idPrefix="signup"
              documentId={documentId}
              phone={phone}
              businessName={businessName}
              city={city}
              stateRegion={stateRegion}
              socialUrl={socialUrl}
              disabled={isBusy}
              onDocumentIdChange={setDocumentId}
              onPhoneChange={setPhone}
              onBusinessNameChange={setBusinessName}
              onCityChange={setCity}
              onStateRegionChange={setStateRegion}
              onSocialUrlChange={setSocialUrl}
            />
          </>
        ) : null}

        <div>
          <label htmlFor="email" className="label-field">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            disabled={isBusy}
            onChange={(e) => {
              setEmail(e.target.value);
              setExistingAccountNotice(false);
            }}
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="password" className="label-field">
            Contraseña
          </label>
          <PasswordInput
            id="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            disabled={isBusy}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "login" ? (
            <p className="mt-2 text-right">
              <Link href="/dashboard/recuperar-contrasena" className="link-brand text-sm">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          ) : null}
        </div>

        {mode === "signup" ? (
          <label className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            <input
              id="accept_legal_terms"
              type="checkbox"
              checked={acceptedLegalTerms}
              onChange={(event) => setAcceptedLegalTerms(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600"
            />
            <span>
              Acepto los{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="link-brand"
              >
                Términos y Condiciones
              </Link>{" "}
              y la{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="link-brand"
              >
                Política de Privacidad
              </Link>
            </span>
          </label>
        ) : null}

        {existingAccountNotice && mode === "login" ? (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
            role="alert"
          >
            Este correo ya está registrado. Por favor, inicia sesión.
          </div>
        ) : null}

        {successNotice ? (
          <p
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
            role="status"
          >
            {successNotice}
          </p>
        ) : null}

        {error ? <p className="alert-error">{error}</p> : null}

        <button
          type="submit"
          disabled={isBusy || (mode === "signup" && !acceptedLegalTerms)}
          className="btn-primary"
        >
          {loading ? "Procesando…" : mode === "login" ? "Entrar" : "Registrarme"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => switchMode(mode === "login" ? "signup" : "login")}
        className="touch-target mt-5 w-full text-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        {mode === "login" ? (
          <>
            ¿No tienes cuenta?{" "}
            <span className="link-brand">Regístrate</span>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <span className="link-brand">Inicia sesión</span>
          </>
        )}
      </button>
    </div>
  );
}
