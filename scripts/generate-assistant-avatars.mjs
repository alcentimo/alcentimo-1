import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join("public", "assistant-avatars");
const MANIFEST_PATH = path.join(
  "lib",
  "store-settings",
  "assistant-avatar-manifest.ts",
);

const ANIMATIONS = /** @type {const} */ ([
  "float",
  "wave",
  "glow",
  "pulse",
  "bob",
]);

const RUBRO_LABELS = {
  tecnologia: "Tecnología y Electrónica",
  coleccionables: "Coleccionables y Cómics",
  "ropa-moda": "Ropa, Calzado y Moda",
  alimentos: "Alimentos y Bebidas",
  "salud-belleza": "Salud, Belleza y Cuidado",
  "papeleria-libreria-oficina": "Papelería, Librería y Oficina",
};

/** Personajes tecnología — cuerpos completos, sin círculos planos. */
const TECNOLOGIA = [
  { slug: "robbo", label: "Robbo el Robot", animation: "bob", draw: drawRobbo },
  { slug: "cctv", label: "Cámara Vigilante", animation: "wave", draw: drawCctv },
  { slug: "nerd", label: "Nerd Techie", animation: "float", draw: drawNerd },
  { slug: "drone", label: "Dron Amigo", animation: "bob", draw: drawDrone },
  { slug: "chipster", label: "Chipster", animation: "glow", draw: drawChipster },
  { slug: "laptop-guru", label: "Gurú Laptop", animation: "pulse", draw: drawLaptopGuru },
  { slug: "vr-buddy", label: "VR Buddy", animation: "float", draw: drawVrBuddy },
  { slug: "console-pal", label: "Control Gamer", animation: "wave", draw: drawConsolePal },
  { slug: "satellite", label: "Satélite Soli", animation: "bob", draw: drawSatellite },
  { slug: "wire-bot", label: "Bot Cableado", animation: "pulse", draw: drawWireBot },
];

const COLECCIONABLES = [
  { slug: "neo", label: "Neo Anime", animation: "float", draw: (c) => drawPerson(c, "#fbcfe8", "#ec4899") },
  { slug: "sakura", label: "Sakura Kawaii", animation: "glow", draw: (c) => drawPerson(c, "#fce7f3", "#f472b6", "sakura") },
  { slug: "hero", label: "Héroe Manga", animation: "wave", draw: (c) => drawHero(c) },
  { slug: "ninja", label: "Ninja Shadow", animation: "bob", draw: (c) => drawNinja(c) },
  { slug: "wizard", label: "Mago Arcano", animation: "glow", draw: (c) => drawWizard(c) },
  { slug: "mecha", label: "Mecha Pilot", animation: "pulse", draw: (c) => drawMecha(c) },
  { slug: "chibi", label: "Chibi Star", animation: "float", draw: (c) => drawChibi(c) },
  { slug: "dragon", label: "Dragon Keeper", animation: "bob", draw: (c) => drawDragon(c) },
  { slug: "comic", label: "Comic Boom", animation: "wave", draw: (c) => drawComic(c) },
  { slug: "mask", label: "Máscara Heroica", animation: "pulse", draw: (c) => drawMask(c) },
];

const ROPA_MODA = [
  { slug: "chic", label: "Estilista Chic", animation: "float", draw: (c) => drawStylist(c, "#fbbf24", "#171717") },
  { slug: "glam", label: "Glam Boutique", animation: "glow", draw: (c) => drawStylist(c, "#fbcfe8", "#be185d") },
  { slug: "runway", label: "Runway Star", animation: "wave", draw: (c) => drawRunway(c) },
  { slug: "vintage", label: "Vintage Soul", animation: "bob", draw: (c) => drawVintage(c) },
  { slug: "street", label: "Street Trend", animation: "pulse", draw: (c) => drawStreet(c) },
  { slug: "minimal", label: "Minimal Lux", animation: "float", draw: (c) => drawMinimal(c) },
  { slug: "luxe", label: "Luxe Maison", animation: "glow", draw: (c) => drawLuxe(c) },
  { slug: "boutique", label: "Boutique Pro", animation: "wave", draw: (c) => drawBoutique(c) },
  { slug: "stylist", label: "Stylist Pro", animation: "bob", draw: (c) => drawStylist(c, "#f9a8d4", "#db2777") },
  { slug: "trend", label: "Trend Setter", animation: "pulse", draw: (c) => drawTrend(c) },
];

