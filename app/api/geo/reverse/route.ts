import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

/**
 * Proxy de reverse-geocode para elegir sede cercana en el catálogo público.
 * Evita CORS y cumple la política de User-Agent de Nominatim.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "lat y lon son requeridos." },
      { status: 400 },
    );
  }

  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "Coordenadas inválidas." }, { status: 400 });
  }

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "es",
        "User-Agent": "AlcentimoCatalog/1.0 (https://alcentimo.com; soporte@alcentimo.com)",
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "No se pudo resolver la ubicación." },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      display_name?: string;
      address?: Record<string, string | undefined>;
    };
    const address = data.address ?? {};

    return NextResponse.json({
      city: address.city ?? "",
      town: address.town ?? "",
      village: address.village ?? "",
      municipality: address.municipality ?? "",
      county: address.county ?? "",
      state: address.state ?? "",
      displayName: data.display_name ?? "",
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo resolver la ubicación." },
      { status: 502 },
    );
  }
}
