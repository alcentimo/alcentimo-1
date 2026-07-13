import type { LucideIcon } from "lucide-react";
import { BookOpen, Link2, MapPin } from "lucide-react";

export interface ComposerCommand {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon: LucideIcon;
  snippet: string;
}

export const COMPOSER_COMMANDS: ComposerCommand[] = [
  {
    id: "catalog",
    label: "Enviar catálogo",
    description: "Comparte el catálogo de productos",
    keywords: ["catalogo", "catálogo", "productos"],
    icon: BookOpen,
    snippet:
      "¡Hola! Aquí tienes nuestro catálogo actualizado con todos los productos disponibles. ¿Hay algo que te interese?",
  },
  {
    id: "payment",
    label: "Link de pago",
    description: "Genera mensaje con enlace de pago",
    keywords: ["pago", "link", "cobro"],
    icon: Link2,
    snippet:
      "Te comparto el enlace de pago seguro para completar tu pedido. Avísame cuando lo hayas realizado para confirmarte la orden.",
  },
  {
    id: "address",
    label: "Pedir dirección",
    description: "Solicita datos de envío al cliente",
    keywords: ["direccion", "dirección", "envio", "envío"],
    icon: MapPin,
    snippet:
      "Para coordinar el envío, ¿podrías confirmarme tu dirección completa, ciudad y un teléfono de contacto?",
  },
];

export function filterComposerCommands(query: string): ComposerCommand[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return COMPOSER_COMMANDS;

  return COMPOSER_COMMANDS.filter((command) => {
    const haystack = [
      command.label,
      command.description,
      ...command.keywords,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export function isSlashPaletteDraft(value: string): boolean {
  return value.startsWith("/");
}

export function extractSlashQuery(value: string): string {
  if (!value.startsWith("/")) return "";
  return value.slice(1);
}
