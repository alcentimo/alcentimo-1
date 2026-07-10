import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DASHBOARD_PREFIX = "/dashboard";
const DASHBOARD_LOGIN = "/dashboard/login";
const ONBOARDING_PATH = "/onboarding";

async function userHasStoreInMiddleware(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<boolean> {
  const { data: owned } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();

  if (owned) return true;

  const { data: membership } = await supabase
    .from("store_members")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return Boolean(membership);
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isDashboard = pathname.startsWith(DASHBOARD_PREFIX);
  const isLoginPage = pathname === DASHBOARD_LOGIN;
  const isOnboarding = pathname === ONBOARDING_PATH;

  // Sin sesión: getUser puede devolver error "Auth session missing!" — es esperable.
  const authenticatedUser = user ?? null;

  if (isOnboarding) {
    if (!authenticatedUser) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = DASHBOARD_LOGIN;
      loginUrl.searchParams.set("next", ONBOARDING_PATH);
      return NextResponse.redirect(loginUrl);
    }

    if (await userHasStoreInMiddleware(supabase, authenticatedUser.id)) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      dashboardUrl.search = "";
      return NextResponse.redirect(dashboardUrl);
    }

    return supabaseResponse;
  }

  if (isDashboard) {
    if (!authenticatedUser && !isLoginPage) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = DASHBOARD_LOGIN;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (authenticatedUser && !isLoginPage) {
      const hasStore = await userHasStoreInMiddleware(
        supabase,
        authenticatedUser.id,
      );

      if (!hasStore) {
        const onboardingUrl = request.nextUrl.clone();
        onboardingUrl.pathname = ONBOARDING_PATH;
        onboardingUrl.search = "";
        return NextResponse.redirect(onboardingUrl);
      }
    }

    if (authenticatedUser && isLoginPage) {
      const hasStore = await userHasStoreInMiddleware(
        supabase,
        authenticatedUser.id,
      );
      const next = request.nextUrl.searchParams.get("next");
      const redirectUrl = request.nextUrl.clone();

      if (hasStore) {
        redirectUrl.pathname =
          next && next.startsWith(DASHBOARD_PREFIX) ? next : "/dashboard";
      } else {
        redirectUrl.pathname = ONBOARDING_PATH;
      }

      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
