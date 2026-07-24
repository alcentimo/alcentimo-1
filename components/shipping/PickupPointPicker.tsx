"use client";

import { useMemo } from "react";
import { Check, MapPin } from "lucide-react";
import type { DeliveryMeetingPoint } from "@/lib/store-settings/types";
import { findPickupPoint } from "@/lib/store-settings/delivery-zones";
import { cn } from "@/lib/cn";

interface PickupPointPickerProps {
  points: DeliveryMeetingPoint[];
  selectedPointId: string | null;
  notes: string;
  onPointChange: (pointId: string | null) => void;
  onNotesChange: (notes: string) => void;
}

export function PickupPointPicker({
  points,
  selectedPointId,
  notes,
  onPointChange,
  onNotesChange,
}: PickupPointPickerProps) {
  const selectedPoint = useMemo(
    () => findPickupPoint(points, selectedPointId),
    [points, selectedPointId],
  );

  return (
    <div className="shipping-branch-picker">
      <div className="shipping-branch-picker-header">
        <p className="shipping-branch-picker-title">Punto de retiro</p>
        <p className="shipping-branch-picker-desc">
          Elige dónde retirarás tu pedido. No necesitas ir a una tienda física.
        </p>
      </div>

      {selectedPoint ? (
        <div className="shipping-branch-selected">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {selectedPoint.label}
            </p>
            {selectedPoint.reference ? (
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {selectedPoint.reference}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onPointChange(null)}
            className="shipping-branch-change-btn"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <ul className="shipping-branch-list" role="listbox" aria-label="Puntos de retiro">
          {points.map((point) => {
            const isSelected = selectedPointId === point.id;
            return (
              <li key={point.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onPointChange(point.id)}
                  className={cn(
                    "shipping-branch-option",
                    isSelected && "shipping-branch-option-selected",
                  )}
                >
                  <MapPin
                    className="mt-0.5 h-4 w-4 shrink-0 text-teal-600"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {point.label}
                    </span>
                    {point.reference ? (
                      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                        {point.reference}
                      </span>
                    ) : null}
                  </span>
                  {isSelected ? (
                    <Check className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <label className="txn-field mt-1">
        <span>Notas adicionales (opcional)</span>
        <textarea
          rows={2}
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Horario preferido, referencia extra…"
          className="txn-input min-h-[4rem] resize-y"
        />
      </label>
    </div>
  );
}
