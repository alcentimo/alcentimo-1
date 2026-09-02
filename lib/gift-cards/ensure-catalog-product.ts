import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePublicCatalogCache } from "@/lib/catalog/public-catalog-cache";
import { isPlatformAdminOwnedStore } from "@/lib/gift-cards/admin-store";
import { generateGiftCardCode, roundGiftUsd } from "@/lib/gift-cards/code";
import {
  GIFT_CARD_CATEGORY_SLUG,
  GIFT_CARD_CUSTOM_ATTR,
  GIFT_CARD_METADATA_FLAG,
  GIFT_CARD_PRESET_AMOUNTS_USD,
  GIFT_CARD_PRODUCT_SLUG,
  GIFT_CARD_PUBLIC_IMAGE_PATH,
  GIFT_CARD_VIRTUAL_STOCK,
} from "@/lib/gift-cards/catalog";
import { upsertVariantLocationStock } from "@/lib/locations/sync-stock";
import type { OrderLineItem } from "@/lib/orders/types";
import { validateGiftCardDelivery } from "@/lib/gift-cards/delivery";
import { sendPurchasedGiftCardEmail } from "@/lib/gift-cards/send-gift-card-email";
import { getStoreCustomerAccountUrl } from "@/lib/store-host";

const PRODUCT_NAME = "Tarjeta de regalo";
const CATEGORY_NAME = "Tarjetas de regalo";

export async function ensureAdminGiftCardCatalogProduct(input: {
  storeId: string;
  storeSlug: string;
  ownerId?: string | null;
}): Promise<void> {
  const adminOwned = await isPlatformAdminOwnedStore(
    input.storeId,
    input.ownerId,
  );
  if (!adminOwned) return;

  try {
    const admin = createAdminClient();
    await ensureAdminGiftCardCatalogProductWithClient(admin, input);
  } catch (error) {
    console.error(
      "[gift-card-catalog]",
      error instanceof Error ? error.message : error,
    );
  }
}

