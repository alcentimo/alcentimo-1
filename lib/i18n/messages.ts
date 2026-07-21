import type { UiLocale } from "@/lib/ui-preferences/storage";

const MESSAGES = {
  es: {
    "prefs.theme": "Tema",
    "prefs.theme.light": "Claro",
    "prefs.theme.dark": "Oscuro",
    "prefs.theme.system": "Sistema",
    "prefs.theme.toggleToLight": "Cambiar a modo claro",
    "prefs.theme.toggleToDark": "Cambiar a modo oscuro",
    "prefs.language": "Idioma",
    "prefs.sectionTitle": "Idioma y apariencia",
    "prefs.sectionDescription":
      "Define el tema y el idioma del panel. El modo claro/oscuro también está en la barra superior.",
    "prefs.save": "Guardar preferencias",
    "prefs.saved": "Preferencias guardadas.",
    "prefs.saving": "Guardando…",
    "nav.catalog": "Catálogo",
    "nav.orders": "Órdenes",
    "nav.customers": "Mis Clientes",
    "nav.analytics": "Analíticas",
    "nav.settings": "Configuración de Tienda",
    "nav.logout": "Cerrar sesión",
    "nav.support": "Soporte",
    "nav.openMenu": "Abrir menú",
    "nav.closeMenu": "Cerrar menú",
    "settings.tab.general": "General",
    "settings.tab.currency": "Preferencias de Moneda",
    "settings.tab.location": "Ubicación y Horario",
    "settings.tab.shipping": "Envíos y Entregas",
    "settings.tab.payments": "Pagos",
    "settings.tab.design": "Personalizar diseño",
    "settings.tab.promotions": "Promociones",
    "settings.tab.messages": "Plantillas de mensajes",
    "settings.tab.domains": "Dominios",
  },
  en: {
    "prefs.theme": "Theme",
    "prefs.theme.light": "Light",
    "prefs.theme.dark": "Dark",
    "prefs.theme.system": "System",
    "prefs.theme.toggleToLight": "Switch to light mode",
    "prefs.theme.toggleToDark": "Switch to dark mode",
    "prefs.language": "Language",
    "prefs.sectionTitle": "Language & appearance",
    "prefs.sectionDescription":
      "Set the panel theme and language. Light/dark mode is also available in the top bar.",
    "prefs.save": "Save preferences",
    "prefs.saved": "Preferences saved.",
    "prefs.saving": "Saving…",
    "nav.catalog": "Catalog",
    "nav.orders": "Orders",
    "nav.customers": "Customers",
    "nav.analytics": "Analytics",
    "nav.settings": "Store Settings",
    "nav.logout": "Log out",
    "nav.support": "Support",
    "nav.openMenu": "Open menu",
    "nav.closeMenu": "Close menu",
    "settings.tab.general": "General",
    "settings.tab.currency": "Currency preferences",
    "settings.tab.location": "Location & hours",
    "settings.tab.shipping": "Shipping & delivery",
    "settings.tab.payments": "Payments",
    "settings.tab.design": "Catalog design",
    "settings.tab.promotions": "Promotions",
    "settings.tab.messages": "Message templates",
    "settings.tab.domains": "Domains",
  },
} as const;

export type MessageKey = keyof (typeof MESSAGES)["es"];

export function translate(locale: UiLocale, key: MessageKey): string {
  return MESSAGES[locale][key] ?? MESSAGES.es[key] ?? key;
}

export const NAV_LABEL_KEYS: Record<string, MessageKey> = {
  "/dashboard/catalogo": "nav.catalog",
  "/dashboard/pedidos": "nav.orders",
  "/dashboard/clientes": "nav.customers",
  "/dashboard/analiticas": "nav.analytics",
  "/dashboard/ajustes": "nav.settings",
};
