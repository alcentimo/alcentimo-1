import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(
  __dirname,
  "..",
  "lib",
  "shipping",
  "data",
  "liberty-express-branches.ve.json",
);

/** Official Liberty Express VE network (sucursales page), structured for checkout. */
const RAW = [
  ["Anzoátegui", "Barcelona", "Barcelona Las Garzas"],
  ["Anzoátegui", "El Tigre", "El Tigre"],
  ["Anzoátegui", "Anaco", "Anaco"],
  ["Apure", "San Fernando de Apure", "San Fernando de Apure"],
  ["Aragua", "Maracay", "Maracay Sur"],
  ["Aragua", "Maracay", "Maracay Las Delicias"],
  ["Aragua", "Cagua", "Cagua"],
  ["Aragua", "Maracay", "Maracay"],
  ["Barinas", "Barinas", "Barinas"],
  ["Bolívar", "Ciudad Bolívar", "Ciudad Bolívar"],
  ["Bolívar", "Puerto Ordaz", "Puerto Ordaz"],
  ["Carabobo", "Valencia", "Valencia C.C. MetroSur"],
  ["Carabobo", "Valencia", "Valencia Norte"],
  ["Carabobo", "Valencia", "Valencia Centro"],
  ["Cojedes", "San Carlos", "San Carlos"],
  ["Falcón", "Coro", "Coro"],
  ["Falcón", "Punto Fijo", "Punto Fijo"],
  ["Distrito Capital", "Caracas", "C.C.C.T"],
  ["Miranda", "Los Teques", "Altos Mirandinos"],
  ["Miranda", "Guatire", "Guatire"],
  ["Miranda", "Charallave", "Charallave"],
  ["Miranda", "El Hatillo", "La Boyera"],
  ["Distrito Capital", "Caracas", "Altamira Plaza"],
  ["Distrito Capital", "Caracas", "Panteón"],
  ["Distrito Capital", "Caracas", "Bello Monte"],
  ["Distrito Capital", "Caracas", "La Urbina"],
  ["Distrito Capital", "Caracas", "Santa Paula"],
  ["Distrito Capital", "Caracas", "El Paraíso"],
  ["Distrito Capital", "Caracas", "El Rosal"],
  ["Distrito Capital", "Caracas", "El Rosal VIP"],
  ["Guárico", "San Juan de los Morros", "San Juan de los Morros"],
  ["Guárico", "Calabozo", "Calabozo"],
  ["Guárico", "Valle de la Pascua", "Valle de la Pascua"],
  ["Lara", "Barquisimeto", "Barquisimeto"],
  ["Lara", "Barquisimeto", "Barquisimeto Oeste"],
  ["Lara", "Cabudare", "Cabudare"],
  ["Monagas", "Maturín", "Maturín"],
  ["Mérida", "El Vigía", "El Vigía"],
  ["Mérida", "Mérida", "Mérida Sur"],
  ["Mérida", "Mérida", "Mérida"],
  ["Nueva Esparta", "Pampatar", "Pampatar (Maneiro)"],
  ["Portuguesa", "Guanare", "Guanare"],
  ["Portuguesa", "Acarigua", "Acarigua"],
  ["Sucre", "Carúpano", "Carúpano"],
  ["Sucre", "Cumaná", "Cumaná"],
  ["Trujillo", "Trujillo", "Trujillo"],
  ["Trujillo", "Valera", "Valera"],
  ["Táchira", "San Cristóbal", "San Cristóbal"],
  ["Táchira", "San Cristóbal", "San Cristóbal Barrio Obrero"],
  ["Táchira", "San Antonio del Táchira", "San Antonio del Táchira"],
  ["Yaracuy", "San Felipe", "San Felipe"],
  ["Zulia", "Maracaibo", "Maracaibo Zona Industrial"],
  ["Zulia", "Maracaibo", "Maracaibo"],
  ["Zulia", "Maracaibo", "Maracaibo Norte"],
  ["Zulia", "Cabimas", "Cabimas"],
];

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const list = RAW.map(([state, city, name]) => ({
  code: slugify(name),
  name,
  city,
  state,
  address: `Sucursal Liberty Express ${name}, ${city}, ${state}`,
}));

fs.writeFileSync(OUT, JSON.stringify(list, null, 2), "utf8");
console.log("Wrote", list.length, "Liberty offices");
