"use client";

import { Plus, Trash2 } from "lucide-react";
import type {
  FoodModifierGroup,
  FoodModifiersConfig,
} from "@/lib/rubros/modules/alimentos";

interface FoodModifiersEditorProps {
  value: FoodModifiersConfig;
  onChange: (value: FoodModifiersConfig) => void;
  disabled?: boolean;
}

export function FoodModifiersEditor({
  value,
  onChange,
  disabled = false,
}: FoodModifiersEditorProps) {
  function updateGroup(groupId: string, patch: Partial<FoodModifierGroup>) {
    onChange({
      groups: value.groups.map((group) =>
        group.id === groupId ? { ...group, ...patch } : group,
      ),
    });
  }

  function removeGroup(groupId: string) {
    onChange({
      groups: value.groups.filter((group) => group.id !== groupId),
    });
  }

  function addGroup() {
    onChange({
      groups: [
        ...value.groups,
        {
          id: crypto.randomUUID(),
          name: "Nuevo grupo",
          required: false,
          min: 0,
          max: 3,
          options: [
            {
              id: crypto.randomUUID(),
              name: "Opción",
              priceExtraUsd: 0,
            },
          ],
        },
      ],
    });
  }

  function addOption(groupId: string) {
    onChange({
      groups: value.groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              options: [
                ...group.options,
                {
                  id: crypto.randomUUID(),
                  name: "Nueva opción",
                  priceExtraUsd: 0,
                },
              ],
              max: Math.max(group.max, group.options.length + 1),
            }
          : group,
      ),
    });
  }

  function updateOption(
    groupId: string,
    optionId: string,
    patch: { name?: string; priceExtraUsd?: number },
  ) {
    onChange({
      groups: value.groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              options: group.options.map((option) =>
                option.id === optionId ? { ...option, ...patch } : option,
              ),
            }
          : group,
      ),
    });
  }

  function removeOption(groupId: string, optionId: string) {
    onChange({
      groups: value.groups
        .map((group) =>
          group.id === groupId
            ? {
                ...group,
                options: group.options.filter((option) => option.id !== optionId),
              }
            : group,
        )
        .filter((group) => group.options.length > 0),
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-orange-200/70 bg-orange-50/40 p-4 dark:border-orange-900/40 dark:bg-orange-950/20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Modificadores y adiciones
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Extras, preferencias o ingredientes (queso extra, sin cebolla,
            término de carne…).
          </p>
        </div>
        <button
          type="button"
          onClick={addGroup}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-800 hover:text-orange-900 disabled:opacity-50 dark:text-orange-300"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Añadir grupo
        </button>
      </div>

      {value.groups.length === 0 ? (
        <p className="text-xs text-zinc-500">
          Sin modificadores. El cliente pedirá el plato tal cual.
        </p>
      ) : (
        <div className="space-y-3">
          {value.groups.map((group) => (
            <div
              key={group.id}
              className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) =>
                    updateGroup(group.id, { name: e.target.value })
                  }
                  disabled={disabled}
                  className="input-field mt-0 min-w-[8rem] flex-1 py-1.5 text-sm"
                  placeholder="Nombre del grupo"
                />
                <label className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={group.required}
                    onChange={(e) =>
                      updateGroup(group.id, {
                        required: e.target.checked,
                        min: e.target.checked ? Math.max(1, group.min) : 0,
                      })
                    }
                    disabled={disabled}
                  />
                  Obligatorio
                </label>
                <button
                  type="button"
                  onClick={() => removeGroup(group.id)}
                  disabled={disabled}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-red-600 disabled:opacity-50"
                  aria-label={`Quitar grupo ${group.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Quitar
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {group.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input
                      type="text"
                      value={option.name}
                      onChange={(e) =>
                        updateOption(group.id, option.id, {
                          name: e.target.value,
                        })
                      }
                      disabled={disabled}
                      className="input-field mt-0 min-w-[8rem] flex-1 py-1.5 text-sm"
                      placeholder="Opción"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={option.priceExtraUsd}
                      onChange={(e) =>
                        updateOption(group.id, option.id, {
                          priceExtraUsd:
                            parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={disabled}
                      className="input-field mt-0 w-24 py-1.5 text-sm"
                      aria-label={`Precio extra ${option.name}`}
                      title="Extra USD"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(group.id, option.id)}
                      disabled={disabled}
                      className="text-zinc-400 hover:text-red-600 disabled:opacity-50"
                      aria-label={`Quitar ${option.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addOption(group.id)}
                disabled={disabled}
                className="mt-2 text-xs font-medium text-orange-800 hover:text-orange-900 disabled:opacity-50 dark:text-orange-300"
              >
                + Opción
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
