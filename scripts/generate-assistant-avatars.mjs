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
  coleccionables: "Cómics y Anime",
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
  { slug: "saiyan", label: "Guerrero Saiyan", animation: "pulse", draw: drawSaiyan },
  { slug: "ninja", label: "Ninja Shadow", animation: "bob", draw: drawNinja },
  { slug: "pirate", label: "Capitán Aventura", animation: "wave", draw: drawPirate },
  { slug: "hero", label: "Súper Héroe", animation: "float", draw: drawComicHero },
  { slug: "mecha", label: "Mecha Pilot", animation: "bob", draw: drawMecha },
  { slug: "chibi", label: "Chibi Kawaii", animation: "float", draw: drawChibi },
  { slug: "dragon", label: "Dragón Legendario", animation: "pulse", draw: drawDragon },
  { slug: "comic", label: "Comic Boom", animation: "wave", draw: drawComic },
  { slug: "helmet", label: "Casco Heroico", animation: "glow", draw: drawHeroHelmet },
  { slug: "wizard", label: "Mago Arcano", animation: "glow", draw: drawWizard },
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
  { slug: "toro", label: "Toro Emblema", animation: "pulse", draw: drawToro },
  { slug: "vaca", label: "Vaca Amigable", animation: "bob", draw: drawVaca },
  { slug: "cabra", label: "Cabra Campestre", animation: "wave", draw: drawCabra },
  { slug: "burger", label: "Burger Premium", animation: "float", draw: drawBurger },
  { slug: "helado", label: "Cono Kawaii", animation: "glow", draw: drawHelado },
  { slug: "pizza", label: "Pizza Animada", animation: "bob", draw: drawPizza },
  { slug: "chef", label: "Chef Maestro", animation: "wave", draw: drawChef },
  { slug: "barista", label: "Barista Pro", animation: "glow", draw: drawBarista },
  { slug: "uvas", label: "Racimo Premium", animation: "float", draw: drawUvas },
  { slug: "palta", label: "Palta Sonriente", animation: "pulse", draw: drawPalta },
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

