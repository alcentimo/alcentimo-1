/**
 * Descarga imágenes del catálogo de referencia a public/images/referencia/.
 * Ejecutar: node scripts/download-reference-images.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outRoot = path.join(root, "public", "images", "referencia");

/** [rubro, filename, primaryUrl, fallbackSeed] */
const DOWNLOADS = [
  [
    "ropa-moda",
    "blazer-milano.jpg",
    "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "ropa-moda",
    "jean-indigo.jpg",
    "https://images.pexels.com/photos/1541090/pexels-photo-1541090.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "ropa-moda",
    "sneaker-court.jpg",
    "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "ropa-moda",
    "bolso-valentina.jpg",
    "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "ropa-moda",
    "camiseta-pima.jpg",
    "https://images.pexels.com/photos/165581/pexels-photo-165581.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "ropa-moda",
    "pantalon-chino.jpg",
    "https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "ferreteria",
    "taladro-brushless.jpg",
    "https://images.pexels.com/photos/162625/drill-tools-construction-drill-162625.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "ferreteria",
    "llaves-combinadas.jpg",
    "https://images.pexels.com/photos/162553/pexels-photo-162553.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "ferreteria",
    "cable-thhn.jpg",
    "https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "ferreteria",
    "tuberia-pvc.jpg",
    "https://images.pexels.com/photos/5691631/pexels-photo-5691631.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "ferreteria",
    "motosierra.jpg",
    "https://images.pexels.com/photos/162568/chainsaw-tree-felling-162568.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "ferreteria",
    "tornillos-surtidos.jpg",
    "https://images.pexels.com/photos/162625/drill-tools-construction-drill-162625.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "calzado",
    "oxford-firenze.jpg",
    "https://images.pexels.com/photos/292999/pexels-photo-292999.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "calzado",
    "bota-andes.jpg",
    "https://images.pexels.com/photos/1121468/pexels-photo-1121468.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "calzado",
    "sandalia-cloud.jpg",
    "https://images.pexels.com/photos/19090/pexels-photo-19090.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "calzado",
    "runner-velocity.jpg",
    "https://images.pexels.com/photos/1464625/pexels-photo-1464625.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "calzado",
    "mocasin-suede.jpg",
    "https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "calzado",
    "deportivo-pro.jpg",
    "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "tecnologia",
    "reloj-cronografo.jpg",
    "https://images.pexels.com/photos/997910/pexels-photo-997910.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "tecnologia",
    "smartphone-nova.jpg",
    "https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "tecnologia",
    "ultrabook-pro.jpg",
    "https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "tecnologia",
    "audifonos-anc.jpg",
    "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "tecnologia",
    "monitor-ips.jpg",
    "https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "tecnologia",
    "cargador-usbc.jpg",
    "https://images.pexels.com/photos/163117/cable-adapter-usb-c-163117.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "alimentos",
    "arroz-premium.jpg",
    "https://images.pexels.com/photos/33239/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "alimentos",
    "aceite-girasol.jpg",
    "https://images.pexels.com/photos/33783/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "alimentos",
    "jugo-naranja.jpg",
    "https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "alimentos",
    "frutas-temporada.jpg",
    "https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "alimentos",
    "mix-snacks.jpg",
    "https://images.pexels.com/photos/4198027/pexels-photo-4198027.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "alimentos",
    "cafe-especialidad.jpg",
    "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "salud-belleza",
    "serum-vitamina-c.jpg",
    "https://images.pexels.com/photos/3785147/pexels-photo-3785147.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "salud-belleza",
    "labial-velvet.jpg",
    "https://images.pexels.com/photos/2533266/pexels-photo-2533266.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "salud-belleza",
    "perfume-citrus.jpg",
    "https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "salud-belleza",
    "multivitaminico.jpg",
    "https://images.pexels.com/photos/208512/pexels-photo-208512.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "salud-belleza",
    "crema-hydra.jpg",
    "https://images.pexels.com/photos/3685530/pexels-photo-3685530.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "salud-belleza",
    "mascarilla-facial.jpg",
    "https://images.pexels.com/photos/3785149/pexels-photo-3785149.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "hogar-decoracion",
    "sillon-oslo.jpg",
    "https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "hogar-decoracion",
    "lampara-arco.jpg",
    "https://images.pexels.com/photos/1123262/pexels-photo-1123262.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "hogar-decoracion",
    "ollas-forged.jpg",
    "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "hogar-decoracion",
    "sabanas-algodon.jpg",
    "https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "hogar-decoracion",
    "espejo-arco.jpg",
    "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "hogar-decoracion",
    "cojin-decorativo.jpg",
    "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "general",
    "kit-best-seller.jpg",
    "https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "general",
    "edicion-signature.jpg",
    "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "general",
    "pack-familiar.jpg",
    "https://images.pexels.com/photos/264547/pexels-photo-264547.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "general",
    "accesorio-pro.jpg",
    "https://images.pexels.com/photos/163140/old-books-book-old-library-163140.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "general",
    "gift-card.jpg",
    "https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
  [
    "general",
    "producto-destacado.jpg",
    "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=800&h=1000&fit=crop",
  ],
];

function picsumFallback(rubro, filename) {
  const seed = encodeURIComponent(`${rubro}-${filename}`);
  return `https://picsum.photos/seed/${seed}/800/1000`;
}

async function fetchImage(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "Alcentimo-Reference-Images/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error("Response too small");
  return buf;
}

async function main() {
  let ok = 0;
  let fail = 0;

  for (const [rubro, filename, primaryUrl] of DOWNLOADS) {
    const dir = path.join(outRoot, rubro);
    await mkdir(dir, { recursive: true });
    const dest = path.join(dir, filename);

    try {
      let buf;
      try {
        buf = await fetchImage(primaryUrl);
      } catch {
        buf = await fetchImage(picsumFallback(rubro, filename));
      }
      await writeFile(dest, buf);
      ok += 1;
      console.log(`OK  ${rubro}/${filename}`);
    } catch (err) {
      fail += 1;
      console.error(`FAIL ${rubro}/${filename}: ${err.message}`);
    }
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main();
