import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join("public", "assistant-avatars");
const MANIFEST_PATH = path.join(
  "lib",
  "store-settings",
  "assistant-avatar-manifest.ts",
);

/** @typedef {'float' | 'wave' | 'glow' | 'pulse' | 'bob'} AnimationKind */

const ANIMATIONS = /** @type {const} */ ([
  "float",
  "wave",
  "glow",
  "pulse",
  "bob",
]);

const RUBRO_LABELS = {
  general: "General / neutro",
  tecnologia: "Tecnología y Electrónica",
  coleccionables: "Coleccionables y Cómics",
  "ropa-moda": "Ropa, Calzado y Moda",
  alimentos: "Alimentos y Bebidas",
  "salud-belleza": "Salud, Belleza y Cuidado",
  "papeleria-libreria-oficina": "Papelería, Librería y Oficina",
};

/** @type {Record<string, Array<{ slug: string; label: string; animation: AnimationKind; bg: [string, string]; accent: string; light: string; motif: string }>>} */
const CATALOG = {
  general: [
    { slug: "orbit", label: "Orbita amigable", animation: "float", bg: ["#6366f1", "#4338ca"], accent: "#c7d2fe", light: "#eef2ff", motif: "orbit" },
    { slug: "spark", label: "Chispa inteligente", animation: "glow", bg: ["#0d9488", "#0f766e"], accent: "#99f6e4", light: "#ecfdf5", motif: "spark" },
    { slug: "wave", label: "Asistente clásico", animation: "wave", bg: ["#64748b", "#334155"], accent: "#e2e8f0", light: "#f8fafc", motif: "wave" },
    { slug: "beacon", label: "Farol guía", animation: "pulse", bg: ["#f59e0b", "#d97706"], accent: "#fde68a", light: "#fffbeb", motif: "beacon" },
    { slug: "compass", label: "Brújula experta", animation: "bob", bg: ["#0284c7", "#0369a1"], accent: "#bae6fd", light: "#f0f9ff", motif: "compass" },
    { slug: "halo", label: "Aura confiable", animation: "glow", bg: ["#7c3aed", "#6d28d9"], accent: "#ddd6fe", light: "#f5f3ff", motif: "halo" },
    { slug: "prism", label: "Prisma creativo", animation: "float", bg: ["#db2777", "#be185d"], accent: "#fbcfe8", light: "#fdf2f8", motif: "prism" },
    { slug: "echo", label: "Eco amable", animation: "pulse", bg: ["#059669", "#047857"], accent: "#a7f3d0", light: "#ecfdf5", motif: "echo" },
    { slug: "guide", label: "Guía experta", animation: "wave", bg: ["#4f46e5", "#3730a3"], accent: "#c7d2fe", light: "#eef2ff", motif: "guide" },
    { slug: "pulse", label: "Pulso activo", animation: "bob", bg: ["#0891b2", "#0e7490"], accent: "#a5f3fc", light: "#ecfeff", motif: "pulse" },
  ],
  tecnologia: [
    { slug: "bot", label: "Bot Nova", animation: "float", bg: ["#2563eb", "#1e3a8a"], accent: "#93c5fd", light: "#eff6ff", motif: "bot" },
    { slug: "chip", label: "Chip Cuántico", animation: "glow", bg: ["#0891b2", "#155e75"], accent: "#67e8f9", light: "#ecfeff", motif: "chip" },
    { slug: "drone", label: "Drone Scout", animation: "bob", bg: ["#475569", "#1e293b"], accent: "#cbd5e1", light: "#f8fafc", motif: "drone" },
    { slug: "headset", label: "Headset Pro", animation: "wave", bg: ["#7c3aed", "#5b21b6"], accent: "#c4b5fd", light: "#f5f3ff", motif: "headset" },
    { slug: "rocket", label: "Rocket Launch", animation: "pulse", bg: ["#dc2626", "#991b1b"], accent: "#fca5a5", light: "#fef2f2", motif: "rocket" },
    { slug: "circuit", label: "Circuit Mind", animation: "glow", bg: ["#059669", "#065f46"], accent: "#6ee7b7", light: "#ecfdf5", motif: "circuit" },
    { slug: "pixel", label: "Pixel Buddy", animation: "float", bg: ["#db2777", "#9d174d"], accent: "#f9a8d4", light: "#fdf2f8", motif: "pixel" },
    { slug: "server", label: "Server Core", animation: "pulse", bg: ["#334155", "#0f172a"], accent: "#94a3b8", light: "#f1f5f9", motif: "server" },
    { slug: "hologram", label: "Holo Guide", animation: "glow", bg: ["#06b6d4", "#0e7490"], accent: "#a5f3fc", light: "#ecfeff", motif: "hologram" },
    { slug: "android", label: "Android Ace", animation: "wave", bg: ["#16a34a", "#166534"], accent: "#86efac", light: "#f0fdf4", motif: "android" },
  ],
  coleccionables: [
    { slug: "neo", label: "Neo Anime", animation: "float", bg: ["#ec4899", "#be185d"], accent: "#fbcfe8", light: "#fdf2f8", motif: "anime" },
    { slug: "sakura", label: "Sakura Kawaii", animation: "glow", bg: ["#f472b6", "#db2777"], accent: "#fce7f3", light: "#fdf2f8", motif: "sakura" },
    { slug: "hero", label: "Héroe Manga", animation: "wave", bg: ["#ef4444", "#b91c1c"], accent: "#fecaca", light: "#fef2f2", motif: "hero" },
    { slug: "ninja", label: "Ninja Shadow", animation: "bob", bg: ["#1e293b", "#020617"], accent: "#64748b", light: "#e2e8f0", motif: "ninja" },
    { slug: "wizard", label: "Mago Arcano", animation: "glow", bg: ["#7c3aed", "#4c1d95"], accent: "#ddd6fe", light: "#f5f3ff", motif: "wizard" },
    { slug: "mecha", label: "Mecha Pilot", animation: "pulse", bg: ["#2563eb", "#1d4ed8"], accent: "#93c5fd", light: "#eff6ff", motif: "mecha" },
    { slug: "chibi", label: "Chibi Star", animation: "float", bg: ["#f59e0b", "#d97706"], accent: "#fde68a", light: "#fffbeb", motif: "chibi" },
    { slug: "dragon", label: "Dragon Keeper", animation: "bob", bg: ["#059669", "#047857"], accent: "#6ee7b7", light: "#ecfdf5", motif: "dragon" },
    { slug: "comic", label: "Comic Boom", animation: "wave", bg: ["#eab308", "#ca8a04"], accent: "#fef08a", light: "#fefce8", motif: "comic" },
    { slug: "mask", label: "Máscara Heroica", animation: "pulse", bg: ["#4338ca", "#312e81"], accent: "#a5b4fc", light: "#eef2ff", motif: "mask" },
  ],
  "ropa-moda": [
    { slug: "chic", label: "Estilista Chic", animation: "float", bg: ["#171717", "#404040"], accent: "#fbbf24", light: "#fef3c7", motif: "fashion" },
    { slug: "glam", label: "Glam Boutique", animation: "glow", bg: ["#be185d", "#831843"], accent: "#fbcfe8", light: "#fdf2f8", motif: "glam" },
    { slug: "runway", label: "Runway Star", animation: "wave", bg: ["#111827", "#030712"], accent: "#f472b6", light: "#fdf2f8", motif: "runway" },
    { slug: "vintage", label: "Vintage Soul", animation: "bob", bg: ["#92400e", "#78350f"], accent: "#fcd34d", light: "#fffbeb", motif: "vintage" },
    { slug: "street", label: "Street Trend", animation: "pulse", bg: ["#0891b2", "#0e7490"], accent: "#67e8f9", light: "#ecfeff", motif: "street" },
    { slug: "minimal", label: "Minimal Lux", animation: "float", bg: ["#64748b", "#475569"], accent: "#f8fafc", light: "#ffffff", motif: "minimal" },
    { slug: "luxe", label: "Luxe Maison", animation: "glow", bg: ["#7c2d12", "#431407"], accent: "#fdba74", light: "#fff7ed", motif: "luxe" },
    { slug: "boutique", label: "Boutique Pro", animation: "wave", bg: ["#9333ea", "#6b21a8"], accent: "#e9d5ff", light: "#faf5ff", motif: "boutique" },
    { slug: "stylist", label: "Stylist Pro", animation: "bob", bg: ["#db2777", "#9d174d"], accent: "#f9a8d4", light: "#fdf2f8", motif: "stylist" },
    { slug: "trend", label: "Trend Setter", animation: "pulse", bg: ["#0ea5e9", "#0369a1"], accent: "#bae6fd", light: "#f0f9ff", motif: "trend" },
  ],
  alimentos: [
    { slug: "chef", label: "Chef Maestro", animation: "wave", bg: ["#ea580c", "#9a3412"], accent: "#fed7aa", light: "#fff7ed", motif: "chef" },
    { slug: "fresh", label: "Frescura Natural", animation: "float", bg: ["#16a34a", "#166534"], accent: "#bbf7d0", light: "#f0fdf4", motif: "fresh" },
    { slug: "baker", label: "Panadero Artesanal", animation: "bob", bg: ["#d97706", "#92400e"], accent: "#fde68a", light: "#fffbeb", motif: "baker" },
    { slug: "barista", label: "Barista Pro", animation: "glow", bg: ["#78350f", "#451a03"], accent: "#fdba74", light: "#fff7ed", motif: "barista" },
    { slug: "farm", label: "Granja Viva", animation: "pulse", bg: ["#65a30d", "#3f6212"], accent: "#d9f99d", light: "#f7fee7", motif: "farm" },
    { slug: "spice", label: "Especias del Chef", animation: "float", bg: ["#dc2626", "#991b1b"], accent: "#fca5a5", light: "#fef2f2", motif: "spice" },
    { slug: "sushi", label: "Sushi Master", animation: "wave", bg: ["#0f766e", "#134e4a"], accent: "#99f6e4", light: "#ecfdf5", motif: "sushi" },
    { slug: "sweet", label: "Dulce Tentación", animation: "glow", bg: ["#ec4899", "#be185d"], accent: "#fbcfe8", light: "#fdf2f8", motif: "sweet" },
    { slug: "grill", label: "Grill Expert", animation: "bob", bg: ["#b45309", "#78350f"], accent: "#fcd34d", light: "#fffbeb", motif: "grill" },
    { slug: "harvest", label: "Cosecha Dorada", animation: "pulse", bg: ["#ca8a04", "#854d0e"], accent: "#fef08a", light: "#fefce8", motif: "harvest" },
  ],
  "salud-belleza": [
    { slug: "leaf", label: "Bienestar Natural", animation: "float", bg: ["#059669", "#047857"], accent: "#a7f3d0", light: "#ecfdf5", motif: "leaf" },
    { slug: "glow", label: "Glow Beauty", animation: "glow", bg: ["#7c3aed", "#6d28d9"], accent: "#ddd6fe", light: "#f5f3ff", motif: "glowFace" },
    { slug: "spa", label: "Spa Serenity", animation: "bob", bg: ["#14b8a6", "#0f766e"], accent: "#99f6e4", light: "#ecfdf5", motif: "spa" },
    { slug: "serum", label: "Serum Lab", animation: "pulse", bg: ["#2563eb", "#1d4ed8"], accent: "#93c5fd", light: "#eff6ff", motif: "serum" },
    { slug: "zen", label: "Zen Balance", animation: "float", bg: ["#64748b", "#334155"], accent: "#e2e8f0", light: "#f8fafc", motif: "zen" },
    { slug: "bloom", label: "Bloom Care", animation: "wave", bg: ["#ec4899", "#be185d"], accent: "#fbcfe8", light: "#fdf2f8", motif: "bloom" },
    { slug: "radiance", label: "Radiance Pro", animation: "glow", bg: ["#f59e0b", "#d97706"], accent: "#fde68a", light: "#fffbeb", motif: "radiance" },
    { slug: "care", label: "Care Expert", animation: "bob", bg: ["#0891b2", "#155e75"], accent: "#a5f3fc", light: "#ecfeff", motif: "care" },
    { slug: "mint", label: "Mint Fresh", animation: "pulse", bg: ["#10b981", "#059669"], accent: "#6ee7b7", light: "#ecfdf5", motif: "mint" },
    { slug: "pearl", label: "Pearl Elegance", animation: "float", bg: ["#fda4af", "#fb7185"], accent: "#ffe4e6", light: "#fff1f2", motif: "pearl" },
  ],
  "papeleria-libreria-oficina": [
    { slug: "pen", label: "Asistente de Oficina", animation: "wave", bg: ["#1e40af", "#1e3a8a"], accent: "#bfdbfe", light: "#eff6ff", motif: "pen" },
    { slug: "note", label: "Notas Útiles", animation: "float", bg: ["#ca8a04", "#a16207"], accent: "#fef08a", light: "#fefce8", motif: "note" },
    { slug: "book", label: "Book Expert", animation: "bob", bg: ["#7c2d12", "#431407"], accent: "#fdba74", light: "#fff7ed", motif: "book" },
    { slug: "desk", label: "Desk Pro", animation: "pulse", bg: ["#475569", "#1e293b"], accent: "#cbd5e1", light: "#f8fafc", motif: "desk" },
    { slug: "planner", label: "Planner Ace", animation: "glow", bg: ["#059669", "#047857"], accent: "#6ee7b7", light: "#ecfdf5", motif: "planner" },
    { slug: "stamp", label: "Stamp Official", animation: "float", bg: ["#dc2626", "#991b1b"], accent: "#fca5a5", light: "#fef2f2", motif: "stamp" },
    { slug: "archive", label: "Archive Keeper", animation: "bob", bg: ["#6366f1", "#4338ca"], accent: "#c7d2fe", light: "#eef2ff", motif: "archive" },
    { slug: "pencil", label: "Pencil Sketch", animation: "wave", bg: ["#eab308", "#ca8a04"], accent: "#fef08a", light: "#fefce8", motif: "pencil" },
    { slug: "folder", label: "Folder Master", animation: "pulse", bg: ["#0284c7", "#0369a1"], accent: "#bae6fd", light: "#f0f9ff", motif: "folder" },
    { slug: "ink", label: "Ink Studio", animation: "glow", bg: ["#312e81", "#1e1b4b"], accent: "#a5b4fc", light: "#eef2ff", motif: "ink" },
  ],
};

