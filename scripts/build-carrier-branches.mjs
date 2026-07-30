import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "lib", "shipping", "data");

const STATE_SLUGS = [
  ["Amazonas", "Amazonas"],
  ["Anzoategui", "Anzoátegui"],
  ["Apure", "Apure"],
  ["Aragua", "Aragua"],
  ["Barinas", "Barinas"],
  ["Bolivar", "Bolívar"],
  ["Carabobo", "Carabobo"],
  ["Cojedes", "Cojedes"],
  ["Delta_Amacuro", "Delta Amacuro"],
  ["Distrito_Capital", "Distrito Capital"],
  ["Falcon", "Falcón"],
  ["Guarico", "Guárico"],
  ["Lara", "Lara"],
  ["Miranda", "Miranda"],
  ["Monagas", "Monagas"],
  ["Merida", "Mérida"],
  ["Nueva_Esparta", "Nueva Esparta"],
  ["Portuguesa", "Portuguesa"],
  ["Sucre", "Sucre"],
  ["Trujillo", "Trujillo"],
  ["Tachira", "Táchira"],
  ["Vargas", "La Guaira"],
  ["Yaracuy", "Yaracuy"],
  ["Zulia", "Zulia"],
];

const AGENCIAS_CARRIERS = [
  { slug: "MRW", file: "mrw-branches.ve.json", key: "mrw" },
  { slug: "TEALCA", file: "tealca-branches.ve.json", key: "tealca" },
  { slug: "ZOOM", file: "zoom-branches.ve.json", key: "zoom" },
  { slug: "DOMESA", file: "domesa-branches.ve.json", key: "domesa" },
];

function decodeHtml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(name) {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ")
    .replace(/\bDe\b/g, "de")
    .replace(/\bDel\b/g, "del")
    .replace(/\bLa\b/g, "La")
    .replace(/\bLas\b/g, "Las")
    .replace(/\bLos\b/g, "Los")
    .replace(/\bEl\b/g, "El")
    .replace(/\bSan\b/g, "San")
    .replace(/\bSanta\b/g, "Santa")
    .replace(/\bCc\b/g, "C.C.")
    .replace(/\bC\.c\./g, "C.C.");
}

function normalizeKey(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/cerrada$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanAddress(a) {
  return a
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*\d+\s*$/, "")
    .replace(/\s*\.\s*$/, "")
    .trim();
}

function parseAgenciesFromHtml(html, stateLabel, cityFallback = "") {
  const branches = [];
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  // Prefer city sections with h2 + h3 agencies
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const indices = [];
  let match;
  while ((match = h2Regex.exec(cleaned)) !== null) {
    const title = decodeHtml(match[1].replace(/<[^>]+>/g, ""));
    if (!title || /rastree|agencias en|seleccione|ocultar|ver los/i.test(title))
      continue;
    indices.push({ index: match.index + match[0].length, city: title });
  }

  const sections =
    indices.length > 0
      ? indices.map((item, i) => ({
          city: titleCase(item.city),
          html: cleaned.slice(
            item.index,
            i + 1 < indices.length ? indices[i + 1].index : cleaned.length,
          ),
        }))
      : [{ city: cityFallback || stateLabel, html: cleaned }];

  for (const section of sections) {
    const agencyRegex =
      /<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|<h2|$)/gi;
    let am;
    while ((am = agencyRegex.exec(section.html)) !== null) {
      let name = decodeHtml(am[1].replace(/<[^>]+>/g, ""));
      if (!name) continue;
      const closed = /cerrada$/i.test(name);
      name = name.replace(/cerrada$/i, "").trim();
      if (closed || !name) continue;
      const plain = decodeHtml(am[2].replace(/<[^>]+>/g, " "));
      const m2 = plain.match(/Direcci[oó]n:\s*(.+?)(?:Ver en el mapa|$)/i);
      let address = m2 ? m2[1].trim() : "";
      address = cleanAddress(address);
      if (!address || address.length < 8) continue;
      branches.push({
        name: titleCase(name.replace(/\s+/g, " ").trim()),
        city: section.city || cityFallback || stateLabel,
        state: stateLabel,
        address,
      });
    }
  }
  return branches;
}

