import { ImageResponse } from "next/og";
import { getOrderShareContext } from "@/lib/orders/order-share";

export const runtime = "nodejs";
export const alt = "Pedido";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface OpenGraphImageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderShareOpenGraphImage({
  params,
}: OpenGraphImageProps) {
  const { orderId } = await params;
  const context = await getOrderShareContext(orderId);
  const storeName = context?.store.name?.trim() || "Tienda";
  const shortRef = context?.shortRef ?? orderId.slice(0, 8).toUpperCase();
  const logoUrl = context?.store.logoUrl ?? context?.store.iconUrl ?? null;
  const initial = storeName.slice(0, 1).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(160deg, #fafafa 0%, #f4f4f5 55%, #e4e4e7 100%)",
          fontFamily: "system-ui, sans-serif",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            maxWidth: 920,
            background: "#ffffff",
            borderRadius: 32,
            border: "1px solid #e4e4e7",
            padding: "56px 64px",
          }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              width={128}
              height={128}
              alt=""
              style={{
                width: 128,
                height: 128,
                borderRadius: 28,
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 128,
                height: 128,
                borderRadius: 28,
                background: "#18181b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 56,
                fontWeight: 700,
              }}
            >
              {initial}
            </div>
          )}

          <div
            style={{
              marginTop: 28,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#71717a",
            }}
          >
            Nuevo pedido
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 52,
              fontWeight: 700,
              color: "#18181b",
              textAlign: "center",
              lineHeight: 1.15,
            }}
          >
            {storeName}
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 28,
              color: "#52525b",
            }}
          >
            #{shortRef}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
