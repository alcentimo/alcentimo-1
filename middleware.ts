import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabasePublicEnv, requireSupabasePublicEnv } from "@/lib/supabase/config";
import {
  buildCustomerAccountPath,
  buildCustomerRegisterPath,
  getPrimaryCustomerStore,
  parseCustomerAccountPath,
  resolveActiveStoreBySlug,
  resolveActiveStoreByCustomDomain,
  resolveCustomerNextDestination,
  userHasMerchantStore,
  userIsCustomerOfStoreId,
  userIsMerchantOfStoreSlug,
} from "@/lib/customers/middleware-access";
import {
  checkSupportAdminAccess,
  resolveAuthEmail,
} from "@/lib/support/admin-access";
import { isAuthEmailVerified } from "@/lib/auth/email-verified";
import { resolveSupplierAccess, shouldForceSupplierPostAuthRedirect } from "@/lib/supplier/access";
import { lookupSupplierStoreModeByUserId } from "@/lib/supplier/own-storefront-flag";
import {
  canAccessDashboardPath,
  DASHBOARD_INVITATION_PATH,
  getDefaultDashboardPathForRole,
  isDashboardInvitationPath,
  isDashboardPublicAuthPath,
} from "@/lib/team/permissions";
import { getMerchantStoreRole } from "@/lib/team/store-context";
import {
  applySafeInternalNextRedirect,
  pickPostLoginPath,
  SUPPLIER_POST_AUTH_PATH,
} from "@/lib/auth/post-auth-redirect";
import { shouldRedirectGoogleAuthToApex } from "@/lib/auth/google-oauth-origin";
import { getCatalogVisitorCookieName } from "@/lib/analytics/track-catalog-visit";
import { LANDING_VISITOR_COOKIE } from "@/lib/analytics/page-visit-keys";
import { getSiteUrl } from "@/lib/site-url";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import {
  getStoreCatalogPublicUrl,
  isStoreSubdomainCatalogEnabled,
  parsePublicCatalogProductPath,
  parseStoreSlugFromHost,
  shouldRewriteSubdomainCatalogPath,
  toInternalCatalogPath,
} from "@/lib/store-host";
import { normalizeCustomDomain, isPlatformCatalogHost } from "@/lib/domains/custom-domain";
import {
  isMercadoPublicBrowsePath,
  isMercadoPurchaseAuthPath,
} from "@/lib/mercado-oculto/access";

const DASHBOARD_PREFIX = "/dashboard";
const ADMIN_PREFIX = "/admin";
const PROVEEDOR_PREFIX = "/proveedor";
const PROVEEDOR_REGISTRO_PATH = "/proveedor/registro";
const PROVEEDOR_LOGIN_PATH = "/proveedor/login";
const MERCADO_OCULTO_PREFIX = "/mercado-oculto";
const DASHBOARD_LOGIN = "/dashboard/login";
const REGISTER_PATH = "/register";
const RECOVER_PASSWORD_PATH = "/dashboard/recuperar-contrasena";
const RESET_PASSWORD_PATH = "/dashboard/restablecer-contrasena";
const RESET_PASSWORD_SUCCESS_PATH = "/dashboard/restablecer-contrasena/exito";
const VERIFY_ACCOUNT_PATH = "/dashboard/verificar-cuenta";
const ONBOARDING_PATH = "/onboarding";
const ACTIVAR_PATH = "/activar";
const AUTH_CONFIRM_PATH = "/auth/confirm";
const AUTH_CALLBACK_PATH = "/auth/callback";
const CENTRALIZED_GOOGLE_AUTH_PATH = "/auth/google";

function copyResponseOntoRewrite(
  rewriteResponse: NextResponse,
  response: NextResponse,
): NextResponse {
  response.cookies.getAll().forEach((cookie) => {
    rewriteResponse.cookies.set(cookie);
  });

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    rewriteResponse.headers.set(key, value);
  });

  return rewriteResponse;
}

