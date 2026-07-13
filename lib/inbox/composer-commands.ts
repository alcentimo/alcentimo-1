import type {
  ComposerCatalogProduct,
  ComposerCommand,
  ComposerCommandCategoryId,
  ComposerCommandGroup,
} from "@/lib/inbox/composer-catalog-types";

export type {
  ComposerCatalogProduct,
  ComposerCommand,
  ComposerCommandCategoryId,
  ComposerCommandGroup,
} from "@/lib/inbox/composer-catalog-types";

export const COMMAND_CATEGORY_LABELS: Record<
  ComposerCommandCategoryId,
  string
> = {
  quick_replies: "Respuestas Rápidas",
  catalog_products: "Productos del Catálogo",
  payment_links: "Links de Pago",
};

const QUICK_REPLY_COMMANDS: ComposerCommand[] = [
  {
    id: "quick-greeting",
    category: "quick_replies",
    label: "Saludo de bienvenida",
    description: "Abre la conversación con tono de venta",
    keywords: ["hola", "bienvenida", "saludo"],
    snippet:
      "¡Hola! Gracias por escribirnos. Estoy aquí para ayudarte a encontrar lo que necesitas y cerrar tu pedido hoy mismo.",
  },
  {
    id: "quick-catalog",
    category: "quick_replies",
    label: "Enviar catálogo completo",
    description: "Comparte el catálogo general",
    keywords: ["catalogo", "catálogo", "productos"],
    snippet:
      "¡Hola! Aquí tienes nuestro catálogo actualizado con todos los productos disponibles. ¿Hay algo que te interese?",
  },
  {
    id: "quick-address",
    category: "quick_replies",
    label: "Pedir dirección de envío",
    description: "Solicita datos logísticos",
    keywords: ["direccion", "dirección", "envio", "envío"],
    snippet:
      "Para coordinar el envío, ¿podrías confirmarme tu dirección completa, ciudad y un teléfono de contacto?",
  },
  {
    id: "quick-followup",
    category: "quick_replies",
    label: "Seguimiento de interés",
    description: "Retoma un lead sin respuesta",
    keywords: ["seguimiento", "interes", "interés"],
    snippet:
      "¿Sigues interesado en el producto? Con gusto te ayudo a elegir la mejor opción y cerrar tu pedido.",
  },
];

const PAYMENT_LINK_COMMANDS: ComposerCommand[] = [
  {
    id: "payment-standard",
    category: "payment_links",
    label: "Link de pago",
    description: "Enlace seguro para completar pedido",
    keywords: ["pago", "link", "cobro"],
    snippet:
      "Te comparto el enlace de pago seguro para completar tu pedido. Avísame cuando lo hayas realizado para confirmarte la orden.",
  },
  {
    id: "payment-reminder",
    category: "payment_links",
    label: "Recordatorio de pago",
    description: "Recuerda un link pendiente",
    keywords: ["recordatorio", "pendiente"],
    snippet:
      "Te recuerdo el link de pago pendiente. Si necesitas que te lo reenvíe o tienes alguna duda, escríbeme.",
  },
  {
    id: "payment-confirmed",
    category: "payment_links",
    label: "Confirmación de pago",
    description: "Valida recepción del pago",
    keywords: ["confirmacion", "confirmación", "recibido"],
    snippet:
      "¡Perfecto! Confirmamos la recepción de tu pago. En breve te enviamos los detalles de despacho.",
  },
];

function formatProductPrice(priceUsd: number | null): string {
  if (priceUsd == null) return "Consultar precio";
  return `$${priceUsd.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildCatalogCommands(
  products: ComposerCatalogProduct[],
): ComposerCommand[] {
  return products.map((product) => ({
    id: `catalog-${product.id}`,
    category: "catalog_products" as const,
    label: product.name,
    description: formatProductPrice(product.priceUsd),
    keywords: [product.name.toLowerCase()],
    snippet: `Te comparto *${product.name}* — ${formatProductPrice(product.priceUsd)}. ¿Te lo aparto?`,
  }));
}

export function buildComposerCommandGroups(
  catalogProducts: ComposerCatalogProduct[] = [],
): ComposerCommandGroup[] {
  const catalogCommands = buildCatalogCommands(catalogProducts);

  return [
    {
      id: "quick_replies",
      label: COMMAND_CATEGORY_LABELS.quick_replies,
      items: QUICK_REPLY_COMMANDS,
    },
    {
      id: "catalog_products",
      label: COMMAND_CATEGORY_LABELS.catalog_products,
      items:
        catalogCommands.length > 0
          ? catalogCommands
          : [
              {
                id: "catalog-empty",
                category: "catalog_products",
                label: "Sin productos activos",
                description: "Añade productos en Inventario",
                keywords: [],
                snippet:
                  "Por el momento estamos actualizando el catálogo. ¿Te ayudo con algo específico?",
              },
            ],
    },
    {
      id: "payment_links",
      label: COMMAND_CATEGORY_LABELS.payment_links,
      items: PAYMENT_LINK_COMMANDS,
    },
  ];
}

export function flattenComposerCommands(
  groups: ComposerCommandGroup[],
): ComposerCommand[] {
  return groups.flatMap((group) => group.items);
}

export function filterComposerCommandGroups(
  groups: ComposerCommandGroup[],
  query: string,
): ComposerCommandGroup[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) return groups;

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((command) => {
        const haystack = [
          command.label,
          command.description,
          ...command.keywords,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalized);
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export function isSlashPaletteDraft(value: string): boolean {
  return value.startsWith("/");
}

export function extractSlashQuery(value: string): string {
  if (!value.startsWith("/")) return "";
  return value.slice(1);
}
