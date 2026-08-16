import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/storage";
import {
  SOCIAL_PRODUCT_IMAGE_FILE_SUFFIX,
  SOCIAL_PRODUCT_IMAGE_SIZE,
  deriveSupplierSocialImageUrl,
  renderSocialSquareJpegFromImage,
  supplierImageStoragePathFromPublicUrl,
} from "@/lib/supplier/social-image";

function slugifyFileName(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "producto";
}

/**
 * Descarga JPEG 1080×1080 listo para Instagram / Facebook / WhatsApp
 * a partir de la foto de catálogo mayorista (o su variante -social.jpg).
 */
export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get("url")?.trim() || "";
  const title = request.nextUrl.searchParams.get("title")?.trim() || "producto";

  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    return NextResponse.json({ error: "URL de imagen inválida." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  // Solo URLs del bucket de productos de la plataforma.
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: "URL de imagen inválida." }, { status: 400 });
  }

  if (!parsed.pathname.includes("/storage/v1/object/public/product-images/")) {
    return NextResponse.json(
      { error: "Solo se pueden descargar fotos del catálogo." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const fileBase = `${slugifyFileName(title)}-${SOCIAL_PRODUCT_IMAGE_SIZE}x${SOCIAL_PRODUCT_IMAGE_SIZE}`;
  const downloadName = `${fileBase}.jpg`;

  const socialUrl = deriveSupplierSocialImageUrl(imageUrl);
  const candidatePaths = [
    socialUrl ? supplierImageStoragePathFromPublicUrl(socialUrl) : null,
    supplierImageStoragePathFromPublicUrl(imageUrl),
  ].filter((path): path is string => Boolean(path));

  for (const path of candidatePaths) {
    const { data, error } = await admin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .download(path);

    if (error || !data) continue;

    const arrayBuffer = await data.arrayBuffer();
    const input = Buffer.from(arrayBuffer);

    // Si ya es el JPEG social, servir directo.
    if (path.endsWith(SOCIAL_PRODUCT_IMAGE_FILE_SUFFIX)) {
      return new NextResponse(new Uint8Array(input), {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": `attachment; filename="${downloadName}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    // Regenerar cuadrado social desde el WebP de catálogo (fotos antiguas).
    try {
      const rendered = await renderSocialSquareJpegFromImage(input);
      return new NextResponse(new Uint8Array(rendered.buffer), {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": `attachment; filename="${downloadName}"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    } catch (caught) {
      console.warn(
        "[dropship-social-image]",
        caught instanceof Error ? caught.message : caught,
      );
    }
  }

  // Fallback: fetch público de la URL de catálogo y regenerar.
  try {
    const upstream = await fetch(imageUrl, { cache: "no-store" });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "No se pudo obtener la foto del producto." },
        { status: 404 },
      );
    }
    const input = Buffer.from(await upstream.arrayBuffer());
    const rendered = await renderSocialSquareJpegFromImage(input);
    return new NextResponse(new Uint8Array(rendered.buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (caught) {
    console.error("[dropship-social-image-fetch]", caught);
    return NextResponse.json(
      { error: "No se pudo preparar la imagen para redes." },
      { status: 500 },
    );
  }
}
