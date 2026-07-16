/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    /** URL pública de la app (OAuth, emails). Configurar en Vercel. */
    NEXT_PUBLIC_SITE_URL?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;

    /** Meta / WhatsApp Business — solo servidor */
    META_APP_ID?: string;
    /** App Secret de Meta para firmar/validar webhooks (preferido). */
    APP_SECRET?: string;
    /** Alias legacy del App Secret de Meta. */
    META_APP_SECRET?: string;
    /** Token de verificación del webhook Meta (preferido). */
    VERIFY_TOKEN?: string;
    /** Alias legacy del verify token del webhook Meta. */
    META_WEBHOOK_VERIFY_TOKEN?: string;

    /** API de importación POS / ventas externas — solo servidor */
    API_SECRET_KEY?: string;

    /** Inyectadas automáticamente por Vercel */
    VERCEL?: "1";
    VERCEL_ENV?: "production" | "preview" | "development";
  }
}

export {};
