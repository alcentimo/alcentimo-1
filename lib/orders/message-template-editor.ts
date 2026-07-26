import {
  MESSAGE_TEMPLATE_PLACEHOLDERS,
  type OrderMessageTemplateKey,
} from "@/lib/orders/message-templates";

/** Etiquetas legibles para ocultar {{variables}} al comerciante. */
export const MESSAGE_TEMPLATE_PLACEHOLDER_LABELS: Record<
  (typeof MESSAGE_TEMPLATE_PLACEHOLDERS)[number],
  string
> = {
  "{{cliente}}": "Nombre del cliente",
  "{{tienda}}": "Nombre de la tienda",
  "{{total}}": "Total del pedido",
  "{{referencia}}": "Referencia del pedido",
  "{{productos}}": "Lista de productos",
};

const FRIENDLY_TO_STORAGE = new Map<string, string>(
  Object.entries(MESSAGE_TEMPLATE_PLACEHOLDER_LABELS).map(([token, label]) => [
    `[${label}]`,
    token,
  ]),
);

const STORAGE_TO_FRIENDLY = new Map<string, string>(
  Object.entries(MESSAGE_TEMPLATE_PLACEHOLDER_LABELS).map(([token, label]) => [
    token,
    `[${label}]`,
  ]),
);

/** Convierte plantilla almacenada a texto amigable para editar. */
export function toFriendlyMessageTemplate(template: string): string {
  let result = template;
  for (const [token, friendly] of STORAGE_TO_FRIENDLY) {
    result = result.replaceAll(token, friendly);
  }
  return result;
}

/** Convierte texto amigable de vuelta al formato con {{variables}}. */
export function toStorageMessageTemplate(friendly: string): string {
  let result = friendly;
  for (const [friendlyToken, storage] of FRIENDLY_TO_STORAGE) {
    result = result.replaceAll(friendlyToken, storage);
  }
  return result;
}

export const MESSAGE_TEMPLATE_REQUIRED_PLACEHOLDERS: Record<
  OrderMessageTemplateKey,
  (typeof MESSAGE_TEMPLATE_PLACEHOLDERS)[number][]
> = {
  nuevo: [
    "{{cliente}}",
    "{{tienda}}",
    "{{productos}}",
    "{{total}}",
    "{{referencia}}",
  ],
  confirmado: ["{{cliente}}", "{{tienda}}", "{{productos}}", "{{total}}"],
  enviado: ["{{cliente}}", "{{tienda}}", "{{productos}}", "{{total}}"],
};

export function validateMessageTemplatePlaceholders(
  template: string,
  templateKey: OrderMessageTemplateKey,
): string | null {
  const required = MESSAGE_TEMPLATE_REQUIRED_PLACEHOLDERS[templateKey];
  const missing = required.filter((token) => !template.includes(token));
  if (missing.length === 0) return null;

  const labels = missing.map(
    (token) => MESSAGE_TEMPLATE_PLACEHOLDER_LABELS[token] ?? token,
  );
  return `Faltan datos automáticos en la plantilla: ${labels.join(", ")}.`;
}

/** Lista corta para mostrar qué incluye el mensaje sin mostrar {{}}. */
export function getMessageTemplateAutoFieldsHint(
  templateKey: OrderMessageTemplateKey,
): string {
  const labels = MESSAGE_TEMPLATE_REQUIRED_PLACEHOLDERS[templateKey].map(
    (token) => MESSAGE_TEMPLATE_PLACEHOLDER_LABELS[token],
  );
  return `Incluye automáticamente: ${labels.join(", ")}.`;
}