function rewriteCatalogProductDeepLink(
  request: NextRequest,
  storeSlug: string,
  productKey: string,
  response?: NextResponse,
): NextResponse {
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/c/${storeSlug}`;
  rewriteUrl.searchParams.set("product", productKey);
  const rewriteResponse = NextResponse.rewrite(rewriteUrl);
  if (!response) return rewriteResponse;
  return copyResponseOntoRewrite(rewriteResponse, response);
}

function applySubdomainCatalogRewrite(
  request: NextRequest,
  storeSlugFromHost: string | null,
  pathname: string,
  response: NextResponse,
): NextResponse {
  if (!storeSlugFromHost) {
    return response;
  }

  const productPath = parsePublicCatalogProductPath(pathname);
  if (productPath) {
    const pathStore = productPath.storeSlugFromPath;
    if (pathStore && pathStore !== storeSlugFromHost) {
      return response;
    }
    return rewriteCatalogProductDeepLink(
      request,
      storeSlugFromHost,
      productPath.productKey,
      response,
    );
  }

  if (!shouldRewriteSubdomainCatalogPath(pathname)) {
    return response;
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = toInternalCatalogPath(pathname, storeSlugFromHost);
  const rewriteResponse = NextResponse.rewrite(rewriteUrl);

  response.cookies.getAll().forEach((cookie) => {
    rewriteResponse.cookies.set(cookie);
  });

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    rewriteResponse.headers.set(key, value);
  });

  return rewriteResponse;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host")?.split(":")[0]?.trim() ??
    "";
  const storeSlugFromHost = parseStoreSlugFromHost(requestHost);
  let effectiveStoreSlug = storeSlugFromHost;

  if (
    pathname === CENTRALIZED_GOOGLE_AUTH_PATH &&
    shouldRedirectGoogleAuthToApex(requestHost)
  ) {
    const redirectTarget = new URL(`${getSiteUrl()}${CENTRALIZED_GOOGLE_AUTH_PATH}`);
    redirectTarget.search = request.nextUrl.search;
    return NextResponse.redirect(redirectTarget);
  }

  // Rutas huérfanas en apex (sin tienda en el host).
  if (!storeSlugFromHost) {
    if (pathname === "/login") {
      const target = request.nextUrl.clone();
      target.pathname = DASHBOARD_LOGIN;
      return NextResponse.redirect(target);
    }

    if (
      pathname === "/cuenta" ||
      pathname === "/perfil" ||
      pathname === "/compras" ||
      pathname === "/registro"
    ) {
      const target = request.nextUrl.clone();
      target.pathname = "/";
      return NextResponse.redirect(target);
    }

    const legacyTienda = pathname.match(/^\/tienda\/([^/]+)(\/.*)?$/);
    if (legacyTienda?.[1]) {
      const slug = decodeURIComponent(legacyTienda[1]).trim().toLowerCase();
      const rest = legacyTienda[2] ?? "/";
      const mappedRest =
        rest === "/" || rest === ""
          ? "/"
          : rest.startsWith("/armar-pc")
            ? rest
            : "/";
      const target = new URL(getStoreCatalogPublicUrl(slug, mappedRest));
      target.search = request.nextUrl.search;
      return NextResponse.redirect(target, 301);
    }
  }

  if (!storeSlugFromHost && isStoreSubdomainCatalogEnabled()) {
    const legacyCatalog = pathname.match(/^\/c\/([^/]+)(\/.*)?$/);
    if (legacyCatalog?.[1]) {
      const slug = decodeURIComponent(legacyCatalog[1]).trim().toLowerCase();
      const rest = legacyCatalog[2] ?? "/";
      const target = new URL(getStoreCatalogPublicUrl(slug, rest));
      target.search = request.nextUrl.search;
      return NextResponse.redirect(target, 301);
    }
  }

  if (!hasSupabasePublicEnv()) {
    const productPath = parsePublicCatalogProductPath(pathname);
    if (productPath) {
      const slug =
        effectiveStoreSlug ?? productPath.storeSlugFromPath ?? null;
      if (slug) {
        return rewriteCatalogProductDeepLink(
          request,
          slug,
          productPath.productKey,
        );
      }
    }

    if (effectiveStoreSlug && shouldRewriteSubdomainCatalogPath(pathname)) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = toInternalCatalogPath(pathname, effectiveStoreSlug);
      return NextResponse.rewrite(rewriteUrl);
    }

    return NextResponse.next();
  }

  const { url: supabaseUrl, anonKey: supabaseAnonKey } =
    requireSupabasePublicEnv();

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: getSupabaseCookieOptions(request.nextUrl.hostname),
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

  if (!effectiveStoreSlug) {
    const normalizedHost = normalizeCustomDomain(requestHost);
    if (
      normalizedHost &&
      !isPlatformCatalogHost(normalizedHost)
    ) {
      const store = await resolveActiveStoreByCustomDomain(
        supabase,
        normalizedHost,
      );
      if (store) {
        effectiveStoreSlug = store.slug;
      } else {
        // Dominio externo huérfano (tienda eliminada/inactiva): no servir la landing.
        const orphanPassthrough =
          pathname === "/dominio-sin-tienda" ||
          pathname.startsWith("/auth/") ||
          pathname.startsWith("/_next/");

        if (!orphanPassthrough) {
          const rewriteUrl = request.nextUrl.clone();
          rewriteUrl.pathname = "/dominio-sin-tienda";
          rewriteUrl.search = "";
          return NextResponse.rewrite(rewriteUrl, { status: 404 });
        }
      }
    }
  }

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
      authType === "recovery" || pathname === RESET_PASSWORD_PATH;

    if (tokenHash || isRecovery) {
      const confirmUrl = request.nextUrl.clone();
      confirmUrl.pathname = AUTH_CONFIRM_PATH;
      if (!confirmUrl.searchParams.has("next")) {
        confirmUrl.searchParams.set(
          "next",
          isRecovery ? RESET_PASSWORD_PATH : "/dashboard",
        );
      }
      return NextResponse.redirect(confirmUrl);
    }

    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = AUTH_CALLBACK_PATH;
    if (!callbackUrl.searchParams.has("next")) {
      callbackUrl.searchParams.set("next", "/dashboard");
    }
    return NextResponse.redirect(callbackUrl);
  }

  const isDashboard = pathname.startsWith(DASHBOARD_PREFIX);
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
  const isProveedorRoute = pathname.startsWith(PROVEEDOR_PREFIX);
  const isProveedorRegistro =
    pathname === PROVEEDOR_REGISTRO_PATH ||
    pathname.startsWith(`${PROVEEDOR_REGISTRO_PATH}/`);
  const isProveedorLogin =
    pathname === PROVEEDOR_LOGIN_PATH ||
    pathname.startsWith(`${PROVEEDOR_LOGIN_PATH}/`);
  const isProveedorPublicAuth = isProveedorRegistro || isProveedorLogin;
  const isMercadoOcultoRoute = pathname.startsWith(MERCADO_OCULTO_PREFIX);
  const isRegisterRoute = pathname === REGISTER_PATH;
  const customerAccountPath = parseCustomerAccountPath(pathname, effectiveStoreSlug);
  const isCustomerAccountRoute = Boolean(customerAccountPath);
  const isLoginPage = pathname === DASHBOARD_LOGIN;
  const isRecoverPasswordPage = pathname === RECOVER_PASSWORD_PATH;
  const isResetPasswordPage = pathname === RESET_PASSWORD_PATH;
  const isResetPasswordSuccessPage = pathname === RESET_PASSWORD_SUCCESS_PATH;
  const isVerifyAccountPage =
    pathname === VERIFY_ACCOUNT_PATH ||
    pathname.startsWith(`${VERIFY_ACCOUNT_PATH}/`);
  const isResetPasswordFlow =
    isResetPasswordPage || isResetPasswordSuccessPage;
  const isPublicAuthPage =
    isLoginPage ||
    isRecoverPasswordPage ||
    isResetPasswordFlow ||
    isVerifyAccountPage;
  const isOnboarding = pathname === ONBOARDING_PATH;
  const isActivar = pathname === ACTIVAR_PATH;
  const isInvitationPage = isDashboardInvitationPath(pathname);

  const authenticatedUser = user ?? null;

  // Sin correo verificado no hay acceso a paneles (tienda, onboarding, proveedor).
  if (
    authenticatedUser &&
    !isAuthEmailVerified(authenticatedUser) &&
    !isPublicAuthPage &&
    !isProveedorPublicAuth &&
    (isDashboard ||
      isOnboarding ||
      isActivar ||
      (isProveedorRoute && !isProveedorPublicAuth) ||
      isAdminRoute ||
      isMercadoPurchaseAuthPath(pathname))
  ) {
    const verifyUrl = request.nextUrl.clone();
    verifyUrl.pathname = VERIFY_ACCOUNT_PATH;
    verifyUrl.search = "";
    const email = resolveAuthEmail(authenticatedUser);
    if (email) {
      verifyUrl.searchParams.set("email", email);
    }
    const nextTarget = isProveedorRoute
      ? SUPPLIER_POST_AUTH_PATH
      : "/dashboard/catalogo";
    verifyUrl.searchParams.set("next", nextTarget);
    return NextResponse.redirect(verifyUrl);
  }

  // Cookie de sesión para visitas a la landing (alcentimo.com).
  if (pathname === "/" && !request.cookies.get(LANDING_VISITOR_COOKIE)?.value) {
    supabaseResponse.cookies.set(LANDING_VISITOR_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  const catalogPathMatch = pathname.match(/^\/c\/([^/]+)/);
  const catalogSlug = effectiveStoreSlug ?? catalogPathMatch?.[1];

  const catalogProductPath = parsePublicCatalogProductPath(pathname);
  if (catalogProductPath) {
    const slug = (
      effectiveStoreSlug ??
      catalogProductPath.storeSlugFromPath ??
      catalogPathMatch?.[1] ??
      ""
    )
      .trim()
      .toLowerCase();
    if (slug) {
      return rewriteCatalogProductDeepLink(
        request,
        decodeURIComponent(slug),
        catalogProductPath.productKey,
        supabaseResponse,
      );
    }
  }

  const vitrinaMatch = pathname.match(/^\/vitrina\/([^/]+)(\/.*)?$/);
  if (vitrinaMatch) {
    const vitrinaSlug = decodeURIComponent(vitrinaMatch[1] ?? "")
      .trim()
      .toLowerCase();
    if (vitrinaSlug) {
      const ownStore = await resolveActiveStoreBySlug(supabase, vitrinaSlug);
      if (ownStore) {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = `/c/${vitrinaSlug}`;
        const rest = vitrinaMatch[2] ?? "";
        if (rest.startsWith("/producto/")) {
          const productId = rest.slice("/producto/".length).split("/")[0];
          if (productId) {
            rewriteUrl.searchParams.set("product", productId);
          }
        }
        const rewriteResponse = NextResponse.rewrite(rewriteUrl);
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          rewriteResponse.cookies.set(cookie);
        });
        return rewriteResponse;
      }
    }
  }

  if (catalogSlug) {
    const storeSlug = decodeURIComponent(catalogSlug).trim().toLowerCase();
    const visitorCookieName = getCatalogVisitorCookieName(storeSlug);
    const manifestUrl = effectiveStoreSlug
      ? `${request.nextUrl.origin}/manifest.json`
      : `${request.nextUrl.origin}/c/${storeSlug}/manifest.json`;

    supabaseResponse.headers.set("Link", `<${manifestUrl}>; rel="manifest"`);

    if (!request.cookies.get(visitorCookieName)?.value) {
      supabaseResponse.cookies.set(visitorCookieName, crypto.randomUUID(), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
        path: effectiveStoreSlug ? "/" : `/c/${storeSlug}`,
      });
    }
  }

  // ── Área cliente: /c/{slug}/cuenta y /c/{slug}/perfil ───────
  if (isCustomerAccountRoute && customerAccountPath) {
    const { storeSlug } = customerAccountPath;

    if (!authenticatedUser) {
      return NextResponse.redirect(
        new URL(buildCustomerRegisterPath(storeSlug, pathname), request.url),
      );
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
      return NextResponse.redirect(
        new URL(buildCustomerRegisterPath(storeSlug, pathname), request.url),
      );
    }

    return applySubdomainCatalogRewrite(
      request,
      effectiveStoreSlug,
      pathname,
      supabaseResponse,
    );
  }

  // ── Registro cliente: /register ────────────────────────────
  if (isRegisterRoute && authenticatedUser) {
    const storeSlug = request.nextUrl.searchParams.get("store")?.trim().toLowerCase();
    const nextPath = request.nextUrl.searchParams.get("next");
    const completePhone =
      request.nextUrl.searchParams.get("complete") === "phone";

    if (storeSlug && !completePhone) {
      const store = await resolveActiveStoreBySlug(supabase, storeSlug);
      if (
        store &&
        (await userIsCustomerOfStoreId(supabase, authenticatedUser.id, store.id))
      ) {
        return NextResponse.redirect(
          resolveCustomerNextDestination(storeSlug, nextPath),
        );
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

  if (isMercadoOcultoRoute) {
    // Vitrina pública (estilo MercadoLibre): catálogo, ficha y carrito sin sesión.
    if (isMercadoPublicBrowsePath(pathname)) {
      return supabaseResponse;
    }

    // Compra / pedidos / chat: cualquier cuenta autenticada.
    if (!authenticatedUser) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = DASHBOARD_LOGIN;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  }

  if (isProveedorRoute) {
    // Registro / login públicos de mayoristas (no requieren sesión ni allowlist).
    if (isProveedorPublicAuth) {
      if (authenticatedUser) {
        const supplierAccess = await resolveSupplierAccess({
          email: resolveAuthEmail(authenticatedUser),
          userId: authenticatedUser.id,
          user: authenticatedUser,
        });
        if (supplierAccess.ok) {
          const dashboardUrl = request.nextUrl.clone();
          dashboardUrl.pathname = SUPPLIER_POST_AUTH_PATH;
          dashboardUrl.search = "";
          return NextResponse.redirect(dashboardUrl);
        }
      }
      return supabaseResponse;
    }

    if (!authenticatedUser) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = PROVEEDOR_LOGIN_PATH;
      loginUrl.search = "";
      return NextResponse.redirect(loginUrl);
    }

    const supplierEmail = resolveAuthEmail(authenticatedUser);
    const supplierAccess = await resolveSupplierAccess({
      email: supplierEmail,
      userId: authenticatedUser.id,
      user: authenticatedUser,
    });

    if (!supplierAccess.ok) {
      console.warn("[supplier-access-denied]", {
        path: pathname,
        reason: supplierAccess.reason,
        sessionEmail: authenticatedUser.email ?? null,
        resolvedEmail: supplierEmail,
        allowlistCount: supplierAccess.allowlistCount,
        envVarPresent: Boolean(process.env.SUPPLIER_EMAILS?.trim()),
      });

      // No enviar a /dashboard (onboarding o clientes de tienda): registro proveedor.
      const registroUrl = request.nextUrl.clone();
      registroUrl.pathname = "/proveedor/registro";
      registroUrl.search = "";
      registroUrl.searchParams.set(
        "error",
        supplierAccess.reason ?? "denied",
      );
      return NextResponse.redirect(registroUrl);
    }

    return supabaseResponse;
  }

  if (isActivar && authenticatedUser) {
    const role = await getMerchantStoreRole(supabase, authenticatedUser.id);
    if (role && role !== "owner") {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = getDefaultDashboardPathForRole(role);
      dashboardUrl.searchParams.set("access_denied", "1");
      dashboardUrl.search = dashboardUrl.searchParams.toString()
        ? dashboardUrl.search
        : "";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  if (isOnboarding) {
    if (!authenticatedUser) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = DASHBOARD_LOGIN;
      loginUrl.searchParams.set("next", "/dashboard");
      return NextResponse.redirect(loginUrl);
    }

    // Tienda o cliente primero; hub mayorista solo si no hay otro panel.
    const hasMerchantStoreOnboarding = await userHasMerchantStore(
      supabase,
      authenticatedUser.id,
    );
    if (hasMerchantStoreOnboarding) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard/catalogo";
      dashboardUrl.search = "";
      return NextResponse.redirect(dashboardUrl);
    }

    const customerStoreOnboarding = await getPrimaryCustomerStore(
      supabase,
      authenticatedUser.id,
    );
    if (customerStoreOnboarding) {
      const accountUrl = request.nextUrl.clone();
      accountUrl.pathname = buildCustomerAccountPath(
        customerStoreOnboarding.storeSlug,
      );
      accountUrl.search = "";
      return NextResponse.redirect(accountUrl);
    }

    const forceSupplierHub = await shouldForceSupplierPostAuthRedirect({
      email: resolveAuthEmail(authenticatedUser),
      userId: authenticatedUser.id,
    });
    if (forceSupplierHub) {
      const supplierUrl = request.nextUrl.clone();
      supplierUrl.pathname = SUPPLIER_POST_AUTH_PATH;
      supplierUrl.search = "";
      return NextResponse.redirect(supplierUrl);
    }

    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard/catalogo";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  if (isDashboard) {
    if (!authenticatedUser && !isPublicAuthPage) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = DASHBOARD_LOGIN;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (authenticatedUser && !isLoginPage && !isResetPasswordFlow) {
      if (isInvitationPage) {
        return supabaseResponse;
      }

      const hasMerchantStore = await userHasMerchantStore(
        supabase,
        authenticatedUser.id,
      );
      const supplierStoreMode = await lookupSupplierStoreModeByUserId(
        authenticatedUser.id,
      );
      const isSupplierAccount = await shouldForceSupplierPostAuthRedirect({
        email: resolveAuthEmail(authenticatedUser),
        userId: authenticatedUser.id,
      });

      if (!hasMerchantStore && !supplierStoreMode) {
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

        if (isSupplierAccount) {
          const supplierUrl = request.nextUrl.clone();
          supplierUrl.pathname = SUPPLIER_POST_AUTH_PATH;
          supplierUrl.search = "";
          return NextResponse.redirect(supplierUrl);
        }

        // Sin tienda aún: el panel crea una genérica. No enviar a onboarding.
      }

      if (!isDashboardPublicAuthPath(pathname)) {
        const role = await getMerchantStoreRole(supabase, authenticatedUser.id);
        if (role && !canAccessDashboardPath(role, pathname)) {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = getDefaultDashboardPathForRole(role);
          redirectUrl.search = "";
          redirectUrl.searchParams.set("access_denied", "1");
          return NextResponse.redirect(redirectUrl);
        }
      }
    }

    if (authenticatedUser && isLoginPage) {
      // Arranque PWA: dejar pintar el shell de login y resolver sesión en cliente.
      // Evita redirecciones del middleware que rompen la primera carga instalada.
      const fromPwa =
        request.nextUrl.searchParams.get("utm_source") === "pwa";
      if (fromPwa) {
        return applySubdomainCatalogRewrite(
          request,
          effectiveStoreSlug,
          pathname,
          supabaseResponse,
        );
      }

      const next = request.nextUrl.searchParams.get("next");
      const redirectUrl = request.nextUrl.clone();
      const authEmail = resolveAuthEmail(authenticatedUser);
      const wantsSupplierHub = Boolean(next?.startsWith(PROVEEDOR_PREFIX));

      if (
        next?.startsWith(ADMIN_PREFIX) &&
        checkSupportAdminAccess(authEmail).ok
      ) {
        applySafeInternalNextRedirect(redirectUrl, next, "/admin/dashboard");
        return NextResponse.redirect(redirectUrl);
      }

      if (next?.startsWith(MERCADO_OCULTO_PREFIX)) {
        applySafeInternalNextRedirect(redirectUrl, next, "/mercado-oculto");
        return NextResponse.redirect(redirectUrl);
      }

      const hasMerchantStore = await userHasMerchantStore(
        supabase,
        authenticatedUser.id,
      );
      const supplierStoreMode = await lookupSupplierStoreModeByUserId(
        authenticatedUser.id,
      );
      const isSupplierAccount = await shouldForceSupplierPostAuthRedirect({
        email: authEmail,
        userId: authenticatedUser.id,
      });
      const customerStore = hasMerchantStore
        ? null
        : await getPrimaryCustomerStore(supabase, authenticatedUser.id);

      const destination = pickPostLoginPath({
        next,
        intent: wantsSupplierHub ? "supplier" : "merchant",
        isSupplier: isSupplierAccount,
        hasMerchantStore,
        supplierStoreMode,
        customerAccountPath: customerStore
          ? buildCustomerAccountPath(customerStore.storeSlug)
          : null,
      });

      applySafeInternalNextRedirect(redirectUrl, destination, destination);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return applySubdomainCatalogRewrite(
    request,
    effectiveStoreSlug,
    pathname,
    supabaseResponse,
  );
}

export const config = {
  matcher: [
    // Todas las rutas /api/* gestionan su propia auth (Supabase, CRON_SECRET, API keys).
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