function extractCityLinks(html, carrierSlug, stateSlug) {
  const re = new RegExp(
    `href="(/Sucursales/${carrierSlug}/${stateSlug}/[^"/]+/?)"`,
    "gi",
  );
  const links = [...html.matchAll(re)].map((m) => m[1].replace(/\/$/, ""));
  // Also catch "Ver los N resultados" city pages
  return [...new Set(links)].filter(
    (href) => !href.endsWith(`/${stateSlug}`),
  );
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AlcentimoBot/1.0)" },
  });
  if (!res.ok) return { ok: false, status: res.status, text: "" };
  return { ok: true, status: res.status, text: await res.text() };
}

async function scrapeAgenciasCarrier(carrierSlug) {
  const all = [];
  const seen = new Set();

  for (const [slug, label] of STATE_SLUGS) {
    const stateUrl = `https://www.agencias.com.ve/Sucursales/${carrierSlug}/${slug}/`;
    process.stdout.write(`  ${carrierSlug}/${slug}... `);
    const statePage = await fetchText(stateUrl);
    if (!statePage.ok) {
      console.log(`HTTP ${statePage.status}`);
      continue;
    }

    let parsed = parseAgenciesFromHtml(statePage.text, label);
    const cityLinks = extractCityLinks(statePage.text, carrierSlug, slug);

    // If few agencies but many city links / "Ver los N", expand city pages
    const needsCityCrawl =
      cityLinks.length > 0 &&
      (parsed.length < 8 || /Ver los\s+<b>\d+<\/b>/i.test(statePage.text));

    if (needsCityCrawl) {
      for (const cityHref of cityLinks) {
        const cityName = decodeURIComponent(
          cityHref.split("/").pop().replace(/_/g, " "),
        );
        const cityUrl = `https://www.agencias.com.ve${cityHref}/`;
        const cityPage = await fetchText(cityUrl);
        if (!cityPage.ok) continue;
        const cityParsed = parseAgenciesFromHtml(
          cityPage.text,
          label,
          titleCase(cityName),
        );
        parsed.push(...cityParsed);
        await new Promise((r) => setTimeout(r, 80));
      }
    }

    // Dedup within state scrape
    let added = 0;
    for (const b of parsed) {
      const k = `${normalizeKey(b.state)}|${normalizeKey(b.city)}|${normalizeKey(b.name)}|${normalizeKey(b.address).slice(0, 40)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      all.push(b);
      added++;
    }
    console.log(`${added} (cities ${cityLinks.length})`);
    await new Promise((r) => setTimeout(r, 100));
  }
  return all;
}

function parseTealcaUsa(text) {
  const STATE_MAP = {
    "GRAN CARACAS": "Distrito Capital",
    ANZOÁTEGUI: "Anzoátegui",
    ANZOATEGUI: "Anzoátegui",
    APURE: "Apure",
    ARAGUA: "Aragua",
    BARINAS: "Barinas",
    BOLÍVAR: "Bolívar",
    BOLIVAR: "Bolívar",
    CARABOBO: "Carabobo",
    COJEDES: "Cojedes",
    "DELTA AMACURO": "Delta Amacuro",
    FALCÓN: "Falcón",
    FALCON: "Falcón",
    GUÁRICO: "Guárico",
    GUARICO: "Guárico",
    "LA GUAIRA": "La Guaira",
    VARGAS: "La Guaira",
    LARA: "Lara",
    MÉRIDA: "Mérida",
    MERIDA: "Mérida",
    MIRANDA: "Miranda",
    MONAGAS: "Monagas",
    "NUEVA ESPARTA": "Nueva Esparta",
    PORTUGUESA: "Portuguesa",
    SUCRE: "Sucre",
    TÁCHIRA: "Táchira",
    TACHIRA: "Táchira",
    TRUJILLO: "Trujillo",
    YARACUY: "Yaracuy",
    ZULIA: "Zulia",
    "OFICINAS COMERCIALES": null,
  };

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let state = "Distrito Capital";
  const branches = [];

  for (const line of lines) {
    const heading = line.replace(/^#+/, "").trim().toUpperCase();
    if (STATE_MAP[heading] !== undefined) {
      state = STATE_MAP[heading];
      continue;
    }
    if (!state) continue;

    const m = line.match(
      /^(.+?)\s*\(([^)]+)\):\s*(.+?)(?:\s*Tel[eé]fonos?:\s*.+)?$/i,
    );
    if (!m) continue;
    const rawName = m[1].trim();
    const code = m[2].trim();
    let address = m[3]
      .replace(/\s*Tel[eé]fonos?:.*$/i, "")
      .replace(/\s*WhatsApp.*$/i, "")
      .trim();
    if (!address || address.length < 8) continue;

    let city = titleCase(rawName.split("–")[0].split("-")[0].trim());
    let st = state;
    if (state === "Distrito Capital") {
      if (/guatire/i.test(rawName)) {
        city = "Guatire";
        st = "Miranda";
      } else if (/guarenas/i.test(rawName)) {
        city = "Guarenas";
        st = "Miranda";
      } else if (/los teques/i.test(rawName)) {
        city = "Los Teques";
        st = "Miranda";
      } else if (/san antonio de los altos/i.test(rawName)) {
        city = "San Antonio de los Altos";
        st = "Miranda";
      } else if (/charallave/i.test(rawName)) {
        city = "Charallave";
        st = "Miranda";
      } else {
        city = "Caracas";
      }
    }

    branches.push({
      code,
      name: titleCase(rawName),
      city,
      state: st,
      address: cleanAddress(address),
    });
  }
  return branches;
}

function normalizeLibertyState(s) {
  const map = {
    anzoategui: "Anzoátegui",
    bolivar: "Bolívar",
    falcon: "Falcón",
    "gran caracas": "Distrito Capital",
    guarico: "Guárico",
    merida: "Mérida",
    tachira: "Táchira",
    vargas: "La Guaira",
  };
  const k = normalizeKey(s);
  return map[k] || titleCase(s);
}

async function scrapeLiberty() {
  const page = await fetchText("https://libertyexpress.com/es-ve/sucursales/");
  if (!page.ok) throw new Error(`Liberty HTTP ${page.status}`);
  const html = page.text;

  // Detail cards: <div class="kon sucursal" id="slug" state="X"> ... <span class="city"> ... <h5>Name</h5>
  const cardRe =
    /<div\s+class="kon sucursal"\s+id="([^"]+)"\s+state="([^"]+)"[\s\S]*?<article class="tarjeta"[^>]*>([\s\S]*?)<\/article>/gi;
  const branches = [];
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const slug = m[1];
    let state = normalizeLibertyState(m[2]);
    const body = m[3];
    const cityMatch = body.match(/<span class="city">([^<]+)<\/span>/i);
    const nameMatch = body.match(/<h5>([^<]+)<\/h5>/i);
    const addrMatch = body.match(
      /id="address\[full\]"[\s\S]*?<span class="info">([^<]*)<\/span>/i,
    );
    const name = nameMatch ? decodeHtml(nameMatch[1]) : titleCase(slug.replace(/-/g, " "));
    let city = cityMatch ? decodeHtml(cityMatch[1]) : name;
    let address = addrMatch ? decodeHtml(addrMatch[1]).trim() : "";

    if (state === "Distrito Capital") {
      if (/guatire/i.test(name) || /guatire/i.test(city)) {
        state = "Miranda";
        city = "Guatire";
      } else if (/charallave/i.test(name) || /charallave/i.test(city)) {
        state = "Miranda";
        city = "Charallave";
      } else if (/altos mirandinos|teques/i.test(name)) {
        state = "Miranda";
        city = "Los Teques";
      } else if (/boyera|hatillo/i.test(name)) {
        state = "Miranda";
        city = "El Hatillo";
      } else {
        city = "Caracas";
      }
    }

    if (!address || address.length < 8) {
      address = `Oficina Liberty Express ${name}, ${city}, ${state}`;
    }

    branches.push({
      code: slug,
      name: titleCase(name),
      city: titleCase(city),
      state,
      address: cleanAddress(address),
    });
  }

  // Fallback: compact cards with for= and state=
  if (branches.length < 20) {
    const compactRe =
      /for="([^"]+)"\s+state="([^"]+)"[\s\S]*?<h6[^>]*>([^<]+)<\/h6>/gi;
    while ((m = compactRe.exec(html)) !== null) {
      const slug = m[1];
      const state = normalizeLibertyState(m[2]);
      const name = decodeHtml(m[3]);
      branches.push({
        code: slug,
        name: titleCase(name),
        city: titleCase(name.split(/\s+/)[0]),
        state,
        address: `Oficina Liberty Express ${name}, ${state}`,
      });
    }
  }

  const seen = new Set();
  return branches.filter((b) => {
    const k = `${normalizeKey(b.state)}|${normalizeKey(b.name)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function mergeBranches(primary, secondary) {
  const map = new Map();
  for (const b of primary) {
    const k = `${normalizeKey(b.state)}|${normalizeKey(b.name)}`;
    map.set(k, { ...b });
  }
  let added = 0;
  for (const b of secondary) {
    const k = `${normalizeKey(b.state)}|${normalizeKey(b.name)}`;
    if (map.has(k)) {
      const existing = map.get(k);
      if (b.code && !existing.code) existing.code = b.code;
      if (
        (!existing.address ||
          existing.address.startsWith("Oficina Liberty") ||
          existing.address.startsWith("Sucursal ")) &&
        b.address &&
        !b.address.startsWith("Oficina Liberty")
      ) {
        existing.address = b.address;
      }
      continue;
    }
    let found = false;
    for (const [ek, ev] of map) {
      if (!ek.startsWith(normalizeKey(b.state) + "|")) continue;
      const n1 = normalizeKey(ev.name);
      const n2 = normalizeKey(b.name);
      if (n1 === n2 || (n1.length > 6 && n2.includes(n1)) || (n2.length > 6 && n1.includes(n2))) {
        if (b.code && !ev.code) ev.code = b.code;
        found = true;
        break;
      }
    }
    if (found) continue;
    map.set(k, { ...b });
    added++;
  }
  return { list: [...map.values()], added };
}

function finalize(list) {
  const out = list.map((b, i) => ({
    code: b.code ? String(b.code) : `x${String(i + 1).padStart(4, "0")}`,
    name: titleCase(b.name),
    city: titleCase(b.city),
    state: b.state,
    address: cleanAddress(b.address),
  }));
  out.sort(
    (a, b) =>
      a.state.localeCompare(b.state, "es") ||
      a.city.localeCompare(b.city, "es") ||
      a.name.localeCompare(b.name, "es"),
  );
  return out;
}

function writeJson(file, list) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, file);
  fs.writeFileSync(outPath, JSON.stringify(list, null, 2), "utf8");
  const byState = {};
  for (const b of list) byState[b.state] = (byState[b.state] || 0) + 1;
  console.log(`Wrote ${list.length} -> ${file}`);
  console.log(byState);
  return list.length;
}

async function main() {
  const summary = {};
  const existingMrwPath = path.join(OUT_DIR, "mrw-branches.ve.json");
  const existingMrw = fs.existsSync(existingMrwPath)
    ? JSON.parse(fs.readFileSync(existingMrwPath, "utf8"))
    : [];

  for (const carrier of AGENCIAS_CARRIERS) {
    console.log(`\n=== Scraping ${carrier.slug} ===`);
    const scraped = await scrapeAgenciasCarrier(carrier.slug);
    let merged = scraped;

    if (carrier.key === "mrw" && existingMrw.length) {
      const m = mergeBranches(existingMrw, scraped);
      merged = m.list;
      console.log(`MRW merge: added ${m.added}`);
    }

    if (carrier.key === "tealca") {
      const tealcaPath =
        "C:/Users/Admin/.cursor/projects/c-Users-Admin-Desktop-alcentimo-1/agent-tools/94b0b47d-6aa7-4e3b-92a0-a35668faa44b.txt";
      if (fs.existsSync(tealcaPath)) {
        const usa = parseTealcaUsa(fs.readFileSync(tealcaPath, "utf8"));
        console.log(`Tealca USA parsed ${usa.length}`);
        const m = mergeBranches(scraped, usa);
        merged = m.list;
        console.log(`Tealca merge added ${m.added}`);
      }
    }

    summary[carrier.key] = writeJson(carrier.file, finalize(merged));
  }

  console.log("\n=== Scraping Liberty Express ===");
  const liberty = await scrapeLiberty();
  console.log(`Liberty raw ${liberty.length}`);
  summary.libertyExpress = writeJson(
    "liberty-express-branches.ve.json",
    finalize(liberty),
  );

  console.log("\n=== SUMMARY ===");
  console.log(summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
