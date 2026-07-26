import type { OrderMessageTemplateKey } from "@/lib/store-settings/types";

export type MessageTemplateTone = "amigable" | "profesional" | "cercano";

export interface RewriteMessageTemplateInput {
  template: string;
  templateKey: OrderMessageTemplateKey;
  templateLabel: string;
  tone: MessageTemplateTone;
  storeName?: string | null;
}

export interface RewriteMessageTemplateResult {
  template: string;
}

export const MESSAGE_TEMPLATE_TONE_OPTIONS: {
  value: MessageTemplateTone;
  label: string;
  description: string;
}[] = [
  {
    value: "amigable",
    label: "Amigable",
    description: "Cálido y directo, ideal para WhatsApp.",
  },
  {
    value: "profesional",
    label: "Profesional",
    description: "Formal y claro, transmite confianza.",
  },
  {
    value: "cercano",
    label: "Cercano",
    description: "Como hablar con un cliente frecuente.",
  },
];

export const MESSAGE_TEMPLATE_TONE_LABELS: Record<MessageTemplateTone, string> = {
  amigable: "Amigable",
  profesional: "Profesional",
  cercano: "Cercano",
};
