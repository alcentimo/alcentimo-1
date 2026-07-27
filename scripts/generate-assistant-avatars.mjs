import fs from "node:fs";
import path from "node:path";

const dir = path.join("public", "assistant-avatars");
fs.mkdirSync(dir, { recursive: true });

const avatars = [
  { id: "general-orbit", bg: ["#6366f1", "#8b5cf6"], accent: "#c4b5fd", type: "orbit" },
  { id: "general-spark", bg: ["#0d9488", "#14b8a6"], accent: "#99f6e4", type: "spark" },
  { id: "general-wave", bg: ["#64748b", "#475569"], accent: "#cbd5e1", type: "wave" },
  { id: "tech-bot", bg: ["#2563eb", "#1d4ed8"], accent: "#93c5fd", type: "bot" },
  { id: "tech-chip", bg: ["#0891b2", "#0e7490"], accent: "#67e8f9", type: "chip" },
  { id: "anime-neo", bg: ["#ec4899", "#db2777"], accent: "#fbcfe8", type: "anime" },
  { id: "anime-sakura", bg: ["#f472b6", "#e879f9"], accent: "#fce7f3", type: "sakura" },
  { id: "fashion-chic", bg: ["#171717", "#404040"], accent: "#fbbf24", type: "fashion" },
  { id: "fashion-glam", bg: ["#be185d", "#9d174d"], accent: "#fcd34d", type: "glam" },
  { id: "food-chef", bg: ["#ea580c", "#c2410c"], accent: "#fed7aa", type: "chef" },
  { id: "food-fresh", bg: ["#16a34a", "#15803d"], accent: "#bbf7d0", type: "fresh" },
  { id: "wellness-leaf", bg: ["#059669", "#047857"], accent: "#a7f3d0", type: "leaf" },
  { id: "wellness-glow", bg: ["#7c3aed", "#6d28d9"], accent: "#ddd6fe", type: "glow" },
  { id: "office-pen", bg: ["#1e40af", "#1e3a8a"], accent: "#bfdbfe", type: "pen" },
  { id: "office-note", bg: ["#ca8a04", "#a16207"], accent: "#fef08a", type: "note" },
  { id: "collectibles-star", bg: ["#dc2626", "#b91c1c"], accent: "#fde047", type: "star" },
  { id: "collectibles-mask", bg: ["#4338ca", "#3730a3"], accent: "#a5b4fc", type: "mask" },
];