const ALIMENTOS = [
  { slug: "chef", label: "Chef Maestro", animation: "wave", draw: drawChef },
  { slug: "baker", label: "Panadero Artesanal", animation: "bob", draw: drawBaker },
  { slug: "barista", label: "Barista Pro", animation: "glow", draw: drawBarista },
  { slug: "farm", label: "Granja Viva", animation: "pulse", draw: drawFarm },
  { slug: "sushi", label: "Sushi Master", animation: "float", draw: drawSushi },
  { slug: "sweet", label: "Dulce Tentación", animation: "glow", draw: drawSweet },
  { slug: "grill", label: "Grill Expert", animation: "bob", draw: drawGrill },
  { slug: "harvest", label: "Cosecha Dorada", animation: "pulse", draw: drawHarvest },
  { slug: "spice", label: "Chef Especias", animation: "wave", draw: drawSpice },
  { slug: "fresh", label: "Frescura Natural", animation: "float", draw: drawFresh },
];

const SALUD_BELLEZA = [
  { slug: "spa", label: "Spa Serenity", animation: "bob", draw: drawSpa },
  { slug: "serum", label: "Serum Lab", animation: "pulse", draw: drawSerum },
  { slug: "bloom", label: "Bloom Care", animation: "wave", draw: drawBloom },
  { slug: "care", label: "Care Expert", animation: "float", draw: drawCare },
  { slug: "mint", label: "Mint Fresh", animation: "bob", draw: drawMint },
  { slug: "pearl", label: "Pearl Elegance", animation: "glow", draw: drawPearl },
  { slug: "leaf", label: "Bienestar Natural", animation: "float", draw: drawLeaf },
  { slug: "glow", label: "Glow Beauty", animation: "glow", draw: drawGlowBeauty },
  { slug: "zen", label: "Zen Balance", animation: "pulse", draw: drawZen },
  { slug: "radiance", label: "Radiance Pro", animation: "wave", draw: drawRadiance },
];

const PAPELERIA = [
  { slug: "pen", label: "Asistente de Oficina", animation: "wave", draw: drawPenPal },
  { slug: "book", label: "Book Expert", animation: "bob", draw: drawBookworm },
  { slug: "desk", label: "Desk Pro", animation: "pulse", draw: drawDeskPal },
  { slug: "planner", label: "Planner Ace", animation: "glow", draw: drawPlanner },
  { slug: "archive", label: "Archive Keeper", animation: "float", draw: drawArchive },
  { slug: "pencil", label: "Pencil Sketch", animation: "wave", draw: drawPencilPal },
  { slug: "folder", label: "Folder Master", animation: "bob", draw: drawFolderPal },
  { slug: "ink", label: "Ink Studio", animation: "glow", draw: drawInkPal },
  { slug: "note", label: "Notas Útiles", animation: "float", draw: drawNotePal },
  { slug: "stamp", label: "Stamp Official", animation: "pulse", draw: drawStampPal },
];

const CATALOG = {
  tecnologia: TECNOLOGIA,
  coleccionables: COLECCIONABLES,
  "ropa-moda": ROPA_MODA,
  alimentos: ALIMENTOS,
  "salud-belleza": SALUD_BELLEZA,
  "papeleria-libreria-oficina": PAPELERIA,
};

const COLORS = {
  primary: "#2563eb",
  primaryDark: "#1e3a8a",
  accent: "#93c5fd",
  light: "#eff6ff",
  skin: "#fcd9b6",
  skinShadow: "#e8b88a",
  dark: "#1e293b",
  white: "#ffffff",
};

function defs() {
  return `<defs>
    <filter id="charShadow" x="-15%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#0f172a" flood-opacity="0.22"/>
    </filter>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e2e8f0" stop-opacity="0"/>
      <stop offset="100%" stop-color="#cbd5e1" stop-opacity="0.35"/>
    </linearGradient>
  </defs>`;
}