function sphere(bg, light) {
  return `
    <defs>
      <radialGradient id="sphere" cx="35%" cy="28%" r="68%">
        <stop offset="0%" stop-color="${light}"/>
        <stop offset="45%" stop-color="${bg[0]}"/>
        <stop offset="100%" stop-color="${bg[1]}"/>
      </radialGradient>
      <filter id="depth" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.28"/>
      </filter>
      <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <circle cx="64" cy="64" r="58" fill="url(#sphere)" filter="url(#depth)"/>
    <ellipse cx="48" cy="42" rx="22" ry="14" fill="url(#shine)" opacity="0.75"/>
  `;
}

function motif(type, accent, light) {
  const shapes = {
    orbit: `<circle cx="64" cy="64" r="34" fill="none" stroke="${accent}" stroke-width="3.5" opacity="0.7"/><circle cx="64" cy="64" r="22" fill="${accent}" opacity="0.22"/><circle cx="64" cy="30" r="7" fill="${light}"/><ellipse cx="64" cy="74" rx="18" ry="13" fill="${accent}" opacity="0.35"/>`,
    spark: `<path d="M64 22 L70 52 L100 52 L74 70 L82 100 L64 82 L46 100 L54 70 L28 52 L58 52 Z" fill="${accent}"/><circle cx="64" cy="64" r="12" fill="${light}" opacity="0.35"/>`,
    wave: `<circle cx="48" cy="54" r="8" fill="${light}"/><circle cx="80" cy="54" r="8" fill="${light}"/><path d="M34 78 Q50 60 64 78 T94 78" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/><path d="M52 88 Q64 96 76 88" fill="none" stroke="${light}" stroke-width="4" stroke-linecap="round"/>`,
    beacon: `<rect x="56" y="34" width="16" height="34" rx="8" fill="${light}"/><path d="M48 68 H80 L74 92 H54 Z" fill="${accent}"/><circle cx="64" cy="46" r="8" fill="${accent}"/>`,
    compass: `<circle cx="64" cy="64" r="24" fill="${accent}" opacity="0.35"/><path d="M64 40 L72 72 L64 64 L56 72 Z" fill="${light}"/><circle cx="64" cy="64" r="5" fill="${light}"/>`,
    halo: `<circle cx="64" cy="64" r="28" fill="${accent}" opacity="0.25"/><circle cx="64" cy="64" r="18" fill="${light}" opacity="0.9"/><circle cx="64" cy="64" r="8" fill="${accent}"/>`,
    prism: `<path d="M64 34 L86 78 H42 Z" fill="${accent}"/><path d="M64 34 L74 78 H54 Z" fill="${light}" opacity="0.55"/>`,
    echo: `<circle cx="64" cy="64" r="10" fill="${light}"/><circle cx="64" cy="64" r="18" fill="none" stroke="${accent}" stroke-width="3" opacity="0.8"/><circle cx="64" cy="64" r="28" fill="none" stroke="${accent}" stroke-width="2" opacity="0.45"/>`,
    guide: `<path d="M64 36 L78 88 H50 Z" fill="${accent}"/><circle cx="64" cy="50" r="10" fill="${light}"/>`,
    pulse: `<circle cx="64" cy="64" r="14" fill="${light}"/><path d="M40 64 H52 L58 48 L70 80 L76 64 H88" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    bot: `<rect x="38" y="44" width="52" height="42" rx="14" fill="${accent}" opacity="0.45"/><rect x="46" y="52" width="12" height="12" rx="3" fill="${light}"/><rect x="70" y="52" width="12" height="12" rx="3" fill="${light}"/><rect x="52" y="74" width="24" height="6" rx="3" fill="${light}"/><rect x="58" y="32" width="12" height="14" rx="4" fill="${accent}"/>`,
    chip: `<rect x="42" y="42" width="44" height="44" rx="8" fill="${accent}" opacity="0.4"/><rect x="54" y="54" width="20" height="20" rx="4" fill="${light}"/><path d="M64 42 V34 M64 94 V86 M42 64 H34 M94 64 H86" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>`,
    drone: `<ellipse cx="64" cy="68" rx="24" ry="10" fill="${accent}"/><circle cx="64" cy="58" r="12" fill="${light}"/><path d="M34 58 H48 M80 58 H94 M34 74 H48 M80 74 H94" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>`,
    headset: `<path d="M38 62 C38 46 48 38 64 38 C80 38 90 46 90 62 V74 H38 Z" fill="${accent}" opacity="0.45"/><rect x="34" y="58" width="12" height="20" rx="6" fill="${light}"/><rect x="82" y="58" width="12" height="20" rx="6" fill="${light}"/>`,
    rocket: `<path d="M64 30 C72 46 76 62 64 92 C52 62 56 46 64 30Z" fill="${accent}"/><circle cx="64" cy="56" r="8" fill="${light}"/><path d="M52 78 L48 92 M76 78 L80 92" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>`,
    circuit: `<path d="M40 64 H56 L64 48 L72 64 H88 M64 48 V34 M64 80 V94" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="64" r="5" fill="${light}"/><circle cx="88" cy="64" r="5" fill="${light}"/>`,
    pixel: `<rect x="44" y="44" width="16" height="16" fill="${light}"/><rect x="68" y="44" width="16" height="16" fill="${light}"/><rect x="52" y="68" width="24" height="12" fill="${accent}"/>`,
    server: `<rect x="42" y="38" width="44" height="52" rx="8" fill="${accent}" opacity="0.45"/><rect x="50" y="48" width="28" height="8" rx="2" fill="${light}"/><rect x="50" y="62" width="28" height="8" rx="2" fill="${light}"/><circle cx="72" cy="52" r="2" fill="${accent}"/><circle cx="72" cy="66" r="2" fill="${accent}"/>`,
    hologram: `<polygon points="64,34 88,78 40,78" fill="${accent}" opacity="0.35"/><polygon points="64,42 80,74 48,74" fill="${light}" opacity="0.75"/>`,
    android: `<rect x="44" y="42" width="40" height="46" rx="18" fill="${accent}" opacity="0.45"/><circle cx="56" cy="58" r="4" fill="${light}"/><circle cx="72" cy="58" r="4" fill="${light}"/><path d="M58 74 Q64 80 70 74" fill="none" stroke="${light}" stroke-width="3" stroke-linecap="round"/>`,
    anime: `<ellipse cx="64" cy="66" rx="24" ry="26" fill="${accent}" opacity="0.35"/><ellipse cx="54" cy="62" rx="7" ry="9" fill="${light}"/><ellipse cx="74" cy="62" rx="7" ry="9" fill="${light}"/><circle cx="54" cy="64" r="3" fill="#1e293b"/><circle cx="74" cy="64" r="3" fill="#1e293b"/>`,
    sakura: `<circle cx="64" cy="64" r="10" fill="${light}"/><circle cx="64" cy="38" r="9" fill="${accent}"/><circle cx="84" cy="52" r="9" fill="${accent}"/><circle cx="78" cy="78" r="9" fill="${accent}"/><circle cx="50" cy="78" r="9" fill="${accent}"/><circle cx="44" cy="52" r="9" fill="${accent}"/>`,
    hero: `<path d="M64 34 L82 52 L74 92 H54 L46 52 Z" fill="${accent}"/><circle cx="64" cy="48" r="9" fill="${light}"/>`,
    ninja: `<rect x="40" y="48" width="48" height="28" rx="14" fill="${accent}"/><rect x="48" y="56" width="10" height="4" fill="${light}"/><rect x="70" y="56" width="10" height="4" fill="${light}"/>`,
    wizard: `<path d="M48 72 Q64 34 80 72 Z" fill="${accent}"/><rect x="50" y="72" width="28" height="16" rx="4" fill="${light}"/><circle cx="64" cy="64" r="6" fill="${light}"/>`,
    mecha: `<rect x="46" y="44" width="36" height="34" rx="6" fill="${accent}"/><rect x="40" y="52" width="10" height="18" rx="3" fill="${light}"/><rect x="78" y="52" width="10" height="18" rx="3" fill="${light}"/><rect x="54" y="78" width="8" height="12" fill="${light}"/><rect x="66" y="78" width="8" height="12" fill="${light}"/>`,
    chibi: `<circle cx="64" cy="58" r="20" fill="${accent}"/><ellipse cx="64" cy="84" rx="18" ry="12" fill="${light}"/><circle cx="56" cy="56" r="3" fill="#1e293b"/><circle cx="72" cy="56" r="3" fill="#1e293b"/>`,
    dragon: `<path d="M44 72 Q64 38 84 72 Q64 88 44 72Z" fill="${accent}"/><circle cx="56" cy="62" r="4" fill="${light}"/><path d="M72 58 L84 48" stroke="${light}" stroke-width="4" stroke-linecap="round"/>`,
    comic: `<path d="M36 44 H92 V84 H36 Z" fill="${light}"/><path d="M44 56 H84 M44 68 H76" stroke="${accent}" stroke-width="4" stroke-linecap="round"/><circle cx="78" cy="48" r="8" fill="${accent}"/>`,
    mask: `<path d="M38 58 C38 42 48 34 64 34 C80 34 90 42 90 58 C90 74 80 92 64 92 C48 92 38 74 38 58Z" fill="${accent}" opacity="0.45"/><ellipse cx="52" cy="58" rx="7" ry="9" fill="${light}"/><ellipse cx="76" cy="58" rx="7" ry="9" fill="${light}"/>`,
    fashion: `<path d="M64 32 L82 50 L74 94 H54 L46 50 Z" fill="${accent}"/><circle cx="64" cy="44" r="9" fill="${light}"/>`,
    glam: `<ellipse cx="64" cy="60" rx="22" ry="26" fill="${accent}" opacity="0.55"/><path d="M42 46 Q64 22 86 46" fill="none" stroke="${light}" stroke-width="5" stroke-linecap="round"/>`,
    runway: `<path d="M52 92 L64 36 L76 92 Z" fill="${accent}"/><ellipse cx="64" cy="44" rx="10" ry="8" fill="${light}"/>`,
    vintage: `<circle cx="64" cy="58" r="18" fill="${accent}"/><rect x="48" y="76" width="32" height="14" rx="4" fill="${light}"/><path d="M48 48 Q64 34 80 48" fill="none" stroke="${light}" stroke-width="4"/>`,
    street: `<rect x="46" y="48" width="36" height="34" rx="10" fill="${accent}"/><path d="M52 58 H76 M52 68 H70" stroke="${light}" stroke-width="4" stroke-linecap="round"/>`,
    minimal: `<circle cx="64" cy="58" r="16" fill="${light}"/><rect x="52" y="76" width="24" height="10" rx="5" fill="${accent}"/>`,
    luxe: `<path d="M48 78 Q64 36 80 78 Z" fill="${accent}"/><rect x="54" y="78" width="20" height="10" fill="${light}"/>`,
    boutique: `<rect x="44" y="44" width="40" height="40" rx="12" fill="${accent}"/><path d="M52 58 H76 M52 68 H72" stroke="${light}" stroke-width="3" stroke-linecap="round"/>`,
    stylist: `<circle cx="64" cy="54" r="14" fill="${light}"/><path d="M48 78 Q64 66 80 78" fill="${accent}"/>`,
    trend: `<path d="M40 72 L56 48 L64 64 L72 44 L88 72 Z" fill="${accent}"/><circle cx="64" cy="54" r="8" fill="${light}"/>`,
    chef: `<ellipse cx="64" cy="88" rx="26" ry="8" fill="${accent}" opacity="0.35"/><path d="M46 72 Q64 40 82 72 L82 88 H46 Z" fill="${light}"/><ellipse cx="64" cy="48" rx="20" ry="14" fill="${accent}"/>`,
    fresh: `<circle cx="64" cy="64" r="24" fill="${accent}" opacity="0.35"/><path d="M64 38 C72 48 78 58 64 90 C50 58 56 48 64 38Z" fill="${accent}"/>`,
    baker: `<ellipse cx="64" cy="72" rx="22" ry="14" fill="${accent}"/><path d="M42 58 Q64 38 86 58" fill="${light}"/>`,
    barista: `<rect x="48" y="52" width="32" height="28" rx="6" fill="${accent}"/><path d="M80 58 H90 V68 H80" fill="none" stroke="${light}" stroke-width="4"/>`,
    farm: `<circle cx="64" cy="64" r="20" fill="${accent}"/><path d="M64 44 Q58 30 48 34" fill="none" stroke="${light}" stroke-width="4" stroke-linecap="round"/>`,
    spice: `<circle cx="64" cy="64" r="18" fill="${accent}"/><path d="M64 46 V34 M52 52 L44 44 M76 52 L84 44" stroke="${light}" stroke-width="3" stroke-linecap="round"/>`,
    sushi: `<ellipse cx="64" cy="68" rx="24" ry="12" fill="${accent}"/><circle cx="64" cy="54" r="12" fill="${light}"/>`,
    sweet: `<circle cx="64" cy="64" r="20" fill="${accent}"/><path d="M48 72 Q64 84 80 72" fill="${light}"/>`,
    grill: `<rect x="42" y="56" width="44" height="22" rx="6" fill="${accent}"/><path d="M48 56 V44 H80 V56" fill="none" stroke="${light}" stroke-width="4"/>`,
    harvest: `<path d="M64 36 L84 72 H44 Z" fill="${accent}"/><circle cx="64" cy="58" r="8" fill="${light}"/>`,
    leaf: `<path d="M64 92 C40 72 40 48 64 36 C88 48 88 72 64 92Z" fill="${accent}"/><path d="M64 92 V48" stroke="${light}" stroke-width="3" stroke-linecap="round"/>`,
    glowFace: `<circle cx="64" cy="64" r="24" fill="${accent}" opacity="0.35"/><circle cx="64" cy="64" r="14" fill="${light}"/><path d="M64 24 V34 M64 94 V84 M24 64 H34 M94 64 H84" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>`,
    spa: `<path d="M40 72 Q64 40 88 72" fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round"/><circle cx="64" cy="54" r="10" fill="${light}"/>`,
    serum: `<rect x="56" y="38" width="16" height="44" rx="8" fill="${light}"/><rect x="58" y="52" width="12" height="16" rx="4" fill="${accent}"/>`,
    zen: `<circle cx="64" cy="64" r="20" fill="${accent}" opacity="0.35"/><path d="M48 64 H80 M64 48 V80" stroke="${light}" stroke-width="4" stroke-linecap="round"/>`,
    bloom: `<circle cx="64" cy="64" r="12" fill="${light}"/><circle cx="64" cy="42" r="8" fill="${accent}"/><circle cx="82" cy="58" r="8" fill="${accent}"/><circle cx="46" cy="58" r="8" fill="${accent}"/>`,
    radiance: `<circle cx="64" cy="64" r="18" fill="${light}"/><path d="M64 34 L68 54 L88 54 L72 66 L78 86 L64 74 L50 86 L56 66 L40 54 L60 54 Z" fill="${accent}" opacity="0.75"/>`,
    care: `<path d="M64 88 C48 72 48 52 64 40 C80 52 80 72 64 88Z" fill="${accent}"/><circle cx="64" cy="58" r="8" fill="${light}"/>`,
    mint: `<circle cx="64" cy="64" r="22" fill="${accent}"/><path d="M64 42 Q72 52 64 86 C56 52 56 42 64 42Z" fill="${light}"/>`,
    pearl: `<circle cx="64" cy="64" r="18" fill="${light}"/><circle cx="64" cy="64" r="10" fill="${accent}" opacity="0.65"/>`,
    pen: `<rect x="50" y="36" width="24" height="54" rx="6" fill="${light}" transform="rotate(16 64 64)"/><path d="M60 86 L68 40" stroke="${accent}" stroke-width="4" stroke-linecap="round" transform="rotate(16 64 64)"/>`,
    note: `<rect x="40" y="36" width="48" height="56" rx="6" fill="${light}"/><path d="M50 54 H78 M50 66 H74 M50 78 H64" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>`,
    book: `<rect x="44" y="40" width="40" height="48" rx="4" fill="${accent}"/><path d="M64 40 V88" stroke="${light}" stroke-width="3"/><path d="M52 52 H60 M68 52 H76" stroke="${light}" stroke-width="3" stroke-linecap="round"/>`,
    desk: `<rect x="36" y="58" width="56" height="18" rx="4" fill="${accent}"/><rect x="48" y="44" width="32" height="18" rx="3" fill="${light}"/>`,
    planner: `<rect x="42" y="38" width="44" height="52" rx="6" fill="${light}"/><path d="M50 54 H78 M50 66 H74 M50 78 H68" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>`,
    stamp: `<rect x="44" y="44" width="40" height="40" rx="8" fill="${accent}"/><path d="M52 58 H76 M52 68 H72" stroke="${light}" stroke-width="4" stroke-linecap="round"/>`,
    archive: `<rect x="40" y="42" width="48" height="44" rx="6" fill="${accent}"/><path d="M48 54 H80 M48 66 H76" stroke="${light}" stroke-width="3" stroke-linecap="round"/>`,
    pencil: `<path d="M48 84 L72 40" stroke="${accent}" stroke-width="8" stroke-linecap="round"/><circle cx="76" cy="36" r="6" fill="${light}"/>`,
    folder: `<path d="M36 48 H56 L64 56 H92 V84 H36 Z" fill="${accent}"/><rect x="44" y="62" width="36" height="8" rx="2" fill="${light}"/>`,
    ink: `<ellipse cx="64" cy="72" rx="18" ry="10" fill="${accent}"/><rect x="58" y="40" width="12" height="28" rx="4" fill="${light}"/>`,
  };

  return shapes[type] ?? shapes.orbit;
}