function wrapCharacter(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 148" role="img" aria-hidden="true">${content}</svg>`;
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

function drawSaiyan(c) {
  return `
    <path d="M38 36 L44 18 L52 30 L64 12 L76 30 L84 18 L90 36 L82 28 L64 22 L46 28 Z" fill="#facc15"/>
    <path d="M42 34 L64 26 L86 34 L64 30 Z" fill="#fde047"/>
    <ellipse cx="64" cy="44" rx="16" ry="17" fill="${c.skin}"/>
    <ellipse cx="58" cy="42" rx="3.5" ry="4" fill="${c.white}"/>
    <ellipse cx="70" cy="42" rx="3.5" ry="4" fill="${c.white}"/>
    <circle cx="58" cy="43" r="2" fill="#1e293b"/>
    <circle cx="70" cy="43" r="2" fill="#1e293b"/>
    <path d="M56 50 Q64 54 72 50" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round"/>
    <rect x="44" y="62" width="40" height="34" rx="8" fill="#ea580c"/>
    <path d="M44 72 H84" stroke="#c2410c" stroke-width="2"/>
    <rect x="54" y="66" width="20" height="6" rx="2" fill="#2563eb"/>
    <rect x="36" y="68" width="10" height="24" rx="4" fill="#ea580c"/>
    <rect x="82" y="68" width="10" height="24" rx="4" fill="#ea580c"/>
    <rect x="48" y="96" width="14" height="24" rx="5" fill="#1e3a8a"/>
    <rect x="66" y="96" width="14" height="24" rx="5" fill="#1e3a8a"/>
    <path d="M28 58 Q20 48 24 38" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
    <path d="M100 58 Q108 48 104 38" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
    <ellipse cx="64" cy="108" rx="20" ry="6" fill="#fbbf24" opacity="0.25"/>
  `;
}

function drawNinja(c) {
  return `
    <ellipse cx="64" cy="38" rx="15" ry="16" fill="#1e293b"/>
    <rect x="48" y="34" width="32" height="10" rx="4" fill="#0f172a"/>
    <rect x="50" y="36" width="10" height="4" rx="1" fill="${c.white}"/>
    <rect x="68" y="36" width="10" height="4" rx="1" fill="${c.white}"/>
    <rect x="44" y="28" width="40" height="6" rx="2" fill="#dc2626"/>
    <circle cx="64" cy="31" r="4" fill="#f8fafc"/>
    <rect x="46" y="54" width="36" height="32" rx="8" fill="#0f172a"/>
    <path d="M46 62 H82" stroke="#334155" stroke-width="2"/>
    <rect x="34" y="60" width="12" height="8" rx="2" fill="#64748b"/>
    <rect x="82" y="60" width="12" height="8" rx="2" fill="#64748b"/>
    <path d="M28 68 L38 64" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
    <path d="M100 68 L90 64" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
    <circle cx="26" cy="70" r="4" fill="#64748b"/>
    <circle cx="102" cy="70" r="4" fill="#64748b"/>
    <rect x="50" y="86" width="12" height="26" rx="4" fill="#1e293b"/>
    <rect x="66" y="86" width="12" height="26" rx="4" fill="#1e293b"/>
    <path d="M88 48 L108 38 L106 44 L90 52 Z" fill="#475569"/>
    <rect x="104" y="34" width="4" height="12" rx="1" fill="#334155"/>
  `;
}

function drawPirate(c) {
  return `
    <ellipse cx="64" cy="34" rx="28" ry="8" fill="#fbbf24"/>
    <ellipse cx="64" cy="32" rx="24" ry="6" fill="#fcd34d"/>
    <rect x="40" y="32" width="48" height="4" rx="2" fill="#d97706"/>
    <ellipse cx="64" cy="46" rx="14" ry="15" fill="${c.skin}"/>
    <path d="M52 44 Q64 38 76 44" fill="none" stroke="#1e293b" stroke-width="2"/>
    <ellipse cx="58" cy="46" rx="3" ry="3.5" fill="${c.white}"/>
    <ellipse cx="70" cy="46" rx="3" ry="3.5" fill="${c.white}"/>
    <circle cx="58" cy="47" r="1.8" fill="${c.dark}"/>
    <circle cx="70" cy="47" r="1.8" fill="${c.dark}"/>
    <path d="M58 54 Q64 58 70 54" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round"/>
    <path d="M74 48 Q82 44 84 52" fill="none" stroke="${c.skin}" stroke-width="3" stroke-linecap="round"/>
    <rect x="46" y="62" width="36" height="30" rx="8" fill="#dc2626"/>
    <rect x="50" y="66" width="28" height="6" rx="2" fill="#991b1b"/>
    <rect x="38" y="66" width="10" height="22" rx="4" fill="${c.skin}"/>
    <rect x="80" y="66" width="10" height="22" rx="4" fill="${c.skin}"/>
    <rect x="50" y="92" width="12" height="24" rx="4" fill="#1e293b"/>
    <rect x="66" y="92" width="12" height="24" rx="4" fill="#1e293b"/>
    <path d="M84 72 L104 82 L100 86 L82 76 Z" fill="#64748b"/>
    <rect x="102" y="78" width="6" height="4" rx="1" fill="#475569"/>
  `;
}

function drawComicHero(c) {
  return `
    <path d="M64 18 L72 38 L94 36 L78 52 L84 74 L64 62 L44 74 L50 52 L34 36 L56 38 Z" fill="#dc2626"/>
    <path d="M64 24 L68 38 L80 36 L70 48 L74 62 L64 54 L54 62 L58 48 L48 36 L60 38 Z" fill="#ef4444"/>
    <ellipse cx="64" cy="42" rx="13" ry="14" fill="${c.skin}"/>
    <path d="M52 38 Q64 32 76 38 L74 44 Q64 40 54 44 Z" fill="#1e3a8a"/>
    <ellipse cx="58" cy="42" rx="3" ry="3.5" fill="${c.white}"/>
    <ellipse cx="70" cy="42" rx="3" ry="3.5" fill="${c.white}"/>
    <circle cx="58" cy="43" r="1.8" fill="${c.dark}"/>
    <circle cx="70" cy="43" r="1.8" fill="${c.dark}"/>
    <path d="M58 50 Q64 54 70 50" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round"/>
    <rect x="48" y="56" width="32" height="32" rx="8" fill="#2563eb"/>
    <path d="M58 64 L64 72 L70 64 L64 76 Z" fill="#fbbf24"/>
    <rect x="40" y="60" width="10" height="24" rx="4" fill="#2563eb"/>
    <rect x="78" y="60" width="10" height="24" rx="4" fill="#2563eb"/>
    <rect x="50" y="88" width="12" height="26" rx="4" fill="#dc2626"/>
    <rect x="66" y="88" width="12" height="26" rx="4" fill="#dc2626"/>
    <rect x="46" y="110" width="16" height="6" rx="3" fill="${c.dark}"/>
    <rect x="66" y="110" width="16" height="6" rx="3" fill="${c.dark}"/>
  `;
}

function drawMecha(c) {
  return `
    <path d="M48 28 Q64 18 80 28 L78 40 Q64 34 50 40 Z" fill="#64748b"/>
    <rect x="46" y="38" width="36" height="22" rx="8" fill="#475569"/>
    <rect x="52" y="44" width="10" height="8" rx="2" fill="#22d3ee"/>
    <rect x="66" y="44" width="10" height="8" rx="2" fill="#22d3ee"/>
    <rect x="54" y="46" width="6" height="4" rx="1" fill="#0e7490"/>
    <rect x="68" y="46" width="6" height="4" rx="1" fill="#0e7490"/>
    <rect x="58" y="56" width="12" height="4" rx="2" fill="#334155"/>
    <rect x="42" y="60" width="44" height="36" rx="10" fill="#64748b"/>
    <rect x="48" y="66" width="32" height="8" rx="2" fill="#94a3b8"/>
    <circle cx="64" cy="82" r="6" fill="#22d3ee"/>
    <rect x="28" y="64" width="14" height="28" rx="6" fill="#475569"/>
    <rect x="86" y="64" width="14" height="28" rx="6" fill="#475569"/>
    <rect x="22" y="88" width="18" height="12" rx="5" fill="#334155"/>
    <rect x="88" y="88" width="18" height="12" rx="5" fill="#334155"/>
    <rect x="50" y="96" width="12" height="24" rx="5" fill="#475569"/>
    <rect x="66" y="96" width="12" height="24" rx="5" fill="#475569"/>
    <rect x="46" y="116" width="16" height="8" rx="4" fill="#1e293b"/>
    <rect x="66" y="116" width="16" height="8" rx="4" fill="#1e293b"/>
    <path d="M64 28 L64 22" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
    <circle cx="64" cy="20" r="3" fill="#ef4444"/>
  `;
}

function drawChibi(c) {
  return `
    <ellipse cx="64" cy="50" rx="26" ry="28" fill="#fbcfe8"/>
    <ellipse cx="54" cy="46" rx="8" ry="9" fill="${c.white}"/>
    <ellipse cx="74" cy="46" rx="8" ry="9" fill="${c.white}"/>
    <circle cx="54" cy="48" r="4" fill="#1e293b"/>
    <circle cx="74" cy="48" r="4" fill="#1e293b"/>
    <circle cx="56" cy="46" r="2" fill="${c.white}"/>
    <circle cx="76" cy="46" r="2" fill="${c.white}"/>
    <path d="M56 62 Q64 70 72 62" fill="none" stroke="#e11d48" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="64" cy="88" rx="18" ry="14" fill="#f472b6"/>
    <rect x="50" y="98" width="10" height="16" rx="4" fill="#ec4899"/>
    <rect x="68" y="98" width="10" height="16" rx="4" fill="#ec4899"/>
    <path d="M38 52 L28 44 M90 52 L100 44" stroke="#f472b6" stroke-width="3" stroke-linecap="round"/>
    <circle cx="26" cy="42" r="4" fill="#fbcfe8"/>
    <circle cx="102" cy="42" r="4" fill="#fbcfe8"/>
    <path d="M58 28 L64 18 L70 28" fill="#f472b6"/>
    <circle cx="64" cy="16" r="3" fill="#fde68a"/>
  `;
}

function drawDragon(c) {
  return `
    <path d="M32 68 Q40 32 64 24 Q88 32 96 68 Q88 88 64 96 Q40 88 32 68 Z" fill="#059669"/>
    <path d="M38 66 Q44 38 64 32 Q84 38 90 66 Q84 82 64 88 Q44 82 38 66 Z" fill="#10b981"/>
    <ellipse cx="52" cy="56" rx="6" ry="7" fill="${c.white}"/>
    <ellipse cx="76" cy="56" rx="6" ry="7" fill="${c.white}"/>
    <circle cx="52" cy="58" r="3" fill="${c.dark}"/>
    <circle cx="76" cy="58" r="3" fill="${c.dark}"/>
    <path d="M58 68 Q64 74 70 68" fill="none" stroke="#047857" stroke-width="2" stroke-linecap="round"/>
    <path d="M48 48 Q40 40 36 32" stroke="#047857" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M80 48 Q88 40 92 32" stroke="#047857" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M96 60 Q108 52 112 44" stroke="#059669" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M28 64 Q18 56 14 48" stroke="#059669" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M64 96 L58 112 M64 96 L70 112" stroke="#047857" stroke-width="4" stroke-linecap="round"/>
    <path d="M64 32 Q64 18 64 12" stroke="#059669" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="64" cy="10" rx="4" ry="3" fill="#fde68a"/>
  `;
}

function drawComic(c) {
  return `
    <path d="M36 32 L92 32 Q96 32 96 36 V96 Q96 100 92 100 H36 Q32 100 32 96 V36 Q32 32 36 32 Z" fill="${c.white}" stroke="${c.dark}" stroke-width="3"/>
    <path d="M40 36 H88 V92 H40 Z" fill="#fef08a"/>
    <path d="M44 48 H80 M44 60 H72 M44 72 H64" stroke="${c.dark}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M88 24 L104 12 L108 28 L96 36 Z" fill="#ef4444"/>
    <text x="92" y="26" font-size="11" font-weight="bold" fill="#fef08a" font-family="Arial,sans-serif">POW</text>
    <rect x="48" y="104" width="10" height="14" rx="3" fill="${c.dark}"/>
    <rect x="70" y="104" width="10" height="14" rx="3" fill="${c.dark}"/>
    <circle cx="72" cy="52" r="8" fill="#2563eb"/>
    <path d="M68 52 H76 M72 48 V56" stroke="${c.white}" stroke-width="2" stroke-linecap="round"/>
  `;
}

function drawHeroHelmet(c) {
  return `
    <path d="M36 52 Q36 28 64 22 Q92 28 92 52 Q92 72 84 82 Q64 96 44 82 Q36 72 36 52 Z" fill="#dc2626"/>
    <path d="M40 52 Q40 32 64 28 Q88 32 88 52 Q88 68 82 76 Q64 88 46 76 Q40 68 40 52 Z" fill="#ef4444"/>
    <path d="M48 52 Q48 38 64 34 Q80 38 80 52 Q80 62 76 68 Q64 78 52 68 Q48 62 48 52 Z" fill="#1e3a8a"/>
    <path d="M52 52 Q52 42 64 40 Q76 42 76 52 Q76 58 72 62 Q64 68 56 62 Q52 58 52 52 Z" fill="#2563eb"/>
    <rect x="52" y="48" width="10" height="8" rx="2" fill="#93c5fd"/>
    <rect x="66" y="48" width="10" height="8" rx="2" fill="#93c5fd"/>
    <path d="M58 48 L64 42 L70 48" fill="#334155"/>
    <path d="M44 58 Q64 66 84 58" fill="none" stroke="#991b1b" stroke-width="3"/>
    <path d="M64 22 L64 14" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
    <path d="M58 14 L64 8 L70 14" fill="#fbbf24"/>
    <path d="M28 60 L20 68 M100 60 L108 68" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="18" cy="70" rx="5" ry="3" fill="#991b1b"/>
    <ellipse cx="110" cy="70" rx="5" ry="3" fill="#991b1b"/>
    <path d="M52 78 Q64 86 76 78 L74 92 Q64 100 54 92 Z" fill="#334155"/>
  `;
}

function drawWizard(c) {
  return `
    <path d="M44 48 Q64 8 84 48 L80 56 H48 Z" fill="#7c3aed"/>
    <path d="M50 48 Q64 20 78 48" fill="none" stroke="#a78bfa" stroke-width="2"/>
    <circle cx="64" cy="18" r="4" fill="#fde68a"/>
    <ellipse cx="64" cy="52" rx="14" ry="15" fill="${c.skin}"/>
    <ellipse cx="58" cy="50" rx="3" ry="3.5" fill="${c.white}"/>
    <ellipse cx="70" cy="50" rx="3" ry="3.5" fill="${c.white}"/>
    <circle cx="58" cy="51" r="1.8" fill="${c.dark}"/>
    <circle cx="70" cy="51" r="1.8" fill="${c.dark}"/>
    <path d="M58 58 Q64 62 70 58" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round"/>
    <rect x="48" y="66" width="32" height="32" rx="8" fill="#4c1d95"/>
    <path d="M48 74 H80" stroke="#6d28d9" stroke-width="2"/>
    <rect x="24" y="72" width="36" height="6" rx="2" fill="#a78bfa" transform="rotate(-20 42 75)"/>
    <circle cx="20" cy="68" r="6" fill="#fde68a"/>
    <rect x="50" y="98" width="12" height="22" rx="4" fill="#312e81"/>
    <rect x="66" y="98" width="12" height="22" rx="4" fill="#312e81"/>
    <path d="M18 68 L18 48" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>
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

function drawToro(c) {
  return `
    <path d="M28 58 Q24 44 34 36 Q44 28 64 26 Q84 28 94 36 Q104 44 100 58 Q98 72 88 80 Q78 88 64 90 Q50 88 40 80 Q30 72 28 58 Z" fill="#7c2d12"/>
    <path d="M32 52 Q36 38 48 34 Q58 30 64 30 Q70 30 80 34 Q92 38 96 52 Q94 64 86 70 Q76 76 64 78 Q52 76 42 70 Q34 64 32 52 Z" fill="#991b1b"/>
    <path d="M18 42 Q12 28 22 22 Q30 18 36 26 Q32 34 28 42 Z" fill="#78350f"/>
    <path d="M110 42 Q116 28 106 22 Q98 18 92 26 Q96 34 100 42 Z" fill="#78350f"/>
    <ellipse cx="64" cy="58" rx="18" ry="14" fill="#b45309"/>
    <ellipse cx="64" cy="62" rx="10" ry="7" fill="#fcd34d"/>
    <circle cx="58" cy="54" r="2.5" fill="${c.dark}"/>
    <circle cx="70" cy="54" r="2.5" fill="${c.dark}"/>
    <path d="M58 66 Q64 70 70 66" fill="none" stroke="${c.dark}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="64" cy="64" r="3" fill="none" stroke="#92400e" stroke-width="2"/>
    <path d="M64 68 V74" stroke="#92400e" stroke-width="2" stroke-linecap="round"/>
    <circle cx="64" cy="76" r="2" fill="#ca8a04"/>
    <path d="M48 78 Q40 88 38 98" fill="none" stroke="#7c2d12" stroke-width="4" stroke-linecap="round"/>
    <path d="M80 78 Q88 88 90 98" fill="none" stroke="#7c2d12" stroke-width="4" stroke-linecap="round"/>
    <path d="M52 88 Q64 94 76 88" fill="none" stroke="#451a03" stroke-width="3"/>
  `;
}

function drawVaca(c) {
  return `
    <ellipse cx="64" cy="52" rx="26" ry="22" fill="${c.white}"/>
    <ellipse cx="52" cy="48" rx="8" ry="10" fill="#1e293b"/>
    <ellipse cx="76" cy="56" rx="7" ry="9" fill="#1e293b"/>
    <ellipse cx="64" cy="58" rx="6" ry="5" fill="#1e293b"/>
    <ellipse cx="64" cy="38" rx="16" ry="14" fill="${c.white}"/>
    <ellipse cx="58" cy="36" rx="4" ry="5" fill="${c.white}"/>
    <ellipse cx="70" cy="36" rx="4" ry="5" fill="${c.white}"/>
    <circle cx="58" cy="37" r="2" fill="${c.dark}"/>
    <circle cx="70" cy="37" r="2" fill="${c.dark}"/>
    <ellipse cx="64" cy="44" rx="8" ry="6" fill="#fda4af"/>
    <circle cx="61" cy="43" r="1.5" fill="#be123c"/>
    <circle cx="67" cy="43" r="1.5" fill="#be123c"/>
    <path d="M48 30 Q44 22 50 18 Q56 16 58 24" fill="#f8fafc"/>
    <path d="M80 30 Q84 22 78 18 Q72 16 70 24" fill="#f8fafc"/>
    <ellipse cx="64" cy="68" rx="10" ry="8" fill="#fecdd3"/>
    <rect x="46" y="72" width="8" height="22" rx="3" fill="#f8fafc"/>
    <rect x="58" y="72" width="8" height="22" rx="3" fill="#f8fafc"/>
    <rect x="70" y="72" width="8" height="22" rx="3" fill="#f8fafc"/>
    <rect x="82" y="72" width="8" height="22" rx="3" fill="#f8fafc"/>
    <ellipse cx="50" cy="92" rx="5" ry="3" fill="#cbd5e1"/>
    <ellipse cx="62" cy="92" rx="5" ry="3" fill="#cbd5e1"/>
    <ellipse cx="74" cy="92" rx="5" ry="3" fill="#cbd5e1"/>
    <ellipse cx="86" cy="92" rx="5" ry="3" fill="#cbd5e1"/>
    <path d="M88 52 Q98 48 102 56" fill="none" stroke="#fda4af" stroke-width="3" stroke-linecap="round"/>
  `;
}

function drawCabra(c) {
  return `
    <ellipse cx="64" cy="54" rx="22" ry="18" fill="#f5f5f4"/>
    <ellipse cx="64" cy="36" rx="14" ry="13" fill="#f5f5f4"/>
    <path d="M52 28 Q48 16 54 14 Q58 12 60 22" fill="#e7e5e4"/>
    <path d="M76 28 Q80 16 74 14 Q70 12 68 22" fill="#e7e5e4"/>
    <ellipse cx="58" cy="34" rx="3.5" ry="4" fill="${c.white}"/>
    <ellipse cx="70" cy="34" rx="3.5" ry="4" fill="${c.white}"/>
    <circle cx="58" cy="35" r="1.8" fill="${c.dark}"/>
    <circle cx="70" cy="35" r="1.8" fill="${c.dark}"/>
    <ellipse cx="64" cy="40" rx="5" ry="4" fill="#fda4af"/>
    <path d="M62 44 Q64 48 66 44" fill="none" stroke="${c.dark}" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M58 42 Q54 50 52 58" fill="none" stroke="#d6d3d1" stroke-width="4" stroke-linecap="round"/>
    <path d="M70 42 Q74 50 76 58" fill="none" stroke="#d6d3d1" stroke-width="4" stroke-linecap="round"/>
    <rect x="50" y="70" width="7" height="20" rx="3" fill="#e7e5e4"/>
    <rect x="60" y="70" width="7" height="20" rx="3" fill="#e7e5e4"/>
    <rect x="70" y="70" width="7" height="20" rx="3" fill="#e7e5e4"/>
    <rect x="80" y="70" width="7" height="20" rx="3" fill="#e7e5e4"/>
    <ellipse cx="53" cy="88" rx="4" ry="2.5" fill="#a8a29e"/>
    <ellipse cx="63" cy="88" rx="4" ry="2.5" fill="#a8a29e"/>
    <ellipse cx="73" cy="88" rx="4" ry="2.5" fill="#a8a29e"/>
    <ellipse cx="83" cy="88" rx="4" ry="2.5" fill="#a8a29e"/>
    <path d="M64 48 Q68 54 64 58 Q60 54 64 48" fill="#d6d3d1"/>
  `;
}

function drawBurger(c) {
  return `
    <ellipse cx="64" cy="88" rx="30" ry="8" fill="#d97706"/>
    <path d="M34 88 Q64 82 94 88" fill="none" stroke="#b45309" stroke-width="2"/>
    <rect x="36" y="78" width="56" height="6" rx="2" fill="#22c55e"/>
    <rect x="36" y="72" width="56" height="5" rx="2" fill="#fbbf24"/>
    <ellipse cx="64" cy="70" rx="28" ry="6" fill="#78350f"/>
    <rect x="36" y="64" width="56" height="5" rx="2" fill="#ef4444"/>
    <rect x="36" y="58" width="56" height="5" rx="2" fill="#fbbf24"/>
    <ellipse cx="64" cy="52" rx="32" ry="10" fill="#fcd34d"/>
    <circle cx="48" cy="50" r="2" fill="#fef3c7"/>
    <circle cx="58" cy="48" r="2" fill="#fef3c7"/>
    <circle cx="70" cy="49" r="2" fill="#fef3c7"/>
    <circle cx="80" cy="51" r="2" fill="#fef3c7"/>
    <ellipse cx="54" cy="54" rx="3" ry="3.5" fill="${c.white}"/>
    <ellipse cx="74" cy="54" rx="3" ry="3.5" fill="${c.white}"/>
    <circle cx="54" cy="55" r="1.5" fill="${c.dark}"/>
    <circle cx="74" cy="55" r="1.5" fill="${c.dark}"/>
    <path d="M58 60 Q64 64 70 60" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round"/>
    <path d="M28 70 Q22 58 30 52" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    <path d="M100 68 Q106 56 98 50" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  `;
}

function drawHelado(c) {
  return `
    <path d="M48 88 L64 118 L80 88 Z" fill="#d97706"/>
    <path d="M52 88 L64 110 L76 88" fill="none" stroke="#b45309" stroke-width="1.5"/>
    <path d="M54 84 L64 100 L74 84" fill="none" stroke="#b45309" stroke-width="1.5"/>
    <ellipse cx="64" cy="78" rx="22" ry="12" fill="#fbcfe8"/>
    <ellipse cx="64" cy="64" rx="20" ry="11" fill="#fef08a"/>
    <ellipse cx="64" cy="50" rx="18" ry="10" fill="#fda4af"/>
    <circle cx="64" cy="38" r="5" fill="#ef4444"/>
    <path d="M58 36 L64 28 L70 36" fill="#22c55e"/>
    <ellipse cx="58" cy="48" rx="3" ry="3.5" fill="${c.white}"/>
    <ellipse cx="70" cy="48" rx="3" ry="3.5" fill="${c.white}"/>
    <circle cx="58" cy="49" r="1.5" fill="${c.dark}"/>
    <circle cx="70" cy="49" r="1.5" fill="${c.dark}"/>
    <path d="M60 56 Q64 60 68 56" fill="none" stroke="#be123c" stroke-width="2" stroke-linecap="round"/>
    <circle cx="52" cy="58" r="3" fill="#fbcfe8" opacity="0.8"/>
    <circle cx="76" cy="62" r="2.5" fill="#fef08a" opacity="0.8"/>
  `;
}

function drawPizza(c) {
  return `
    <path d="M64 24 L98 96 Q64 104 30 96 Z" fill="#fbbf24"/>
    <path d="M64 32 L90 92 Q64 98 38 92 Z" fill="#fcd34d"/>
    <path d="M64 40 L82 88 Q64 92 46 88 Z" fill="#ef4444"/>
    <circle cx="58" cy="62" r="5" fill="#dc2626"/>
    <circle cx="72" cy="72" r="4.5" fill="#dc2626"/>
    <circle cx="52" cy="78" r="4" fill="#dc2626"/>
    <path d="M64 48 Q68 56 64 62 Q60 56 64 48" fill="#fde68a"/>
    <ellipse cx="58" cy="54" rx="3" ry="3.5" fill="${c.white}"/>
    <ellipse cx="70" cy="56" rx="3" ry="3.5" fill="${c.white}"/>
    <circle cx="58" cy="55" r="1.5" fill="${c.dark}"/>
    <circle cx="70" cy="57" r="1.5" fill="${c.dark}"/>
    <path d="M60 64 Q64 68 68 64" fill="none" stroke="${c.dark}" stroke-width="2" stroke-linecap="round"/>
    <rect x="52" y="96" width="8" height="14" rx="3" fill="#fbbf24"/>
    <rect x="68" y="96" width="8" height="14" rx="3" fill="#fbbf24"/>
    <ellipse cx="56" cy="108" rx="5" ry="3" fill="#d97706"/>
    <ellipse cx="72" cy="108" rx="5" ry="3" fill="#d97706"/>
    <path d="M64 24 L64 18" stroke="#22c55e" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="64" cy="16" rx="6" ry="3" fill="#22c55e"/>
  `;
}

function drawChef(c) {
  return `
    <ellipse cx="64" cy="46" rx="16" ry="17" fill="${c.skin}"/>
    <path d="M46 38 Q64 8 82 38 L80 44 H48 Z" fill="${c.white}"/>
    <path d="M50 38 Q64 18 78 38" fill="none" stroke="#e2e8f0" stroke-width="2"/>
    <path d="M52 44 Q64 36 76 44" fill="none" stroke="#e2e8f0" stroke-width="1.5"/>
    <ellipse cx="58" cy="44" rx="3" ry="3.5" fill="${c.white}"/>
    <ellipse cx="70" cy="44" rx="3" ry="3.5" fill="${c.white}"/>
    <circle cx="58" cy="45" r="1.8" fill="${c.dark}"/>
    <circle cx="70" cy="45" r="1.8" fill="${c.dark}"/>
    <path d="M56 52 Q64 56 72 52" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round"/>
    <path d="M58 50 Q64 48 70 50" fill="#b45309"/>
    <rect x="44" y="64" width="40" height="36" rx="8" fill="${c.white}" stroke="#e2e8f0" stroke-width="1.5"/>
    <circle cx="54" cy="74" r="2" fill="#334155"/>
    <circle cx="64" cy="74" r="2" fill="#334155"/>
    <circle cx="74" cy="74" r="2" fill="#334155"/>
    <circle cx="54" cy="84" r="2" fill="#334155"/>
    <circle cx="64" cy="84" r="2" fill="#334155"/>
    <circle cx="74" cy="84" r="2" fill="#334155"/>
    <rect x="36" y="68" width="10" height="26" rx="4" fill="${c.white}"/>
    <rect x="82" y="68" width="10" height="26" rx="4" fill="${c.white}"/>
    <rect x="48" y="100" width="14" height="22" rx="4" fill="#1e293b"/>
    <rect x="66" y="100" width="14" height="22" rx="4" fill="#1e293b"/>
    <path d="M88 72 L102 58 L106 62 L92 76 Z" fill="#78350f"/>
    <rect x="100" y="54" width="6" height="10" rx="2" fill="#d4d4d8"/>
  `;
}

function drawBarista(c) {
  return `
    <ellipse cx="64" cy="40" rx="15" ry="16" fill="${c.skin}"/>
    <rect x="48" y="32" width="32" height="10" rx="5" fill="#78350f"/>
    <rect x="52" y="28" width="24" height="6" rx="3" fill="#451a03"/>
    <ellipse cx="58" cy="40" rx="3" ry="3.5" fill="${c.white}"/>
    <ellipse cx="70" cy="40" rx="3" ry="3.5" fill="${c.white}"/>
    <circle cx="58" cy="41" r="1.8" fill="${c.dark}"/>
    <circle cx="70" cy="41" r="1.8" fill="${c.dark}"/>
    <path d="M58 48 Q64 52 70 48" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round"/>
    <rect x="46" y="56" width="36" height="32" rx="8" fill="#292524"/>
    <rect x="50" y="60" width="28" height="8" rx="2" fill="#fafaf9"/>
    <rect x="34" y="62" width="12" height="22" rx="4" fill="#292524"/>
    <rect x="82" y="62" width="12" height="22" rx="4" fill="#292524"/>
    <rect x="86" y="66" width="14" height="16" rx="3" fill="#fafaf9" stroke="#d6d3d1" stroke-width="1.5"/>
    <path d="M88 70 Q92 74 88 78 Q84 74 88 70" fill="none" stroke="#78350f" stroke-width="1.5"/>
    <path d="M90 72 Q94 76 90 80" fill="none" stroke="#78350f" stroke-width="1.5"/>
    <ellipse cx="90" cy="84" rx="8" ry="3" fill="#e7e5e4"/>
    <rect x="50" y="88" width="12" height="24" rx="4" fill="#44403c"/>
    <rect x="66" y="88" width="12" height="24" rx="4" fill="#44403c"/>
    <rect x="46" y="108" width="16" height="6" rx="3" fill="${c.dark}"/>
    <rect x="66" y="108" width="16" height="6" rx="3" fill="${c.dark}"/>
  `;
}

function drawUvas(c) {
  return `
    <path d="M64 22 Q68 14 64 10 Q60 14 64 22" fill="#166534"/>
    <ellipse cx="64" cy="20" rx="8" ry="4" fill="#22c55e"/>
    <circle cx="52" cy="38" r="7" fill="#7c3aed"/>
    <circle cx="64" cy="32" r="7.5" fill="#6d28d9"/>
    <circle cx="76" cy="38" r="7" fill="#7c3aed"/>
    <circle cx="46" cy="50" r="6.5" fill="#8b5cf6"/>
    <circle cx="58" cy="46" r="7" fill="#7c3aed"/>
    <circle cx="70" cy="46" r="7" fill="#7c3aed"/>
    <circle cx="82" cy="50" r="6.5" fill="#8b5cf6"/>
    <circle cx="52" cy="60" r="6.5" fill="#6d28d9"/>
    <circle cx="64" cy="56" r="7.5" fill="#5b21b6"/>
    <circle cx="76" cy="60" r="6.5" fill="#6d28d9"/>
    <circle cx="58" cy="70" r="6" fill="#7c3aed"/>
    <circle cx="70" cy="70" r="6" fill="#7c3aed"/>
    <circle cx="64" cy="80" r="6.5" fill="#6d28d9"/>
    <ellipse cx="58" cy="54" rx="2.5" ry="3" fill="${c.white}" opacity="0.9"/>
    <ellipse cx="70" cy="54" rx="2.5" ry="3" fill="${c.white}" opacity="0.9"/>
    <circle cx="58" cy="55" r="1.2" fill="${c.dark}"/>
    <circle cx="70" cy="55" r="1.2" fill="${c.dark}"/>
    <path d="M56 62 Q64 68 72 62" fill="none" stroke="${c.dark}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="52" cy="36" r="2" fill="#c4b5fd" opacity="0.6"/>
    <circle cx="76" cy="36" r="2" fill="#c4b5fd" opacity="0.6"/>
    <circle cx="64" cy="30" r="2" fill="#c4b5fd" opacity="0.6"/>
    <path d="M38 72 Q32 80 36 88" fill="none" stroke="#4ade80" stroke-width="4" stroke-linecap="round"/>
    <path d="M90 72 Q96 80 92 88" fill="none" stroke="#4ade80" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="34" cy="90" rx="4" ry="2.5" fill="#22c55e"/>
    <ellipse cx="94" cy="90" rx="4" ry="2.5" fill="#22c55e"/>
  `;
}

function drawPalta(c) {
  return `
    <path d="M40 52 Q64 28 88 52 Q92 72 84 88 Q64 108 44 88 Q36 72 40 52 Z" fill="#4ade80"/>
    <path d="M44 56 Q64 36 84 56 Q88 72 80 84 Q64 100 48 84 Q40 72 44 56 Z" fill="#22c55e"/>
    <ellipse cx="64" cy="72" rx="14" ry="16" fill="#86efac"/>
    <ellipse cx="64" cy="74" rx="10" ry="12" fill="#a16207"/>
    <ellipse cx="58" cy="62" rx="4" ry="4.5" fill="${c.white}"/>
    <ellipse cx="72" cy="62" rx="4" ry="4.5" fill="${c.white}"/>
    <circle cx="58" cy="63" r="2" fill="${c.dark}"/>
    <circle cx="72" cy="63" r="2" fill="${c.dark}"/>
    <path d="M56 72 Q64 78 72 72" fill="none" stroke="${c.dark}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M36 68 Q28 64 24 72" fill="none" stroke="#4ade80" stroke-width="5" stroke-linecap="round"/>
    <path d="M92 68 Q100 64 104 72" fill="none" stroke="#4ade80" stroke-width="5" stroke-linecap="round"/>
    <circle cx="22" cy="74" r="4" fill="#86efac"/>
    <circle cx="106" cy="74" r="4" fill="#86efac"/>
    <rect x="52" y="88" width="8" height="16" rx="3" fill="#4ade80"/>
    <rect x="68" y="88" width="8" height="16" rx="3" fill="#4ade80"/>
    <ellipse cx="56" cy="102" rx="5" ry="3" fill="#16a34a"/>
    <ellipse cx="72" cy="102" rx="5" ry="3" fill="#16a34a"/>
    <path d="M64 28 Q68 20 64 14 Q60 20 64 28" fill="#166534"/>
  `;
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