function wrapCharacter(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 148" role="img" aria-hidden="true">${defs()}<ellipse cx="64" cy="138" rx="34" ry="6" fill="url(#floor)"/><g filter="url(#charShadow)">${content}</g></svg>`;
}

function drawRobbo(c) {
  return `
    <rect x="46" y="28" width="36" height="28" rx="10" fill="${c.primary}"/>
    <rect x="52" y="36" width="10" height="10" rx="3" fill="${c.light}"/>
    <rect x="66" y="36" width="10" height="10" rx="3" fill="${c.light}"/>
    <circle cx="57" cy="41" r="2.5" fill="${c.dark}"/>
    <circle cx="71" cy="41" r="2.5" fill="${c.dark}"/>
    <rect x="58" y="52" width="12" height="5" rx="2" fill="${c.accent}"/>
    <rect x="58" y="18" width="12" height="12" rx="4" fill="${c.accent}"/>
    <rect x="42" y="58" width="44" height="36" rx="12" fill="${c.primaryDark}"/>
    <circle cx="64" cy="74" r="8" fill="${c.accent}"/>
    <rect x="28" y="62" width="12" height="28" rx="6" fill="${c.primary}"/>
    <rect x="88" y="62" width="12" height="28" rx="6" fill="${c.primary}"/>
    <rect x="24" y="86" width="16" height="10" rx="5" fill="${c.accent}"/>
    <rect x="88" y="86" width="16" height="10" rx="5" fill="${c.accent}"/>
    <rect x="50" y="94" width="12" height="28" rx="6" fill="${c.primary}"/>
    <rect x="66" y="94" width="12" height="28" rx="6" fill="${c.primary}"/>
    <rect x="46" y="118" width="16" height="8" rx="4" fill="${c.dark}"/>
    <rect x="66" y="118" width="16" height="8" rx="4" fill="${c.dark}"/>
  `;
}

function drawCctv(c) {
  return `
    <ellipse cx="64" cy="52" rx="30" ry="22" fill="${c.dark}"/>
    <ellipse cx="64" cy="50" rx="22" ry="16" fill="#334155"/>
    <circle cx="64" cy="50" r="12" fill="${c.primary}"/>
    <circle cx="64" cy="50" r="7" fill="${c.light}"/>
    <circle cx="64" cy="50" r="4" fill="${c.primaryDark}"/>
    <rect x="58" y="68" width="12" height="8" rx="3" fill="${c.dark}"/>
    <path d="M52 76 L52 108" stroke="${c.dark}" stroke-width="5" stroke-linecap="round"/>
    <path d="M76 76 L76 108" stroke="${c.dark}" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="52" cy="112" rx="10" ry="5" fill="${c.primaryDark}"/>
    <ellipse cx="76" cy="112" rx="10" ry="5" fill="${c.primaryDark}"/>
    <circle cx="48" cy="44" r="3" fill="#ef4444"/>
    <path d="M38 58 L28 48 M90 58 L100 48" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/>
  `;
}

function drawNerd(c) {
  return `
    <ellipse cx="64" cy="42" rx="22" ry="24" fill="${c.skin}"/>
    <path d="M38 44 Q64 18 90 44" fill="${c.dark}"/>
    <rect x="42" y="40" width="18" height="12" rx="4" fill="none" stroke="${c.dark}" stroke-width="3"/>
    <rect x="68" y="40" width="18" height="12" rx="4" fill="none" stroke="${c.dark}" stroke-width="3"/>
    <path d="M60 46 H68" stroke="${c.dark}" stroke-width="2"/>
    <circle cx="51" cy="46" r="4" fill="${c.white}"/>
    <circle cx="77" cy="46" r="4" fill="${c.white}"/>
    <circle cx="51" cy="46" r="2" fill="${c.dark}"/>
    <circle cx="77" cy="46" r="2" fill="${c.dark}"/>
    <path d="M56 58 Q64 64 72 58" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round"/>
    <rect x="44" y="66" width="40" height="34" rx="10" fill="${c.primary}"/>
    <path d="M44 76 H84" stroke="${c.primaryDark}" stroke-width="2"/>
    <rect x="54" y="72" width="20" height="4" rx="1" fill="${c.accent}"/>
    <rect x="36" y="70" width="10" height="24" rx="4" fill="${c.primary}"/>
    <rect x="82" y="70" width="10" height="24" rx="4" fill="${c.primary}"/>
    <rect x="48" y="100" width="14" height="26" rx="5" fill="#1e3a8a"/>
    <rect x="66" y="100" width="14" height="26" rx="5" fill="#1e3a8a"/>
    <rect x="44" y="122" width="18" height="8" rx="4" fill="${c.dark}"/>
    <rect x="66" y="122" width="18" height="8" rx="4" fill="${c.dark}"/>
  `;
}

function drawDrone(c) {
  return `
    <ellipse cx="64" cy="72" rx="26" ry="14" fill="${c.primaryDark}"/>
    <ellipse cx="64" cy="68" rx="18" ry="10" fill="${c.primary}"/>
    <circle cx="58" cy="66" r="3" fill="${c.light}"/>
    <circle cx="70" cy="66" r="3" fill="${c.light}"/>
    <path d="M60 74 Q64 78 68 74" fill="none" stroke="${c.light}" stroke-width="2" stroke-linecap="round"/>
    <line x1="38" y1="58" x2="52" y2="66" stroke="${c.dark}" stroke-width="3" stroke-linecap="round"/>
    <line x1="90" y1="58" x2="76" y2="66" stroke="${c.dark}" stroke-width="3" stroke-linecap="round"/>
    <line x1="38" y1="82" x2="52" y2="74" stroke="${c.dark}" stroke-width="3" stroke-linecap="round"/>
    <line x1="90" y1="82" x2="76" y2="74" stroke="${c.dark}" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="32" cy="56" rx="12" ry="3" fill="${c.accent}" opacity="0.8"/>
    <ellipse cx="96" cy="56" rx="12" ry="3" fill="${c.accent}" opacity="0.8"/>
    <ellipse cx="32" cy="84" rx="12" ry="3" fill="${c.accent}" opacity="0.8"/>
    <ellipse cx="96" cy="84" rx="12" ry="3" fill="${c.accent}" opacity="0.8"/>
    <path d="M58 86 L50 108 M70 86 L78 108" stroke="${c.primary}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="50" cy="110" r="5" fill="${c.accent}"/>
    <circle cx="78" cy="110" r="5" fill="${c.accent}"/>
  `;
}

function drawChipster(c) {
  return `
    <rect x="44" y="48" width="40" height="40" rx="8" fill="${c.primary}"/>
    <rect x="52" y="56" width="24" height="24" rx="4" fill="${c.light}"/>
    <path d="M64 48 V36 M64 88 V100 M44 68 H32 M84 68 H96 M48 52 L40 44 M80 52 L88 44 M48 84 L40 92 M80 84 L88 92" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/>
    <rect x="22" y="58" width="14" height="8" rx="4" fill="${c.primaryDark}"/>
    <rect x="92" y="58" width="14" height="8" rx="4" fill="${c.primaryDark}"/>
    <rect x="24" y="72" width="10" height="22" rx="4" fill="${c.primary}"/>
    <rect x="94" y="72" width="10" height="22" rx="4" fill="${c.primary}"/>
    <rect x="50" y="88" width="10" height="24" rx="4" fill="${c.primaryDark}"/>
    <rect x="68" y="88" width="10" height="24" rx="4" fill="${c.primaryDark}"/>
    <circle cx="56" cy="40" r="4" fill="${c.accent}"/>
    <circle cx="72" cy="40" r="4" fill="${c.accent}"/>
    <path d="M58 44 Q64 48 70 44" fill="none" stroke="${c.dark}" stroke-width="2"/>
  `;
}

function drawLaptopGuru(c) {
  return `
    <ellipse cx="64" cy="38" rx="18" ry="20" fill="${c.skin}"/>
    <rect x="48" y="34" width="14" height="8" rx="3" fill="none" stroke="${c.dark}" stroke-width="2"/>
    <rect x="66" y="34" width="14" height="8" rx="3" fill="none" stroke="${c.dark}" stroke-width="2"/>
    <rect x="46" y="58" width="36" height="32" rx="8" fill="#059669"/>
    <rect x="30" y="88" width="68" height="8" rx="3" fill="${c.dark}"/>
    <rect x="34" y="78" width="60" height="14" rx="4" fill="#334155"/>
    <rect x="38" y="80" width="52" height="10" rx="2" fill="${c.primary}"/>
    <rect x="52" y="58" width="24" height="4" rx="1" fill="${c.accent}"/>
    <rect x="40" y="62" width="12" height="22" rx="4" fill="#059669"/>
    <rect x="76" y="62" width="12" height="22" rx="4" fill="#059669"/>
    <rect x="48" y="96" width="12" height="22" rx="4" fill="#1e3a8a"/>
    <rect x="68" y="96" width="12" height="22" rx="4" fill="#1e3a8a"/>
  `;
}

function drawVrBuddy(c) {
  return `
    <ellipse cx="64" cy="44" rx="20" ry="22" fill="${c.skin}"/>
    <rect x="40" y="36" width="48" height="18" rx="9" fill="${c.dark}"/>
    <rect x="46" y="40" width="14" height="10" rx="3" fill="${c.primary}"/>
    <rect x="68" y="40" width="14" height="10" rx="3" fill="#a855f7"/>
    <rect x="46" y="66" width="36" height="30" rx="10" fill="#7c3aed"/>
    <rect x="34" y="70" width="10" height="22" rx="4" fill="#7c3aed"/>
    <rect x="84" y="70" width="10" height="22" rx="4" fill="#7c3aed"/>
    <rect x="50" y="96" width="12" height="24" rx="5" fill="${c.dark}"/>
    <rect x="66" y="96" width="12" height="24" rx="5" fill="${c.dark}"/>
    <path d="M64 28 L64 34" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="64" cy="26" r="3" fill="${c.accent}"/>
  `;
}

function drawConsolePal(c) {
  return `
    <rect x="28" y="56" width="72" height="44" rx="16" fill="${c.dark}"/>
    <rect x="36" y="64" width="24" height="12" rx="4" fill="#64748b"/>
    <circle cx="78" cy="68" r="6" fill="#ef4444"/>
    <circle cx="92" cy="68" r="6" fill="#22c55e"/>
    <circle cx="78" cy="84" r="6" fill="#eab308"/>
    <circle cx="92" cy="84" r="6" fill="#3b82f6"/>
    <ellipse cx="64" cy="42" rx="16" ry="14" fill="${c.primary}"/>
    <circle cx="58" cy="40" r="3" fill="${c.light}"/>
    <circle cx="70" cy="40" r="3" fill="${c.light}"/>
    <path d="M60 48 Q64 52 68 48" fill="none" stroke="${c.light}" stroke-width="2"/>
    <rect x="48" y="100" width="10" height="18" rx="4" fill="${c.primaryDark}"/>
    <rect x="70" y="100" width="10" height="18" rx="4" fill="${c.primaryDark}"/>
  `;
}

function drawSatellite(c) {
  return `
    <rect x="54" y="48" width="20" height="28" rx="6" fill="${c.primary}"/>
    <circle cx="64" cy="58" r="6" fill="${c.light}"/>
    <rect x="20" y="58" width="28" height="10" rx="3" fill="${c.accent}"/>
    <rect x="80" y="58" width="28" height="10" rx="3" fill="${c.accent}"/>
    <path d="M48 58 H54 M74 58 H80" stroke="${c.primaryDark}" stroke-width="3"/>
    <rect x="58" y="76" width="12" height="8" rx="3" fill="${c.primaryDark}"/>
    <path d="M58 84 L50 108 M70 84 L78 108" stroke="${c.primary}" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="50" cy="110" rx="8" ry="4" fill="${c.accent}"/>
    <ellipse cx="78" cy="110" rx="8" ry="4" fill="${c.accent}"/>
    <path d="M64 36 L64 48" stroke="${c.dark}" stroke-width="3"/>
    <circle cx="64" cy="34" r="4" fill="#ef4444"/>
    <path d="M64 24 L68 32 H60 Z" fill="${c.accent}"/>
  `;
}

function drawWireBot(c) {
  return `
    <circle cx="64" cy="36" r="16" fill="${c.primary}"/>
    <circle cx="58" cy="34" r="3" fill="${c.light}"/>
    <circle cx="70" cy="34" r="3" fill="${c.light}"/>
    <path d="M48 52 Q36 64 40 80" fill="none" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/>
    <path d="M80 52 Q92 64 88 80" fill="none" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/>
    <rect x="48" y="52" width="32" height="28" rx="8" fill="${c.primaryDark}"/>
    <path d="M52 60 H76 M52 68 H72" stroke="${c.accent}" stroke-width="2" stroke-linecap="round"/>
    <path d="M52 88 L44 108 M76 88 L84 108" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/>
    <path d="M58 80 L50 96 M70 80 L78 96" stroke="${c.primary}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="44" cy="110" r="5" fill="${c.primaryDark}"/>
    <circle cx="84" cy="110" r="5" fill="${c.primaryDark}"/>
  `;
}

// --- Other rubros: personajes con cuerpo (sin círculo de fondo) ---

function drawPerson(c, accent, body, variant) {
  if (variant === "sakura") {
    return `${drawPerson(c, accent, body, "")}<circle cx="64" cy="22" r="6" fill="${accent}"/><circle cx="78" cy="30" r="5" fill="${accent}"/><circle cx="50" cy="30" r="5" fill="${accent}"/>`;
  }
  return `
    <ellipse cx="64" cy="40" rx="18" ry="20" fill="${c.skin}"/>
    <ellipse cx="58" cy="38" rx="4" ry="5" fill="${c.white}"/>
    <ellipse cx="70" cy="38" rx="4" ry="5" fill="${c.white}"/>
    <circle cx="58" cy="39" r="2" fill="${c.dark}"/>
    <circle cx="70" cy="39" r="2" fill="${c.dark}"/>
    <path d="M58 48 Q64 52 70 48" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round"/>
    <rect x="46" y="60" width="36" height="34" rx="10" fill="${body}"/>
    <rect x="38" y="66" width="10" height="24" rx="4" fill="${body}"/>
    <rect x="80" y="66" width="10" height="24" rx="4" fill="${body}"/>
    <rect x="50" y="94" width="12" height="26" rx="5" fill="${c.dark}"/>
    <rect x="66" y="94" width="12" height="26" rx="5" fill="${c.dark}"/>
  `;
}

function drawHero(c) {
  return `
    <path d="M64 24 L74 44 H88 L78 58 L82 78 L64 68 L46 78 L50 58 L40 44 H54 Z" fill="#ef4444"/>
    <ellipse cx="64" cy="44" rx="12" ry="13" fill="${c.skin}"/>
    <rect x="48" y="68" width="32" height="28" rx="8" fill="#2563eb"/>
    <rect x="44" y="96" width="12" height="22" rx="4" fill="#1e3a8a"/>
    <rect x="72" y="96" width="12" height="22" rx="4" fill="#1e3a8a"/>
  `;
}

function drawNinja(c) {
  return `
    <ellipse cx="64" cy="40" rx="18" ry="19" fill="${c.dark}"/>
    <rect x="48" y="36" width="10" height="4" fill="${c.white}"/>
    <rect x="66" y="36" width="10" height="4" fill="${c.white}"/>
    <rect x="46" y="60" width="36" height="32" rx="8" fill="#0f172a"/>
    <path d="M36 68 L46 72 M92 68 L82 72" stroke="${c.dark}" stroke-width="4" stroke-linecap="round"/>
    <rect x="50" y="92" width="12" height="24" rx="4" fill="${c.dark}"/>
    <rect x="66" y="92" width="12" height="24" rx="4" fill="${c.dark}"/>
  `;
}

function drawWizard(c) {
  return `
    <path d="M48 44 Q64 16 80 44 L76 52 H52 Z" fill="#7c3aed"/>
    <ellipse cx="64" cy="48" rx="14" ry="15" fill="${c.skin}"/>
    <rect x="48" y="62" width="32" height="30" rx="8" fill="#4c1d95"/>
    <rect x="30" y="70" width="36" height="6" rx="2" fill="#a78bfa" transform="rotate(-24 48 73)"/>
    <rect x="50" y="92" width="12" height="24" rx="4" fill="#312e81"/>
    <rect x="66" y="92" width="12" height="24" rx="4" fill="#312e81"/>
  `;
}

function drawMecha(c) {
  return drawRobbo({ ...c, primary: "#64748b", primaryDark: "#334155", accent: "#94a3b8" });
}

function drawChibi(c) {
  return `
    <ellipse cx="64" cy="52" rx="24" ry="26" fill="#f59e0b"/>
    <circle cx="56" cy="48" r="3" fill="${c.dark}"/>
    <circle cx="72" cy="48" r="3" fill="${c.dark}"/>
    <ellipse cx="64" cy="86" rx="20" ry="16" fill="#fcd34d"/>
    <rect x="48" y="98" width="12" height="18" rx="4" fill="#d97706"/>
    <rect x="68" y="98" width="12" height="18" rx="4" fill="#d97706"/>
  `;
}

function drawDragon(c) {
  return `
    <path d="M40 72 Q64 28 88 72 Q64 96 40 72Z" fill="#059669"/>
    <circle cx="56" cy="60" r="4" fill="${c.white}"/>
    <circle cx="58" cy="60" r="2" fill="${c.dark}"/>
    <path d="M72 52 L92 38" stroke="#059669" stroke-width="5" stroke-linecap="round"/>
    <path d="M48 88 L40 108 M80 88 L88 108" stroke="#047857" stroke-width="4" stroke-linecap="round"/>
  `;
}

function drawComic(c) {
  return `
    <rect x="36" y="32" width="56" height="72" rx="6" fill="${c.white}" stroke="${c.dark}" stroke-width="3"/>
    <path d="M44 52 H84 M44 64 H76 M44 76 H68" stroke="${c.dark}" stroke-width="3" stroke-linecap="round"/>
    <path d="M88 28 L96 20" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>
    <text x="92" y="24" font-size="12" font-weight="bold" fill="#ef4444">!</text>
    <rect x="48" y="104" width="12" height="16" rx="3" fill="${c.dark}"/>
    <rect x="68" y="104" width="12" height="16" rx="3" fill="${c.dark}"/>
  `;
}

function drawMask(c) {
  return `
    <ellipse cx="64" cy="40" rx="18" ry="19" fill="#4338ca"/>
    <rect x="48" y="36" width="10" height="4" fill="${c.white}"/>
    <rect x="66" y="36" width="10" height="4" fill="${c.white}"/>
    <rect x="46" y="60" width="36" height="32" rx="8" fill="#312e81"/>
    <rect x="50" y="92" width="12" height="24" rx="4" fill="${c.dark}"/>
    <rect x="66" y="92" width="12" height="24" rx="4" fill="${c.dark}"/>
  `;
}

function drawStylist(c, accent, body) {
  return drawPerson(c, accent, body);
}

function drawRunway(c) {
  return `
    <ellipse cx="64" cy="36" rx="14" ry="16" fill="${c.skin}"/>
    <path d="M52 52 L64 28 L76 52 L72 108 H56 Z" fill="#111827"/>
    <path d="M56 52 H72" stroke="#f472b6" stroke-width="3"/>
    <rect x="54" y="108" width="8" height="14" rx="2" fill="${c.dark}"/>
    <rect x="66" y="108" width="8" height="14" rx="2" fill="${c.dark}"/>
  `;
}

function drawVintage(c) {
  return drawPerson(c, "#fcd34d", "#92400e");
}

function drawStreet(c) {
  return drawPerson(c, "#67e8f9", "#0891b2");
}

function drawMinimal(c) {
  return drawPerson(c, "#f8fafc", "#64748b");
}

function drawLuxe(c) {
  return drawRunway(c);
}

function drawBoutique(c) {
  return drawStylist(c, "#e9d5ff", "#9333ea");
}

function drawTrend(c) {
  return drawPerson(c, "#bae6fd", "#0ea5e9");
}

function drawChef(c) {
  return `
    <ellipse cx="64" cy="40" rx="16" ry="18" fill="${c.skin}"/>
    <path d="M48 32 Q64 12 80 32 L78 38 H50 Z" fill="${c.white}"/>
    <rect x="46" y="58" width="36" height="32" fill="${c.white}" stroke="#ea580c" stroke-width="2" rx="8"/>
    <rect x="38" y="66" width="10" height="22" rx="4" fill="${c.white}"/>
    <rect x="80" y="66" width="10" height="22" rx="4" fill="${c.white}"/>
    <rect x="50" y="90" width="12" height="26" rx="4" fill="${c.dark}"/>
    <rect x="66" y="90" width="12" height="26" rx="4" fill="${c.dark}"/>
  `;
}

function drawBaker(c) {
  return drawChef(c);
}

function drawBarista(c) {
  return `
    <ellipse cx="64" cy="38" rx="15" ry="17" fill="${c.skin}"/>
    <rect x="46" y="56" width="36" height="30" rx="8" fill="#78350f"/>
    <rect x="52" y="48" width="24" height="12" rx="4" fill="${c.dark}"/>
    <rect x="78" y="60" width="16" height="10" rx="3" fill="#d4d4d8"/>
    <rect x="50" y="86" width="12" height="24" rx="4" fill="#451a03"/>
    <rect x="66" y="86" width="12" height="24" rx="4" fill="#451a03"/>
  `;
}

function drawFarm(c) {
  return drawPerson(c, "#bbf7d0", "#16a34a");
}

function drawSushi(c) {
  return `
    <ellipse cx="64" cy="72" rx="28" ry="14" fill="#ef4444"/>
    <circle cx="64" cy="58" r="14" fill="${c.white}"/>
    <circle cx="60" cy="56" r="2" fill="${c.dark}"/>
    <circle cx="68" cy="56" r="2" fill="${c.dark}"/>
    <rect x="52" y="86" width="10" height="20" rx="4" fill="${c.dark}"/>
    <rect x="66" y="86" width="10" height="20" rx="4" fill="${c.dark}"/>
  `;
}

function drawSweet(c) {
  return drawChibi({ ...c, skin: c.skin });
}

function drawGrill(c) {
  return drawChef(c);
}

function drawHarvest(c) {
  return drawFarm(c);
}

function drawSpice(c) {
  return drawChef(c);
}

function drawFresh(c) {
  return drawFarm(c);
}

function drawSpa(c) {
  return drawPerson(c, "#99f6e4", "#14b8a6");
}

function drawSerum(c) {
  return `
    <rect x="54" y="32" width="20" height="50" rx="8" fill="${c.white}" stroke="#2563eb" stroke-width="2"/>
    <rect x="58" y="48" width="12" height="20" rx="4" fill="#93c5fd"/>
    <rect x="50" y="82" width="12" height="24" rx="4" fill="#14b8a6"/>
    <rect x="66" y="82" width="12" height="24" rx="4" fill="#14b8a6"/>
  `;
}

function drawBloom(c) {
  return drawPerson(c, "#fbcfe8", "#ec4899");
}

function drawCare(c) {
  return drawSpa(c);
}

function drawMint(c) {
  return drawPerson(c, "#6ee7b7", "#10b981");
}

function drawPearl(c) {
  return drawPerson(c, "#ffe4e6", "#fda4af");
}

function drawLeaf(c) {
  return drawPerson(c, "#a7f3d0", "#059669");
}

function drawGlowBeauty(c) {
  return drawPerson(c, "#ddd6fe", "#7c3aed");
}

function drawZen(c) {
  return drawPerson(c, "#e2e8f0", "#64748b");
}

function drawRadiance(c) {
  return drawPerson(c, "#fde68a", "#f59e0b");
}

function drawPenPal(c) {
  return drawPerson(c, "#bfdbfe", "#1e40af");
}

function drawBookworm(c) {
  return `
    <ellipse cx="64" cy="38" rx="15" ry="17" fill="${c.skin}"/>
    <rect x="44" y="56" width="18" height="26" rx="3" fill="#7c2d12"/>
    <rect x="66" y="56" width="18" height="26" rx="3" fill="#92400e"/>
    <path d="M62 56 V82" stroke="${c.white}" stroke-width="2"/>
    <rect x="50" y="86" width="12" height="24" rx="4" fill="#431407"/>
    <rect x="66" y="86" width="12" height="24" rx="4" fill="#431407"/>
  `;
}

function drawDeskPal(c) {
  return `
    <rect x="32" y="72" width="64" height="14" rx="4" fill="#475569"/>
    <rect x="44" y="52" width="40" height="24" rx="3" fill="#334155"/>
    <rect x="48" y="56" width="32" height="16" rx="2" fill="${c.primary}"/>
    <ellipse cx="64" cy="38" rx="12" ry="14" fill="${c.skin}"/>
    <rect x="50" y="86" width="10" height="20" rx="3" fill="${c.dark}"/>
    <rect x="68" y="86" width="10" height="20" rx="3" fill="${c.dark}"/>
  `;
}

function drawPlanner(c) {
  return drawBookworm(c);
}

function drawArchive(c) {
  return drawBookworm(c);
}

function drawPencilPal(c) {
  return `
    <path d="M48 108 L72 40" stroke="#eab308" stroke-width="10" stroke-linecap="round"/>
    <circle cx="74" cy="36" r="7" fill="#fca5a5"/>
    <ellipse cx="64" cy="88" rx="14" ry="16" fill="${c.skin}"/>
  `;
}

function drawFolderPal(c) {
  return `
    <path d="M36 52 H56 L64 60 H92 V96 H36 Z" fill="#0284c7"/>
    <ellipse cx="64" cy="44" rx="12" ry="13" fill="${c.skin}"/>
    <rect x="50" y="96" width="10" height="18" rx="3" fill="${c.dark}"/>
    <rect x="68" y="96" width="10" height="18" rx="3" fill="${c.dark}"/>
  `;
}

function drawInkPal(c) {
  return drawPenPal(c);
}

function drawNotePal(c) {
  return drawPlanner(c);
}

function drawStampPal(c) {
  return drawFolderPal(c);
}

function buildSvg(entry) {
  const content = entry.draw(COLORS);
  return wrapCharacter(content);
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

const manifestSource = `/* eslint-disable */
// Generated by scripts/generate-assistant-avatars.mjs — do not edit manually.

import type { StoreRubro } from "@/src/config/categories";

export type AssistantAvatarAnimationKind = ${JSON.stringify(ANIMATIONS)}[number];

export type AssistantAvatarRubro = StoreRubro;

export interface AssistantAvatarPresetManifestEntry {
  id: string;
  label: string;
  rubro: AssistantAvatarRubro;
  imagePath: string;
  animation: AssistantAvatarAnimationKind;
}

export const ASSISTANT_AVATAR_RUBRO_LABELS: Record<AssistantAvatarRubro, string> = ${JSON.stringify(RUBRO_LABELS, null, 2)} as Record<AssistantAvatarRubro, string>;

export const ASSISTANT_AVATAR_PRESET_MANIFEST: AssistantAvatarPresetManifestEntry[] = ${JSON.stringify(presets, null, 2)};
`;

fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
fs.writeFileSync(MANIFEST_PATH, manifestSource);

console.log(`Created ${presets.length} character avatars (no general rubro).`);