async function ensureAdminGiftCardCatalogProductWithClient(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    storeId: string;
    storeSlug: string;
    ownerId?: string | null;
  },
): Promise<void> {
  const { data: existing, error: existingError } = await admin
    .from("products")
    .select("id, name, short_description, tags, is_featured, sort_order, metadata")
    .eq("store_id", input.storeId)
    .eq("slug", GIFT_CARD_PRODUCT_SLUG)
    .maybeSingle();

  if (existingError) {
    console.error("[gift-card-catalog] lookup", existingError.message);
    return;
  }
  if (existing?.id) {
    const existingId = String(existing.id);
    const row = existing as {
      name?: string | null;
      short_description?: string | null;
      tags?: string[] | null;
      is_featured?: boolean | null;
      sort_order?: number | null;
      metadata?: unknown;
    };
    const previousMetadata =
      row.metadata &&
      typeof row.metadata === "object" &&
      !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const expectedTags = [
      "gift-card",
      "digital",
      "tarjeta de regalo",
      "gift card",
      "vale de regalo",
    ];
    const currentTags = Array.isArray(row.tags) ? row.tags : [];
    const tagsMatch =
      expectedTags.length === currentTags.length &&
      expectedTags.every((tag) => currentTags.includes(tag));
    const alreadyIndexed =
      row.name === PRODUCT_NAME &&
      (row.short_description ?? "").includes("Tarjeta de regalo") &&
      tagsMatch &&
      row.is_featured === true &&
      (row.sort_order ?? 1) === 0 &&
      previousMetadata[GIFT_CARD_METADATA_FLAG] === true;

    await ensureGiftCardProductImage(admin, existingId);

    if (!alreadyIndexed) {
      await admin
        .from("products")
        .update({
          name: PRODUCT_NAME,
          short_description:
            "Tarjeta de regalo digital. Elige un monto o uno personalizado. Recibirás un código para abonar en tu perfil o regalar.",
          tags: expectedTags,
          is_featured: true,
          sort_order: 0,
          metadata: {
            ...previousMetadata,
            [GIFT_CARD_METADATA_FLAG]: true,
            digital: true,
          },
        })
        .eq("id", existingId);
    }

    revalidatePublicCatalogCache({
      slug: input.storeSlug,
      storeId: input.storeId,
    });
    return;
  }

  const { data: categoryRow, error: categoryLookupError } = await admin
    .from("categories")
    .select("id")
    .eq("store_id", input.storeId)
    .eq("slug", GIFT_CARD_CATEGORY_SLUG)
    .maybeSingle();

  if (categoryLookupError) {
    console.error("[gift-card-catalog] category lookup", categoryLookupError.message);
    return;
  }

  let categoryId = (categoryRow as { id?: string } | null)?.id ?? null;
  if (!categoryId) {
    const { data: createdCategory, error: categoryError } = await admin
      .from("categories")
      .insert({
        store_id: input.storeId,
        name: CATEGORY_NAME,
        slug: GIFT_CARD_CATEGORY_SLUG,
        description: "Producto digital: saldo para usar en esta tienda.",
        is_active: true,
        sort_order: 0,
      })
      .select("id")
      .single();
    if (categoryError || !createdCategory) {
      console.error(
        "[gift-card-catalog] category insert",
        categoryError?.message,
      );
      return;
    }
    categoryId = String(createdCategory.id);
  }

  const productId = crypto.randomUUID();
  const variantIds = {
    custom: crypto.randomUUID(),
    ...Object.fromEntries(
      GIFT_CARD_PRESET_AMOUNTS_USD.map((amount) => [
        String(amount),
        crypto.randomUUID(),
      ]),
    ),
  } as Record<string, string>;

  const jsonVariants = [
    ...GIFT_CARD_PRESET_AMOUNTS_USD.map((amount) => ({
      id: variantIds[String(amount)]!,
      name: `$${amount}`,
      price_extra_usd: amount,
      stock: GIFT_CARD_VIRTUAL_STOCK,
    })),
    {
      id: variantIds.custom,
      name: "Otro monto",
      price_extra_usd: 0,
      stock: GIFT_CARD_VIRTUAL_STOCK,
      attributes: { [GIFT_CARD_CUSTOM_ATTR]: "true" },
    },
  ];

  const { error: productError } = await admin.from("products").insert({
    id: productId,
    store_id: input.storeId,
    category_id: categoryId,
    name: PRODUCT_NAME,
    slug: GIFT_CARD_PRODUCT_SLUG,
    short_description:
      "Tarjeta de regalo digital. Elige un monto o uno personalizado. Recibirás un código para abonar en tu perfil o regalar.",
    description:
      "Tarjeta de regalo digital de esta tienda. No es un artículo físico: al confirmar el pedido se genera un código único. Puedes cargarlo en tu cuenta (Mi perfil) o enviárselo a otra persona.",
    tags: [
      "gift-card",
      "digital",
      "tarjeta de regalo",
      "gift card",
      "vale de regalo",
    ],
    is_active: true,
    is_featured: true,
    is_deleted: false,
    sort_order: 0,
    stock: GIFT_CARD_VIRTUAL_STOCK,
    variants: jsonVariants,
    metadata: { [GIFT_CARD_METADATA_FLAG]: true, digital: true },
  });

  if (productError) {
    if (!/duplicate|unique/i.test(productError.message)) {
      console.error("[gift-card-catalog] product insert", productError.message);
    }
    return;
  }

  const skuPrefix = `gc-${input.storeId.replace(/-/g, "").slice(0, 10)}`;
  const variantRows = [
    ...GIFT_CARD_PRESET_AMOUNTS_USD.map((amount, index) => ({
      id: variantIds[String(amount)]!,
      product_id: productId,
      sku: `${skuPrefix}-${amount}`.slice(0, 80),
      name: `$${amount}`,
      attributes: {},
      stock_quantity: GIFT_CARD_VIRTUAL_STOCK,
      reserved_quantity: 0,
      low_stock_threshold: 0,
      is_active: true,
      is_default: index === 1,
    })),
    {
      id: variantIds.custom,
      product_id: productId,
      sku: `${skuPrefix}-custom`.slice(0, 80),
      name: "Otro monto",
      attributes: { [GIFT_CARD_CUSTOM_ATTR]: "true" },
      stock_quantity: GIFT_CARD_VIRTUAL_STOCK,
      reserved_quantity: 0,
      low_stock_threshold: 0,
      is_active: true,
      is_default: false,
    },
  ];

  const { error: variantsError } = await admin
    .from("product_variants")
    .insert(variantRows);
  if (variantsError) {
    console.error("[gift-card-catalog] variants", variantsError.message);
    return;
  }

  const defaultVariantId = variantIds["25"] ?? variantRows[0]!.id;
  const { error: priceError } = await admin.from("product_prices").insert({
    variant_id: defaultVariantId,
    amount_usd: 0,
  });
  if (priceError) {
    console.error("[gift-card-catalog] price", priceError.message);
  }

  await ensureGiftCardProductImage(admin, productId);

  const { data: locations } = await admin
    .from("store_locations")
    .select("id")
    .eq("store_id", input.storeId)
    .eq("is_active", true);

  for (const location of locations ?? []) {
    const locationId = String((location as { id: string }).id);
    for (const row of variantRows) {
      await upsertVariantLocationStock(admin, {
        variantId: row.id,
        locationId,
        stockQuantity: GIFT_CARD_VIRTUAL_STOCK,
      });
    }
  }

  revalidatePublicCatalogCache({
    slug: input.storeSlug,
    storeId: input.storeId,
  });
}

