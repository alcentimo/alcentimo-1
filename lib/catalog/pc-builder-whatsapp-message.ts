import { formatUsd } from "@/lib/format";
import {
  PC_BUILDER_SLOT_ORDER,
  calculatePCBuilderTotalUsd,
  getPCBuilderSlotDefinition,
  isPCBuilderComplete,
  resolvePCBuilderProductPriceUsd,
  type PCBuilderSelection,
} from "@/lib/rubros/modules/tecnologia/pc-builder";

export interface BuildPCBuilderWhatsAppMessageInput {
  storeName: string;
  selection: PCBuilderSelection;
  customerName?: string;
}

/** Cotización de PC personalizada para WhatsApp. */
export function buildPCBuilderWhatsAppMessage(
  input: BuildPCBuilderWhatsAppMessageInput,
): string {
  const totalUsd = calculatePCBuilderTotalUsd(input.selection);
  const complete = isPCBuilderComplete(input.selection);

  const componentLines = PC_BUILDER_SLOT_ORDER.map((slotId) => {
    const slot = getPCBuilderSlotDefinition(slotId);
    const product = input.selection[slotId];
    if (!product) {
      return `• ${slot.label}: — Sin seleccionar —`;
    }
    const price = resolvePCBuilderProductPriceUsd(product);
    return `• ${slot.label}: ${product.product_name} — ${formatUsd(price)}`;
  });

  const lines = [
    `Hola, quiero cotizar una PC personalizada en ${input.storeName}:`,
    "",
  ];

  if (input.customerName?.trim()) {
    lines.push(`👤 ${input.customerName.trim()}`, "");
  }

  lines.push(
    "🖥️ Configuración solicitada:",
    ...componentLines,
    "",
    `💰 Total estimado: ${formatUsd(totalUsd)}`,
    "",
  );

  if (complete) {
    lines.push(
      "✅ Configuración completa (7/7 componentes).",
      "¿Me confirmas disponibilidad, tiempo de ensamblaje y datos de pago?",
    );
  } else {
    lines.push(
      "⚠️ Configuración parcial — faltan componentes por definir.",
      "¿Me ayudas a completar la cotización y confirmar disponibilidad?",
    );
  }

  return lines.join("\n");
}
