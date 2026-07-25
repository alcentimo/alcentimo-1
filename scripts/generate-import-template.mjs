import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputPath = path.join(rootDir, "public", "plantilla_alcentimo.xlsx");
const csvPath = path.join(rootDir, "public", "plantilla_alcentimo.csv");

const headers = [
  "nombre",
  "descripcion",
  "precio",
  "stock",
  "categoria",
  "url_imagen",
];

const exampleRows = [
  [
    "Camisa Oxford",
    "Camisa de algodón manga larga",
    24.99,
    15,
    "camisas",
    "https://ejemplo.com/imagenes/camisa-oxford.jpg",
  ],
  [
    "Pantalón Chino",
    "Pantalón casual color beige",
    32.5,
    8,
    "pantalones",
    "",
  ],
];

const csvLines = [
  headers.join(","),
  ...exampleRows.map((row) =>
    row
      .map((cell) => {
        const text = String(cell);
        return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      })
      .join(","),
  ),
];

fs.writeFileSync(csvPath, `\uFEFF${csvLines.join("\n")}`, "utf8");

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);

worksheet["!cols"] = [
  { wch: 24 },
  { wch: 36 },
  { wch: 10 },
  { wch: 8 },
  { wch: 16 },
  { wch: 42 },
];

XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
XLSX.writeFile(workbook, outputPath);

console.log(`Plantilla XLSX generada en ${outputPath}`);
console.log(`Plantilla CSV generada en ${csvPath}`);
