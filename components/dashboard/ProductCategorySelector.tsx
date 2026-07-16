"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CUSTOM_PRODUCT_CATEGORY_VALUE } from "@/lib/products/category-selection";
import type { ProductCategoryOption } from "@/src/config/categories";
import { cn } from "@/lib/cn";

interface ProductCategorySelectorProps {
  id: string;
  rubroLabel: string;
  categories: ProductCategoryOption[];
  categorySlug: string;
  customCategoryName: string;
  onCategorySlugChange: (slug: string) => void;
  onCustomCategoryNameChange: (name: string) => void;
  className?: string;
  selectClassName?: string;
  labelClassName?: string;
  required?: boolean;
}

export function ProductCategorySelector({
  id,
  rubroLabel,
  categories,
  categorySlug,
  customCategoryName,
  onCategorySlugChange,
  onCustomCategoryNameChange,
  className,
  selectClassName,
  labelClassName,
  required = true,
}: ProductCategorySelectorProps) {
  const suggested = categories.filter((item) => !item.isCustom);
  const customSaved = categories.filter((item) => item.isCustom);
  const isCustomMode = categorySlug === CUSTOM_PRODUCT_CATEGORY_VALUE;

  return (
    <div className={className}>
      <Label htmlFor={id} className={labelClassName ?? "payment-field-label"}>
        Categoría {required ? <span className="text-red-500">*</span> : null}
      </Label>
      <Select
        id={id}
        value={categorySlug}
        required={required}
        onChange={(event) => onCategorySlugChange(event.target.value)}
        className={cn("mt-1.5", selectClassName ?? "payment-field-input")}
      >
        {suggested.length > 0 ? (
          <optgroup label={`Sugeridas · ${rubroLabel}`}>
            {suggested.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.label}
              </option>
            ))}
          </optgroup>
        ) : null}
        {customSaved.length > 0 ? (
          <optgroup label="Tus categorías">
            {customSaved.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.label}
              </option>
            ))}
          </optgroup>
        ) : null}
        <option value={CUSTOM_PRODUCT_CATEGORY_VALUE}>+ Agregar nueva categoría</option>
      </Select>

      {isCustomMode ? (
        <div className="mt-3">
          <Label htmlFor={`${id}-custom`} className={labelClassName ?? "payment-field-label"}>
            Nombre de la categoría <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`${id}-custom`}
            name="custom_category_name"
            value={customCategoryName}
            onChange={(event) => onCustomCategoryNameChange(event.target.value)}
            placeholder="Ej: Accesorios de playa"
            maxLength={80}
            required
            className={cn("mt-1.5", selectClassName ?? "payment-field-input")}
          />
        </div>
      ) : null}

      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        Sugerencias según tu rubro ({rubroLabel}). Puedes crear una categoría propia si lo necesitas.
      </p>
    </div>
  );
}
