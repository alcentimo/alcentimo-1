import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabasePublicEnv, requireSupabasePublicEnv } from "@/lib/supabase/config";
import {
  buildCustomerAccountPath,
  getPrimaryCustomerStore,
  parseCustomerAccountPath,
  resolveActiveStoreBySlug,
  userHasMerchantStore,
  userIsCustomerOfStoreId,
  userIsMerchantOfStoreSlug,
} from "@/lib/customers/middleware-access";
import {
  checkSupportAdminAccess,
  resolveAuthEmail,
} from "@/lib/support/admin-access";

const DASHBOARD_PREFIX = "/dashboard";
const ADMIN_PREFIX = "/admin";
const DASHBOARD_LOGIN = "/dashboard/login";
const REGISTER_PATH = "/register";
const RECOVER_PASSWORD_PATH = "/dashboard/recuperar-contrasena";
const RESET_PASSWORD_PATH = "/dashboard/restablecer-contrasena";
const RESET_PASSWORD_SUCCESS_PATH = "/dashboard/restablecer-contrasena/exito";
const ONBOARDING_PATH = "/onboarding";
const AUTH_CONFIRM_PATH = "/auth/confirm";
const AUTH_CALLBACK_PATH = "/auth/callback";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!hasSupabasePublicEnv()) {
    return NextResponse.next();
  }

  const { url: supabaseUrl, anonKey: supabaseAnonKey } =
    requireSupabasePublicEnv();

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const authType = request.nextUrl.searchParams.get("type");
  const hasAuthParams = Boolean(code || tokenHash);

  // Supabase puede redirigir a /?code=... si la Site URL es la raíz del dominio.
  if (
    hasAuthParams &&
    pathname !== AUTH_CALLBACK_PATH &&
    pathname !== AUTH_CONFIRM_PATH
  ) {
    const isRecovery =
      authType === "recovery" ||
      Boolean(tokenHash) ||
      pathname === RESET_PASSWORD_PATH ||
      pathname === "/";

    if (isRecovery) {
      const confirmUrl = request.nextUrl.clone();
      confirmUrl.pathname = AUTH_CONFIRM_PATH;
      if (!confirmUrl.searchParams.has("next")) {
        confirmUrl.searchParams.set("next", RESET_PASSWORD_PATH);
      }
      return NextResponse.redirect(confirmUrl);
    }

    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = AUTH_CALLBACK_PATH;
    if (!callbackUrl.searchParams.has("next")) {
      callbackUrl.searchParams.set("next", ONBOARDING_PATH);
    }
    return NextResponse.redirect(callbackUrl);
  }

  const isDashboard = pathname.startsWith(DASHBOARD_PREFIX);
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
  const isRegisterRoute = pathname === REGISTER_PATH;
  const customerAccountPath = parseCustomerAccountPath(pathname);
  const isCustomerAccountRoute = Boolean(customerAccountPath);
  const isLoginPage = pathname === DASHBOARD_LOGIN;
  const isRecoverPasswordPage = pathname === RECOVER_PASSWORD_PATH;
  const isResetPasswordPage = pathname === RESET_PASSWORD_PATH;
  const isResetPasswordSuccessPage = pathname === RESET_PASSWORD_SUCCESS_PATH;
  const isResetPasswordFlow =
    isResetPasswordPage || isResetPasswordSuccessPage;
  const isPublicAuthPage =
    isLoginPage ||
    isRecoverPasswordPage ||
    isResetPasswordFlow;
  const isOnboarding = pathname === ONBOARDING_PATH;

  const authenticatedUser = user ?? null;

  // ── Área cliente: /c/{slug}/cuenta y /c/{slug}/perfil ───────
  if (isCustomerAccountRoute && customerAccountPath) {
    const { storeSlug } = customerAccountPath;

    if (!authenticatedUser) {
      const registerUrl = request.nextUrl.clone();
      registerUrl.pathname = REGISTER_PATH;
      registerUrl.search = "";
      registerUrl.searchParams.set("store", storeSlug);
      registerUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(registerUrl);
    }

    const store = await resolveActiveStoreBySlug(supabase, storeSlug);
    if (!store) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (await userIsMerchantOfStoreSlug(supabase, authenticatedUser.id, storeSlug)) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard/catalogo";
      dashboardUrl.search = "";
      return NextResponse.redirect(dashboardUrl);
    }

    const isCustomer = await userIsCustomerOfStoreId(
      supabase,
      authenticatedUser.id,
      store.id,
    );

    if (!isCustomer) {
      const registerUrl = request.nextUrl.clone();
      registerUrl.pathname = REGISTER_PATH;
      registerUrl.search = "";
      registerUrl.searchParams.set("store", storeSlug);
      registerUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(registerUrl);
    }

    return supabaseResponse;
  }

  // ── Registro cliente: /register ────────────────────────────
  if (isRegisterRoute && authenticatedUser) {
    const storeSlug = request.nextUrl.searchParams.get("store")?.trim().toLowerCase();
    const nextPath = request.nextUrl.searchParams.get("next");

    if (storeSlug) {
      const store = await resolveActiveStoreBySlug(supabase, storeSlug);
      if (
        store &&
        (await userIsCustomerOfStoreId(supabase, authenticatedUser.id, store.id))
      ) {
        const accountUrl = request.nextUrl.clone();
        accountUrl.pathname =
          nextPath?.startsWith(`/c/${storeSlug}/`) && nextPath.startsWith("/c/")
            ? nextPath
            : buildCustomerAccountPath(storeSlug);
        accountUrl.search = "";
        return NextResponse.redirect(accountUrl);
      }
    }

    if (await userHasMerchantStore(supabase, authenticatedUser.id)) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard/catalogo";
      dashboardUrl.search = "";
      return NextResponse.redirect(dashboardUrl);
    }

    return supabaseResponse;
  }

  if (isAdminRoute) {
    if (!authenticatedUser) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = DASHBOARD_LOGIN;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const adminEmail = resolveAuthEmail(authenticatedUser);
    const adminAccess = checkSupportAdminAccess(adminEmail);

    if (!adminAccess.ok) {
      console.warn("[admin-access-denied]", {
        path: pathname,
        reason: adminAccess.reason,
        sessionEmail: authenticatedUser.email ?? null,
        resolvedEmail: adminEmail,
        allowlistCount: adminAccess.allowlistCount,
        envVarPresent: Boolean(process.env.SUPPORT_ADMIN_EMAILS?.trim()),
      });

      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard/catalogo";
      dashboardUrl.searchParams.set("admin_denied", adminAccess.reason ?? "denied");
      return NextResponse.redirect(dashboardUrl);
    }

    return supabaseResponse;
  }

  if (isOnboarding) {
    if (!authenticatedUser) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = DASHBOARD_LOGIN;
      loginUrl.searchParams.set("next", ONBOARDING_PATH);
      return NextResponse.redirect(loginUrl);
    }

    if (await userHasMerchantStore(supabase, authenticatedUser.id)) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard/catalogo";
      dashboardUrl.search = "";
      return NextResponse.redirect(dashboardUrl);
    }

    const customerStore = await getPrimaryCustomerStore(
      supabase,
      authenticatedUser.id,
    );
    if (customerStore) {
      const accountUrl = request.nextUrl.clone();
      accountUrl.pathname = buildCustomerAccountPath(customerStore.storeSlug);
      accountUrl.search = "";
      return NextResponse.redirect(accountUrl);
    }

    return supabaseResponse;
  }

  if (isDashboard) {
    if (!authenticatedUser && !isPublicAuthPage) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = DASHBOARD_LOGIN;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (authenticatedUser && !isLoginPage && !isResetPasswordFlow) {
      const hasMerchantStore = await userHasMerchantStore(
        supabase,
        authenticatedUser.id,
      );

      if (!hasMerchantStore) {
        const customerStore = await getPrimaryCustomerStore(
          supabase,
          authenticatedUser.id,
        );

        if (customerStore) {
          const accountUrl = request.nextUrl.clone();
          accountUrl.pathname = buildCustomerAccountPath(customerStore.storeSlug);
          accountUrl.search = "";
          return NextResponse.redirect(accountUrl);
        }

        const onboardingUrl = request.nextUrl.clone();
        onboardingUrl.pathname = ONBOARDING_PATH;
        onboardingUrl.search = "";
        return NextResponse.redirect(onboardingUrl);
      }
    }

    if (authenticatedUser && isLoginPage) {
      const next = request.nextUrl.searchParams.get("next");
      const redirectUrl = request.nextUrl.clone();

      if (
        next?.startsWith(ADMIN_PREFIX) &&
        checkSupportAdminAccess(resolveAuthEmail(authenticatedUser)).ok
      ) {
        redirectUrl.pathname = next;
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }

      const hasMerchantStore = await userHasMerchantStore(
        supabase,
        authenticatedUser.id,
      );

      if (hasMerchantStore) {
        redirectUrl.pathname =
          next &&
          (next.startsWith(DASHBOARD_PREFIX) || next.startsWith(ADMIN_PREFIX))
            ? next
            : "/dashboard";
      } else {
        const customerStore = await getPrimaryCustomerStore(
          supabase,
          authenticatedUser.id,
        );

        if (customerStore) {
          redirectUrl.pathname = buildCustomerAccountPath(customerStore.storeSlug);
        } else {
          redirectUrl.pathname = ONBOARDING_PATH;
        }
      }

      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Todas las rutas /api/* gestionan su propia auth (Supabase, CRON_SECRET, API keys).
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
