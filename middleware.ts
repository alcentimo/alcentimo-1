import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DASHBOARD_PREFIX = "/dashboard";
const DASHBOARD_LOGIN = "/dashboard/login";

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

  // Sin sesión: getUser puede devolver error "Auth session missing!" — es esperable.
  const authenticatedUser = user ?? null;

  if (isDashboard) {
    if (!authenticatedUser && !isLoginPage) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = DASHBOARD_LOGIN;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (authenticatedUser && isLoginPage) {
      const next = request.nextUrl.searchParams.get("next");
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname =
        next && next.startsWith(DASHBOARD_PREFIX) ? next : "/dashboard";
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
