import {
  PRODUCT_IMPORT_COLUMNS,
  PRODUCT_IMPORT_TEMPLATE_CSV_FILENAME,
  PRODUCT_IMPORT_TEMPLATE_FILENAME,
} from "@/lib/products/import-schema";

const TEMPLATE_HEADERS = [
  "nombre",
  "descripcion",
  "precio",
  "stock",
  "categoria",
  "url_imagen",
] as const;

const TEMPLATE_EXAMPLE_ROWS: (string | number)[][] = [
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

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Descarga plantilla Excel generada al vuelo con columnas estándar. */
export async function downloadProductImportTemplateXlsx() {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    [...TEMPLATE_HEADERS],
    ...TEMPLATE_EXAMPLE_ROWS,
  ]);

  worksheet["!cols"] = [
    { wch: 24 },
    { wch: 36 },
    { wch: 10 },
    { wch: 8 },
    { wch: 16 },
    { wch: 42 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  triggerBrowserDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    PRODUCT_IMPORT_TEMPLATE_FILENAME,
  );
}

/** Descarga plantilla CSV con las columnas obligatorias definidas. */
export function downloadProductImportTemplateCsv() {
  const escapeCsv = (value: string | number) => {
    const text = String(value);
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = [
    TEMPLATE_HEADERS.join(","),
    ...TEMPLATE_EXAMPLE_ROWS.map((row) => row.map(escapeCsv).join(",")),
  ];

  const blob = new Blob([`\uFEFF${lines.join("\n")}`], {
    type: "text/csv;charset=utf-8",
  });

  triggerBrowserDownload(blob, PRODUCT_IMPORT_TEMPLATE_CSV_FILENAME);
}

export function getImportTemplateColumnHelp(): {
  column: (typeof PRODUCT_IMPORT_COLUMNS)[number];
  required: boolean;
  description: string;
}[] {
  return [
    {
      column: "nombre",
      required: true,
      description: "Nombre visible del producto en el catálogo.",
    },
    {
      column: "descripcion",
      required: false,
      description: "Texto corto opcional bajo el nombre.",
    },
    {
      column: "precio",
      required: true,
      description: "Precio en USD. Usa punto decimal (ej. 19.99).",
    },
    {
      column: "stock",
      required: true,
      description: "Cantidad disponible (número entero ≥ 0).",
    },
    {
      column: "categoria",
      required: true,
      description: "Categoría del producto. Se crea si no existe.",
    },
    {
      column: "url_imagen",
      required: false,
      description: "Enlace http(s) a la imagen principal (opcional).",
    },
  ];
}
