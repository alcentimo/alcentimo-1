import type {
  DeliveryMeetingPoint,
  DeliveryZone,
} from "@/lib/store-settings/types";

export function createDeliveryZoneId(): string {
  return crypto.randomUUID();
}

export function createMeetingPointId(): string {
  return crypto.randomUUID();
}

export function emptyDeliveryZone(name = ""): DeliveryZone {
  return {
    id: createDeliveryZoneId(),
    name,
    meetingPoints: [],
  };
}

export function emptyMeetingPoint(label = ""): DeliveryMeetingPoint {
  return {
    id: createMeetingPointId(),
    label,
    reference: "",
  };
}

function normalizeMeetingPoint(raw: unknown): DeliveryMeetingPoint | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const label = typeof row.label === "string" ? row.label.trim() : "";
  if (!label) return null;
  return {
    id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : createMeetingPointId(),
    label,
    reference:
      typeof row.reference === "string" ? row.reference.trim() : "",
  };
}

export function normalizeDeliveryZones(raw: unknown): DeliveryZone[] {
  if (!Array.isArray(raw)) return [];

  const zones: DeliveryZone[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;

    const meetingPoints = Array.isArray(row.meetingPoints)
      ? row.meetingPoints
          .map(normalizeMeetingPoint)
          .filter((point): point is DeliveryMeetingPoint => point != null)
      : [];

    zones.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : createDeliveryZoneId(),
      name,
      meetingPoints,
    });
  }

  return zones;
}

export function normalizePickupPoints(raw: unknown): DeliveryMeetingPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeMeetingPoint)
    .filter((point): point is DeliveryMeetingPoint => point != null);
}

export function findDeliveryZone(
  zones: DeliveryZone[],
  zoneId: string | null | undefined,
): DeliveryZone | undefined {
  if (!zoneId) return undefined;
  return zones.find((zone) => zone.id === zoneId);
}

export function findMeetingPointInZone(
  zone: DeliveryZone | undefined,
  pointId: string | null | undefined,
): DeliveryMeetingPoint | undefined {
  if (!zone || !pointId) return undefined;
  return zone.meetingPoints.find((point) => point.id === pointId);
}

export function findPickupPoint(
  points: DeliveryMeetingPoint[],
  pointId: string | null | undefined,
): DeliveryMeetingPoint | undefined {
  if (!pointId) return undefined;
  return points.find((point) => point.id === pointId);
}

export function formatDeliverySelectionSummary(input: {
  zoneName?: string | null;
  meetingPointLabel?: string | null;
  meetingPointReference?: string | null;
  notes?: string | null;
}): string {
  const parts: string[] = [];
  if (input.zoneName?.trim()) parts.push(`Zona: ${input.zoneName.trim()}`);
  if (input.meetingPointLabel?.trim()) {
    parts.push(`Punto: ${input.meetingPointLabel.trim()}`);
  }
  if (input.meetingPointReference?.trim()) {
    parts.push(`Referencia: ${input.meetingPointReference.trim()}`);
  }
  if (input.notes?.trim()) parts.push(`Notas: ${input.notes.trim()}`);
  return parts.join(" · ");
}

export function formatPickupSelectionSummary(input: {
  meetingPointLabel?: string | null;
  meetingPointReference?: string | null;
  notes?: string | null;
}): string {
  const parts: string[] = [];
  if (input.meetingPointLabel?.trim()) {
    parts.push(`Punto de encuentro: ${input.meetingPointLabel.trim()}`);
  }
  if (input.meetingPointReference?.trim()) {
    parts.push(`Referencia: ${input.meetingPointReference.trim()}`);
  }
  if (input.notes?.trim()) parts.push(`Notas: ${input.notes.trim()}`);
  return parts.join(" · ");
}
