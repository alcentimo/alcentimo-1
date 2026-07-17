/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    /** URL pública de la app (auth, emails). Configurar en Vercel. */
    NEXT_PUBLIC_SITE_URL?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;

    /** API de importación POS / ventas externas — solo servidor */
    API_SECRET_KEY?: string;

    /** Inyectadas automáticamente por Vercel */
    VERCEL?: "1";
    VERCEL_ENV?: "production" | "preview" | "development";
  }
}

export {};
