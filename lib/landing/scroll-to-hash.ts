/** Desplaza suavemente a un ancla de la landing (`#precios`, etc.). */
export function scrollToLandingHash(
  href: string,
  options?: { updateHistory?: boolean },
): boolean {
  if (!href.startsWith("#") || href.length < 2) return false;
  if (typeof document === "undefined") return false;

  const el = document.getElementById(href.slice(1));
  if (!el) return false;

  el.scrollIntoView({ behavior: "smooth", block: "start" });

  if (options?.updateHistory !== false) {
    const next = `${window.location.pathname}${window.location.search}${href}`;
    if (window.location.hash !== href) {
      window.history.pushState(null, "", next);
    }
  }

  return true;
}