function shapes(type, accent) {
  switch (type) {
    case "orbit":
      return `<circle cx="64" cy="64" r="42" fill="none" stroke="${accent}" stroke-width="4" opacity="0.55"/><circle cx="64" cy="64" r="28" fill="${accent}" opacity="0.25"/><circle cx="64" cy="38" r="6" fill="${accent}"/><ellipse cx="64" cy="72" rx="18" ry="14" fill="${accent}" opacity="0.35"/>`;
    case "spark":
      return `<path d="M64 24 L70 54 L98 54 L74 72 L82 102 L64 84 L46 102 L54 72 L30 54 L58 54 Z" fill="${accent}" opacity="0.9"/><circle cx="64" cy="64" r="14" fill="white" opacity="0.25"/>`;
    case "wave":
      return `<path d="M32 78 Q48 58 64 78 T96 78" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/><circle cx="48" cy="52" r="7" fill="${accent}"/><circle cx="80" cy="52" r="7" fill="${accent}"/><path d="M52 88 Q64 96 76 88" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/>`;
    case "bot":
      return `<rect x="38" y="42" width="52" height="44" rx="12" fill="${accent}" opacity="0.35"/><rect x="44" y="48" width="14" height="14" rx="4" fill="white"/><rect x="70" y="48" width="14" height="14" rx="4" fill="white"/><rect x="52" y="72" width="24" height="6" rx="3" fill="white"/><rect x="58" y="30" width="12" height="14" rx="4" fill="${accent}"/>`;
    case "chip":
      return `<rect x="40" y="40" width="48" height="48" rx="8" fill="${accent}" opacity="0.35"/><rect x="52" y="52" width="24" height="24" rx="4" fill="white" opacity="0.9"/><path d="M64 40 V32 M64 96 V88 M40 64 H32 M96 64 H88 M48 48 L42 42 M86 86 L80 80 M86 48 L80 54 M48 86 L42 80" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>`;
    case "anime":
      return `<path d="M64 34 C44 34 36 52 36 68 C36 88 48 98 64 98 C80 98 92 88 92 68 C92 52 84 34 64 34Z" fill="${accent}" opacity="0.35"/><ellipse cx="52" cy="62" rx="8" ry="10" fill="white"/><ellipse cx="76" cy="62" rx="8" ry="10" fill="white"/><circle cx="52" cy="64" r="4" fill="#1e293b"/><circle cx="76" cy="64" r="4" fill="#1e293b"/><path d="M58 82 Q64 88 70 82" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/>`;
    case "sakura":
      return `<circle cx="64" cy="64" r="22" fill="${accent}" opacity="0.45"/><circle cx="64" cy="36" r="10" fill="${accent}"/><circle cx="84" cy="52" r="10" fill="${accent}"/><circle cx="78" cy="78" r="10" fill="${accent}"/><circle cx="50" cy="78" r="10" fill="${accent}"/><circle cx="44" cy="52" r="10" fill="${accent}"/><circle cx="64" cy="64" r="8" fill="white"/>`;
    case "fashion":
      return `<path d="M64 30 L82 48 L74 98 H54 L46 48 Z" fill="${accent}" opacity="0.85"/><circle cx="64" cy="42" r="10" fill="white" opacity="0.9"/><path d="M58 58 H70" stroke="white" stroke-width="3" stroke-linecap="round"/>`;
    case "glam":
      return `<ellipse cx="64" cy="58" rx="24" ry="28" fill="${accent}" opacity="0.55"/><path d="M40 44 Q64 20 88 44" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/><circle cx="54" cy="56" r="4" fill="white"/><circle cx="74" cy="56" r="4" fill="white"/><path d="M58 72 Q64 78 70 72" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/>`;
    case "chef":
      return `<ellipse cx="64" cy="88" rx="28" ry="10" fill="${accent}" opacity="0.35"/><path d="M44 70 Q64 40 84 70 L84 88 H44 Z" fill="white" opacity="0.9"/><ellipse cx="64" cy="48" rx="22" ry="16" fill="${accent}"/><rect x="52" y="82" width="24" height="8" rx="2" fill="${accent}"/>`;
    case "fresh":
      return `<circle cx="64" cy="64" r="26" fill="${accent}" opacity="0.35"/><path d="M64 38 C72 48 78 58 64 90 C50 58 56 48 64 38Z" fill="${accent}"/><path d="M64 38 Q58 28 48 30" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>`;
    case "leaf":
      return `<path d="M64 92 C40 72 40 48 64 36 C88 48 88 72 64 92Z" fill="${accent}"/><path d="M64 92 V48" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.8"/><path d="M64 58 Q72 54 78 48 M64 68 Q56 64 50 58" stroke="white" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>`;
    case "glow":
      return `<circle cx="64" cy="64" r="30" fill="${accent}" opacity="0.25"/><circle cx="64" cy="64" r="20" fill="${accent}" opacity="0.45"/><circle cx="64" cy="64" r="10" fill="white" opacity="0.95"/><path d="M64 20 V30 M64 98 V88 M20 64 H30 M98 64 H88" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>`;
    case "pen":
      return `<rect x="48" y="34" width="28" height="58" rx="6" fill="white" opacity="0.92" transform="rotate(18 64 64)"/><path d="M58 88 L70 34" stroke="${accent}" stroke-width="4" stroke-linecap="round" transform="rotate(18 64 64)"/><circle cx="78" cy="78" r="8" fill="${accent}"/>`;
    case "note":
      return `<rect x="38" y="34" width="52" height="60" rx="6" fill="white" opacity="0.92"/><path d="M48 52 H80 M48 64 H76 M48 76 H68" stroke="${accent}" stroke-width="4" stroke-linecap="round"/><circle cx="72" cy="44" r="6" fill="${accent}"/>`;
    case "star":
      return `<path d="M64 28 L72 52 L98 54 L78 70 L84 96 L64 82 L44 96 L50 70 L30 54 L56 52 Z" fill="${accent}"/><circle cx="64" cy="64" r="10" fill="white" opacity="0.35"/>`;
    case "mask":
      return `<path d="M36 58 C36 42 48 34 64 34 C80 34 92 42 92 58 C92 74 80 92 64 92 C48 92 36 74 36 58Z" fill="${accent}" opacity="0.4"/><ellipse cx="52" cy="58" rx="8" ry="10" fill="white"/><ellipse cx="76" cy="58" rx="8" ry="10" fill="white"/><path d="M52 78 Q64 86 76 78" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/>`;
    default:
      return "";
  }
}

for (const avatar of avatars) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-hidden="true">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${avatar.bg[0]}"/><stop offset="100%" stop-color="${avatar.bg[1]}"/></linearGradient></defs>` +
    `<rect width="128" height="128" rx="64" fill="url(#g)"/>` +
    shapes(avatar.type, avatar.accent) +
    `</svg>`;
  fs.writeFileSync(path.join(dir, `${avatar.id}.svg`), svg);
}

console.log(`Created ${avatars.length} assistant avatars`);
