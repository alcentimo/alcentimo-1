import { getApexSiteUrl } from "@/lib/site-url";
import {
  getStoreCatalogOrigin,
  getStoreCatalogPublicUrl,
  isStoreSubdomainCatalogEnabled,
} from "@/lib/store-host";
import { sanitizeAuthReturnUrl } from "@/lib/auth/validate-auth-return-url";

function buildAbsoluteReturnUrl(input: {
  postAuthPath: string;
  storeSlug?: string;
  returnOrigin?: string;
}): string {
  const { postAuthPath, storeSlug, returnOrigin } = input;
  const slug = storeSlug?.trim().toLowerCase();

  if (slug && isStoreSubdomainCatalogEnabled()) {
    if (postAuthPath.startsWith(`/c/${slug}`)) {
      const suffix = postAuthPath.slice(`/c/${slug}`.length) || "/";
      const query = suffix.includes("?") ? suffix.slice(suffix.indexOf("?")) : "";
      const pathOnly = suffix.split("?")[0] || "/";
      return `${getStoreCatalogPublicUrl(slug, pathOnly)}${query}`;
    }

    if (postAuthPath.startsWith("/")) {
      const query = postAuthPath.includes("?")
        ? postAuthPath.slice(postAuthPath.indexOf("?"))
        : "";
      const pathOnly = postAuthPath.split("?")[0] || "/";
      return `${getStoreCatalogPublicUrl(slug, pathOnly)}${query}`;
    }
  }

  if (returnOrigin && postAuthPath.startsWith("/")) {
    return `${returnOrigin.replace(/\/$/, "")}${postAuthPath}`;
  }

  if (slug && returnOrigin) {
    return sanitizeAuthReturnUrl(postAuthPath, slug, "/cuenta");
  }

  return postAuthPath;
}

/** URL en el dominio principal donde se ejecuta Google Identity Services. */
export function buildCentralizedGoogleAuthUrl(input: {
  postAuthPath: string;
  storeSlug?: string;
  orderId?: string;
  returnOrigin?: string;
}): string {
  const apex = getApexSiteUrl();
  const url = new URL(`${apex}/auth/google`);
  const returnNext = buildAbsoluteReturnUrl(input);

  url.searchParams.set("next", sanitizeAuthReturnUrl(returnNext, input.storeSlug));

  const storeSlug = input.storeSlug?.trim().toLowerCase();
  if (storeSlug) {
    url.searchParams.set("store", storeSlug);
  }

  const orderId = input.orderId?.trim();
  if (orderId) {
    url.searchParams.set("orderId", orderId);
  }

  return url.toString();
}
