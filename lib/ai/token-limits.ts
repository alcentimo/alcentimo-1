/** Límites estrictos de tokens de salida por tipo de tarea. */
export const AI_MAX_TOKENS = {
  /** WhatsApp: clientes, pedidos, plantillas cortas */
  whatsappMessage: 130,
  /** Párrafo breve de analíticas */
  analyticsInsight: 150,
  /** Reescritura de plantilla con marcadores */
  messageTemplate: 220,
  /** Título + descripción corta + descripción larga */
  productCopy: 450,
  /** Descripción de identidad de marca (cabecera compacta, 1-2 oraciones) */
  storeDescription: 120,
  /** Saludo onboarding (2-3 frases) */
  onboardingWelcome: 100,
  /** JSON con 3 productos de ejemplo */
  onboardingProducts: 480,
  /** JSON tienda instantánea landing */
  instantStore: 520,
  /** Chat landing comercial */
  landingChat: 200,
  /** Chat soporte catálogo público */
  storefrontChat: 250,
  /** Consultor dueño de tienda */
  ownerChat: 450,
  /** Sugerencias de inventario estancado (JSON corto) */
  inventorySuggestions: 350,
} as const;

/** Longitud máxima de texto de entrada enviado al modelo (caracteres). */
export const AI_MAX_INPUT_CHARS = {
  draftTitle: 80,
  draftDescription: 400,
  storeName: 120,
  storeDescriptionDraft: 160,
  userMessage: 500,
  businessHint: 120,
  orderProducts: 5,
} as const;