function buildSvg(entry) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-hidden="true">${sphere(entry.bg, entry.light)}${motif(entry.motif, entry.accent, entry.light)}</svg>`;
}

function cleanOutputDir() {
  if (fs.existsSync(OUT_DIR)) {
    for (const file of fs.readdirSync(OUT_DIR)) {
      if (file.endsWith(".svg")) {
        fs.unlinkSync(path.join(OUT_DIR, file));
      }
    }
  } else {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
}

cleanOutputDir();

/** @type {Array<{ id: string; label: string; rubro: string; imagePath: string; animation: string }>} */
const presets = [];

for (const [rubro, entries] of Object.entries(CATALOG)) {
  for (const entry of entries) {
    const id = `${rubro}-${entry.slug}`;
    const filename = `${id}.svg`;
    fs.writeFileSync(path.join(OUT_DIR, filename), buildSvg(entry));
    presets.push({
      id,
      label: entry.label,
      rubro,
      imagePath: `/assistant-avatars/${filename}`,
      animation: entry.animation,
    });
  }
}

const manifestSource = `/* eslint-disable */\n// Generated by scripts/generate-assistant-avatars.mjs — do not edit manually.\n\nimport type { StoreRubro } from "@/src/config/categories";\n\nexport type AssistantAvatarAnimationKind = ${JSON.stringify(ANIMATIONS)}[number];\n\nexport type AssistantAvatarRubro = StoreRubro | "general";\n\nexport interface AssistantAvatarPresetManifestEntry {\n  id: string;\n  label: string;\n  rubro: AssistantAvatarRubro;\n  imagePath: string;\n  animation: AssistantAvatarAnimationKind;\n}\n\nexport const ASSISTANT_AVATAR_RUBRO_LABELS: Record<AssistantAvatarRubro, string> = ${JSON.stringify(RUBRO_LABELS, null, 2)} as Record<AssistantAvatarRubro, string>;\n\nexport const ASSISTANT_AVATAR_PRESET_MANIFEST: AssistantAvatarPresetManifestEntry[] = ${JSON.stringify(presets, null, 2)};\n`;

fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
fs.writeFileSync(MANIFEST_PATH, manifestSource);

console.log(`Created ${presets.length} assistant avatars and manifest.`);
