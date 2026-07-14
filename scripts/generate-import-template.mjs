import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputPath = path.join(rootDir, "public", "plantilla_alcentimo.xlsx");

const headers = [
  "nombre",
  "descripcion",
  "precio",
  "stock",
  "url_imagen",
  "categoria",
];

const exampleRows = [
  [
    "Camisa Oxford",
    "Camisa de algodón manga larga",
    24.99,
    15,
    "https://ejemplo.com/imagenes/camisa-oxford.jpg",
    "camisas",
  ],
  [
    "Pantalón Chino",
    "Pantalón casual color beige",
    32.5,
    8,
    "",
    "pantalones",
  ],
];

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);

worksheet["!cols"] = [
  { wch: 24 },
  { wch: 36 },
  { wch: 10 },
  { wch: 8 },
  { wch: 42 },
  { wch: 16 },
];

XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
XLSX.writeFile(workbook, outputPath);

console.log(`Plantilla generada en ${outputPath}`);