async function ensureGiftCardProductImage(
  admin: ReturnType<typeof createAdminClient>,
  productId: string,
): Promise<void> {
  const { data: images, error } = await admin
    .from("product_images")
    .select("id, thumb_url")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .limit(4);

  if (error) {
    console.error("[gift-card-catalog] image lookup", error.message);
    return;
  }

  const rows = (images ?? []) as Array<{ id: string; thumb_url: string | null }>;
  const hasCorporate = rows.some(
    (row) => row.thumb_url === GIFT_CARD_PUBLIC_IMAGE_PATH,
  );
  if (hasCorporate) return;

  const broken = rows.filter(
    (row) =>
      !row.thumb_url?.trim() ||
      row.thumb_url.includes("undefined") ||
      row.thumb_url.endsWith("/"),
  );
  for (const row of broken) {
    await admin.from("product_images").delete().eq("id", row.id);
  }

  const remaining = rows.filter((row) => !broken.some((b) => b.id === row.id));
  if (remaining.length > 0) return;

  const { error: insertError } = await admin.from("product_images").insert({
    product_id: productId,
    thumb_url: GIFT_CARD_PUBLIC_IMAGE_PATH,
    medium_url: GIFT_CARD_PUBLIC_IMAGE_PATH,
    full_url: GIFT_CARD_PUBLIC_IMAGE_PATH,
    alt_text: "Tarjeta de regalo",
    mime_type: "image/svg+xml",
    sort_order: 0,
    is_primary: true,
  });
  if (insertError) {
    console.error("[gift-card-catalog] image insert", insertError.message);
  }
}

export async function issuePurchasedGiftCards(input: {
  storeId: string;
  orderId: string;
  items: OrderLineItem[];
}): Promise<{ items: OrderLineItem[]; codes: string[] }> {
  const giftLines = input.items.filter((item) => item.is_gift_card);
  if (giftLines.length === 0) {
    return { items: input.items, codes: [] };
  }

  const adminOwned = await isPlatformAdminOwnedStore(input.storeId);
  if (!adminOwned) {
    return { items: input.items, codes: [] };
  }

  const admin = createAdminClient();
  const { data: storeRow } = await admin
    .from("stores")
    .select("name, slug, custom_domain, custom_domain_verified")
    .eq("id", input.storeId)
    .maybeSingle();
  const storeName =
    typeof storeRow?.name === "string" && storeRow.name.trim()
      ? storeRow.name.trim()
      : "Alcéntimo";
  const storeSlug =
    typeof storeRow?.slug === "string" ? storeRow.slug : "";
  const profileUrl = storeSlug
    ? getStoreCustomerAccountUrl(storeSlug, "perfil", {
        customDomain:
          typeof storeRow?.custom_domain === "string"
            ? storeRow.custom_domain
            : null,
        customDomainVerified: Boolean(storeRow?.custom_domain_verified),
      })
    : "https://alcentimo.com";

  const codes: string[] = [];
  const codesByProductKey = new Map<string, string[]>();

  for (const line of giftLines) {
    const amount = roundGiftUsd(line.unit_price_usd);
    if (amount < 1) continue;
    const qty = Math.max(1, Math.floor(line.quantity));
    const lineCodes: string[] = [];
    for (let index = 0; index < qty; index += 1) {
      let inserted = false;
      for (let attempt = 0; attempt < 4 && !inserted; attempt += 1) {
        const code = generateGiftCardCode();
        const recipientNote = line.gift_recipient_email
          ? ` · Para ${line.gift_recipient_email}`
          : "";
        const { error } = await admin.from("gift_cards").insert({
          store_id: input.storeId,
          code,
          initial_balance_usd: amount,
          current_balance_usd: amount,
          status: "active",
          note: `Pedido ${input.orderId.slice(0, 8).toUpperCase()} · ${line.variant_name}${recipientNote}`,
        });
        if (!error) {
          lineCodes.push(code);
          codes.push(code);
          inserted = true;
        } else if (!/duplicate|unique/i.test(error.message)) {
          console.error("[gift-card-issue]", error.message);
          break;
        }
      }
    }
    const key = `${line.product_id}:${line.variant_name}:${amount}:${line.gift_recipient_email ?? ""}`;
    codesByProductKey.set(key, [
      ...(codesByProductKey.get(key) ?? []),
      ...lineCodes,
    ]);

    const delivery = validateGiftCardDelivery({
      recipientEmail: line.gift_recipient_email,
      fromName: line.gift_from_name,
      message: line.gift_message,
    });
    if (delivery.ok && lineCodes.length > 0) {
      await sendPurchasedGiftCardEmail({
        storeName,
        profileUrl,
        amountUsd: amount,
        codes: lineCodes,
        delivery: delivery.delivery,
      });
    }
  }

  const items = input.items.map((item) => {
    if (!item.is_gift_card) return item;
    const key = `${item.product_id}:${item.variant_name}:${roundGiftUsd(item.unit_price_usd)}:${item.gift_recipient_email ?? ""}`;
    return {
      ...item,
      issued_gift_card_codes: codesByProductKey.get(key) ?? [],
    };
  });

  if (codes.length > 0) {
    await admin
      .from("orders")
      .update({ items })
      .eq("id", input.orderId)
      .eq("store_id", input.storeId);
  }

  return { items, codes };
}
