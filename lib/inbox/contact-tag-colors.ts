const CONTACT_TAG_TONES = [
  "inbox-contact-tag--blue",
  "inbox-contact-tag--emerald",
  "inbox-contact-tag--amber",
  "inbox-contact-tag--violet",
  "inbox-contact-tag--rose",
  "inbox-contact-tag--teal",
  "inbox-contact-tag--slate",
] as const;

export function getContactTagTone(label: string): string {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return CONTACT_TAG_TONES[0];

  let hash = 0;
  for (const char of normalized) {
    hash = (hash + char.charCodeAt(0)) % CONTACT_TAG_TONES.length;
  }

  return CONTACT_TAG_TONES[hash];
}
