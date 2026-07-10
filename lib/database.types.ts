export type InventoryMovementType =
  | "purchase_in"
  | "sale_out"
  | "adjustment"
  | "return_in"
  | "damage_out"
  | "reserve"
  | "release";

export type StoreMemberRole = "owner" | "admin" | "staff";

export type ProfilePlanDb = "FREE" | "STARTER" | "GROWTH" | "PREMIUM";

export interface Profile {
  id: string;
  plan: ProfilePlanDb | string;
  created_at?: string;
  updated_at?: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreMember {
  id: string;
  store_id: string;
  user_id: string;
  role: StoreMemberRole;
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  rate: number;
  source: string;
  effective_date: string;
  notes: string | null;
  store_id: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  store_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  depth: number;
  path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariantJson {
  id: string;
  name: string;
  price_extra_usd: number;
  stock: number;
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  brand: string | null;
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  metadata: Record<string, unknown>;
  variants?: ProductVariantJson[];
  created_at: string;
  updated_at: string;
}

export type CouponDiscountType = "percent" | "fixed";

export interface Coupon {
  id: string;
  store_id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_percent: number | null;
  discount_fixed_usd: number | null;
  is_active: boolean;
  is_global: boolean;
  product_ids: string[];
  max_uses: number;
  use_count: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type CouponInsert = {
  id?: string;
  store_id: string;
  code: string;
  discount_type?: CouponDiscountType;
  discount_percent?: number | null;
  discount_fixed_usd?: number | null;
  is_active?: boolean;
  is_global?: boolean;
  product_ids?: string[];
  max_uses?: number;
  use_count?: number;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
};

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  name: string | null;
  attributes: Record<string, unknown>;
  barcode: string | null;
  stock_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  weight_grams: number | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductPrice {
  id: string;
  variant_id: string;
  amount_usd: number;
  compare_at_usd: number | null;
  effective_from: string;
  effective_until: string | null;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  thumb_url: string;
  medium_url: string | null;
  full_url: string | null;
  blur_hash: string | null;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  mime_type: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface InventoryLog {
  id: string;
  variant_id: string;
  movement_type: InventoryMovementType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reserved_before: number;
  reserved_after: number;
  unit_cost_usd: number | null;
  exchange_rate: number | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

/** Fila de la vista `catalog_list_view` — optimizada para el grid */
export interface CatalogListItem {
  store_id: string;
  store_slug: string;
  store_name: string;
  product_id: string;
  product_slug: string;
  product_name: string;
  short_description: string | null;
  brand: string | null;
  is_featured: boolean;
  updated_at: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  category_path: string;
  default_variant_id: string;
  default_sku: string;
  stock_quantity: number;
  reserved_quantity: number;
  available_stock: number;
  low_stock_threshold: number;
  default_attributes: Record<string, unknown>;
  price_usd: number | null;
  price_ves: number | null;
  compare_at_usd: number | null;
  compare_at_ves: number | null;
  exchange_rate_used: number | null;
  product_variants: ProductVariantJson[] | null;
  thumb_url: string | null;
  blur_hash: string | null;
  image_alt: string | null;
}

export type CategoryInsert = {
  id?: string;
  store_id: string;
  parent_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  sort_order?: number;
  depth?: number;
  path?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProductInsert = {
  id?: string;
  store_id: string;
  category_id: string;
  name: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  brand?: string | null;
  tags?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  metadata?: Record<string, unknown>;
  variants?: ProductVariantJson[];
  created_at?: string;
  updated_at?: string;
};

export type ProductVariantInsert = {
  id?: string;
  product_id: string;
  sku: string;
  name?: string | null;
  attributes?: Record<string, unknown>;
  barcode?: string | null;
  stock_quantity?: number;
  reserved_quantity?: number;
  low_stock_threshold?: number;
  weight_grams?: number | null;
  is_active?: boolean;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProductPriceInsert = {
  id?: string;
  variant_id: string;
  amount_usd: number;
  compare_at_usd?: number | null;
  effective_from?: string;
  effective_until?: string | null;
  created_at?: string;
};

export type ProductImageInsert = {
  id?: string;
  product_id: string;
  variant_id?: string | null;
  thumb_url: string;
  medium_url?: string | null;
  full_url?: string | null;
  blur_hash?: string | null;
  alt_text?: string | null;
  width?: number | null;
  height?: number | null;
  byte_size?: number | null;
  mime_type?: string;
  sort_order?: number;
  is_primary?: boolean;
  created_at?: string;
};

export type StoreInsert = {
  id?: string;
  owner_id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export interface StoreSettings {
  id: string;
  store_id: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type StoreSettingsInsert = {
  id?: string;
  store_id: string;
  config?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Pick<Profile, "id"> & {
          plan?: ProfilePlanDb | string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Profile>;
        Relationships: [];
      };
      stores: {
        Row: Store;
        Insert: StoreInsert;
        Update: Partial<Store>;
        Relationships: [];
      };
      store_members: {
        Row: StoreMember;
        Insert: Omit<StoreMember, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<StoreMember>;
        Relationships: [];
      };
      store_settings: {
        Row: StoreSettings;
        Insert: StoreSettingsInsert;
        Update: Partial<StoreSettings>;
        Relationships: [];
      };
      exchange_rate: {
        Row: ExchangeRate;
        Insert: Omit<ExchangeRate, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<ExchangeRate>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: Partial<Category>;
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: Partial<Product>;
        Relationships: [];
      };
      product_variants: {
        Row: ProductVariant;
        Insert: ProductVariantInsert;
        Update: Partial<ProductVariant>;
        Relationships: [];
      };
      product_prices: {
        Row: ProductPrice;
        Insert: ProductPriceInsert;
        Update: Partial<ProductPrice>;
        Relationships: [];
      };
      product_images: {
        Row: ProductImage;
        Insert: ProductImageInsert;
        Update: Partial<ProductImage>;
        Relationships: [];
      };
      inventory_logs: {
        Row: InventoryLog;
        Insert: Omit<
          InventoryLog,
          "id" | "created_at" | "quantity_before" | "quantity_after" | "reserved_before" | "reserved_after"
        > & {
          id?: string;
          created_at?: string;
          quantity_before?: number;
          quantity_after?: number;
          reserved_before?: number;
          reserved_after?: number;
        };
        Update: Partial<InventoryLog>;
        Relationships: [];
      };
      coupons: {
        Row: Coupon;
        Insert: CouponInsert;
        Update: Partial<CouponInsert>;
        Relationships: [];
      };
    };
    Views: {
      catalog_list_view: {
        Row: CatalogListItem;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      catalog_product_detail_view: {
        Row: {
          store_id: string;
          store_slug: string;
          store_name: string;
          id: string;
          slug: string;
          name: string;
          description: string | null;
          short_description: string | null;
          brand: string | null;
          tags: string[];
          is_featured: boolean;
          metadata: Record<string, unknown>;
          updated_at: string;
          category_id: string;
          category_name: string;
          category_slug: string;
          category_path: string;
          exchange_rate_used: number | null;
          variants: unknown;
          images: unknown;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Functions: {
      is_member_of_store: {
        Args: { target_store_id: string };
        Returns: boolean;
      };
      is_store_admin: {
        Args: { target_store_id: string };
        Returns: boolean;
      };
      get_my_store_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      product_store_id: {
        Args: { p_product_id: string };
        Returns: string;
      };
      variant_store_id: {
        Args: { p_variant_id: string };
        Returns: string;
      };
      get_current_exchange_rate: {
        Args: Record<string, never>;
        Returns: number;
      };
      price_in_ves: {
        Args: { p_amount_usd: number };
        Returns: number;
      };
      process_catalog_order: {
        Args: { p_store_slug: string; p_items: unknown };
        Returns: { error?: string; success?: boolean };
      };
      redeem_coupon: {
        Args: { p_store_slug: string; p_code: string };
        Returns: { error?: string; success?: boolean };
      };
    };
    Enums: {
      inventory_movement_type: InventoryMovementType;
    };
    CompositeTypes: Record<string, never>;
  };
}
