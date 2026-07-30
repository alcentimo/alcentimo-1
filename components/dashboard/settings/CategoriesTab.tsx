"use client";

import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  createStoreCategoryAction,
  deleteStoreCategoryAction,
  reorderStoreCategoriesAction,
  updateStoreCategoryAction,
} from "@/lib/categories/actions";
import type { StoreCategoryRow } from "@/lib/categories/types";
import { cn } from "@/lib/cn";

interface CategoriesTabProps {
  initialCategories: StoreCategoryRow[];
  suggestedNames?: string[];
}

export function CategoriesTab({
  initialCategories,
  suggestedNames = [],
}: CategoriesTabProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function refreshMessage(next: string | null, err?: string) {
    setError(err ?? null);
    setSuccess(err ? null : next);
  }

  function handleCreate() {
    refreshMessage(null);
    startTransition(async () => {
      const result = await createStoreCategoryAction({ name });
      if (result.error) {
        refreshMessage(null, result.error);
        return;
      }
      if (result.category) {
        setCategories((prev) => [...prev, result.category!]);
      }
      setName("");
      refreshMessage("Categoría creada. Ya puedes usarla en tus productos.");
    });
  }

  function handleRename(category: StoreCategoryRow) {
    const nextName = editingName.trim();
    if (!nextName || nextName === category.name) {
      setEditingId(null);
      return;
    }

    refreshMessage(null);
    startTransition(async () => {
      const result = await updateStoreCategoryAction({
        categoryId: category.id,
        name: nextName,
      });
      if (result.error) {
        refreshMessage(null, result.error);
        return;
      }
      if (result.category) {
        setCategories((prev) =>
          prev.map((row) => (row.id === category.id ? result.category! : row)),
        );
      }
      setEditingId(null);
      refreshMessage("Categoría actualizada.");
    });
  }

  function handleToggleActive(category: StoreCategoryRow) {
    refreshMessage(null);
    startTransition(async () => {
      const result = await updateStoreCategoryAction({
        categoryId: category.id,
        isActive: !category.is_active,
      });
      if (result.error) {
        refreshMessage(null, result.error);
        return;
      }
      if (result.category) {
        setCategories((prev) =>
          prev.map((row) => (row.id === category.id ? result.category! : row)),
        );
      }
      refreshMessage(
        category.is_active
          ? "Categoría ocultada del catálogo público."
          : "Categoría visible en el catálogo público.",
      );
    });
  }

  function handleMove(categoryId: string, direction: -1 | 1) {
    const index = categories.findIndex((row) => row.id === categoryId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= categories.length) return;

    const next = [...categories];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setCategories(next);

    refreshMessage(null);
    startTransition(async () => {
      const result = await reorderStoreCategoriesAction({
        orderedIds: next.map((row) => row.id),
      });
      if (result.error) {
        setCategories(categories);
        refreshMessage(null, result.error);
        return;
      }
      if (result.categories) {
        setCategories(result.categories);
      }
      refreshMessage("Orden de categorías actualizado.");
    });
  }

  function handleDelete(category: StoreCategoryRow) {
    if (category.product_count > 0) {
      refreshMessage(
        null,
        `No puedes eliminar "${category.name}" mientras tenga productos. Reasígnalos o desactívala.`,
      );
      return;
    }

    refreshMessage(null);
    startTransition(async () => {
      const result = await deleteStoreCategoryAction({
        categoryId: category.id,
      });
      if (result.error) {
        refreshMessage(null, result.error);
        return;
      }
      setCategories((prev) => prev.filter((row) => row.id !== category.id));
      refreshMessage("Categoría eliminada.");
    });
  }

  return (
    <SettingsTabShell hideSaveBar error={error}>
      <SettingsSection
        title="Categorías del catálogo"
        description="Crea y ordena las categorías principales de tu tienda (por ejemplo Damas, Caballeros, Niños). Los compradores las usan para filtrar el catálogo."
      >
        <div className="space-y-4">
          {success ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
              {success}
            </p>
          ) : null}

          <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <Label htmlFor="new-store-category" className="payment-field-label">
              Nueva categoría
            </Label>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
              <Input
                id="new-store-category"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej: Damas, Caballeros, Niños…"
                maxLength={80}
                className="payment-field-input sm:flex-1"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (name.trim() && !pending) handleCreate();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleCreate}
                disabled={pending || !name.trim()}
                className="btn-brand h-10 shrink-0 gap-1.5 px-4 text-sm"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden="true" />
                )}
                Agregar
              </Button>
            </div>
            {suggestedNames.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {suggestedNames
                  .filter(
                    (suggestion) =>
                      !categories.some(
                        (row) =>
                          row.name.toLowerCase() === suggestion.toLowerCase(),
                      ),
                  )
                  .map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={pending}
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                      onClick={() => {
                        setName(suggestion);
                        refreshMessage(null);
                        startTransition(async () => {
                          const result = await createStoreCategoryAction({
                            name: suggestion,
                          });
                          if (result.error) {
                            refreshMessage(null, result.error);
                            return;
                          }
                          if (result.category) {
                            setCategories((prev) => [...prev, result.category!]);
                          }
                          setName("");
                          refreshMessage(`Se agregó “${suggestion}”.`);
                        });
                      }}
                    >
                      + {suggestion}
                    </button>
                  ))}
              </div>
            ) : null}
          </div>

          {categories.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Aún no tienes categorías. Crea las tuyas o se crearán al asignarlas
              en un producto.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200/90 overflow-hidden rounded-xl border border-zinc-200/90 dark:divide-zinc-800 dark:border-zinc-800">
              {categories.map((category, index) => {
                const isEditing = editingId === category.id;

                return (
                  <li
                    key={category.id}
                    className={cn(
                      "flex flex-col gap-3 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-zinc-950",
                      !category.is_active && "opacity-70",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <Input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          className="payment-field-input max-w-sm"
                          maxLength={80}
                          autoFocus
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleRename(category);
                            }
                            if (event.key === "Escape") {
                              setEditingId(null);
                            }
                          }}
                          onBlur={() => handleRename(category)}
                        />
                      ) : (
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => {
                            setEditingId(category.id);
                            setEditingName(category.name);
                          }}
                        >
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {category.name}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {category.product_count} producto
                            {category.product_count === 1 ? "" : "s"}
                            {!category.is_active ? " · oculta" : ""}
                          </p>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={pending || index === 0}
                        aria-label={`Subir ${category.name}`}
                        onClick={() => handleMove(category.id, -1)}
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={pending || index === categories.length - 1}
                        aria-label={`Bajar ${category.name}`}
                        onClick={() => handleMove(category.id, 1)}
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={pending}
                        aria-label={
                          category.is_active
                            ? `Ocultar ${category.name}`
                            : `Mostrar ${category.name}`
                        }
                        onClick={() => handleToggleActive(category)}
                      >
                        {category.is_active ? (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        disabled={pending || category.product_count > 0}
                        aria-label={`Eliminar ${category.name}`}
                        title={
                          category.product_count > 0
                            ? "Reasigna los productos antes de eliminar"
                            : "Eliminar categoría"
                        }
                        onClick={() => handleDelete(category)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}
