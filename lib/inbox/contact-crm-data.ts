import type { SupabaseClient } from "@supabase/supabase-js";

export interface ContactCrmSnapshot {
  privateNotes: string;
  tags: string[];
}

export async function fetchContactCrmByContactIds(
  supabase: SupabaseClient,
  storeId: string,
  contactIds: string[],
): Promise<Map<string, ContactCrmSnapshot>> {
  const uniqueContactIds = [...new Set(contactIds.filter(Boolean))];
  const snapshot = new Map<string, ContactCrmSnapshot>();

  if (uniqueContactIds.length === 0) {
    return snapshot;
  }

  const [notesResult, tagsResult] = await Promise.all([
    supabase
      .from("contact_notes")
      .select("contact_id, body")
      .eq("store_id", storeId)
      .in("contact_id", uniqueContactIds),
    supabase
      .from("contact_tags")
      .select("contact_id, label")
      .eq("store_id", storeId)
      .in("contact_id", uniqueContactIds)
      .order("label", { ascending: true }),
  ]);

  if (notesResult.error) throw notesResult.error;
  if (tagsResult.error) throw tagsResult.error;

  for (const contactId of uniqueContactIds) {
    snapshot.set(contactId, { privateNotes: "", tags: [] });
  }

  for (const row of notesResult.data ?? []) {
    const current = snapshot.get(row.contact_id);
    if (!current) continue;
    current.privateNotes =
      typeof row.body === "string" ? row.body : current.privateNotes;
  }

  for (const row of tagsResult.data ?? []) {
    const current = snapshot.get(row.contact_id);
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!current || !label || current.tags.includes(label)) continue;
    current.tags.push(label);
  }

  return snapshot;
}

export function resolveContactCrmSnapshot(
  contactId: string | null | undefined,
  contactMetadata: Record<string, unknown> | null,
  conversationMetadata: Record<string, unknown> | null,
  crmByContactId?: Map<string, ContactCrmSnapshot>,
): ContactCrmSnapshot {
  if (contactId && crmByContactId?.has(contactId)) {
    return crmByContactId.get(contactId)!;
  }

  const metadataTags = [
    ...readStringArray(contactMetadata?.tags),
    ...readStringArray(conversationMetadata?.tags),
  ];

  return {
    privateNotes:
      typeof contactMetadata?.private_notes === "string"
        ? contactMetadata.private_notes
        : "",
    tags: [...new Set(metadataTags)],
  };
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
