"use client";

import { useMemo } from "react";
import { Check, MapPin } from "lucide-react";
import type { DeliveryZone } from "@/lib/store-settings/types";
import {
  findDeliveryZone,
  findMeetingPointInZone,
} from "@/lib/store-settings/delivery-zones";
import { cn } from "@/lib/cn";

interface DeliveryZonePickerProps {
  zones: DeliveryZone[];
  selectedZoneId: string | null;
  selectedPointId: string | null;
  notes: string;
  onZoneChange: (zoneId: string | null) => void;
  onPointChange: (pointId: string | null) => void;
  onNotesChange: (notes: string) => void;
}

export function DeliveryZonePicker({
  zones,
  selectedZoneId,
  selectedPointId,
  notes,
  onZoneChange,
  onPointChange,
  onNotesChange,
}: DeliveryZonePickerProps) {
  const selectedZone = useMemo(
    () => findDeliveryZone(zones, selectedZoneId),
    [zones, selectedZoneId],
  );
  const selectedPoint = useMemo(
    () => findMeetingPointInZone(selectedZone, selectedPointId),
    [selectedZone, selectedPointId],
  );

  return (
    <div className="shipping-branch-picker">
      <div className="shipping-branch-picker-header">
        <p className="shipping-branch-picker-title">Zona y punto de encuentro</p>
        <p className="shipping-branch-picker-desc">
          Elige el área y el lugar donde coordinaremos la entrega contigo.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
          Zona
        </p>
        <ul className="shipping-branch-list" role="listbox" aria-label="Zonas disponibles">
          {zones.map((zone) => {
            const isSelected = selectedZoneId === zone.id;
            return (
              <li key={zone.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onZoneChange(zone.id);
                    onPointChange(null);
                  }}
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
                      {zone.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                      {zone.meetingPoints.length}{" "}
                      {zone.meetingPoints.length === 1
                        ? "punto disponible"
                        : "puntos disponibles"}
                    </span>
                  </span>
                  {isSelected ? (
                    <Check className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selectedZone && selectedZone.meetingPoints.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Punto de encuentro · {selectedZone.name}
          </p>
          <ul
            className="shipping-branch-list"
            role="listbox"
            aria-label="Puntos de encuentro"
          >
            {selectedZone.meetingPoints.map((point) => {
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
        </div>
      ) : selectedZone ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Esta zona aún no tiene puntos de encuentro configurados.
        </p>
      ) : null}

      {selectedPoint ? (
        <div className="shipping-branch-selected">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {selectedZone?.name} · {selectedPoint.label}
            </p>
            {selectedPoint.reference ? (
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {selectedPoint.reference}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              onZoneChange(null);
              onPointChange(null);
            }}
            className="shipping-branch-change-btn"
          >
            Cambiar
          </button>
        </div>
      ) : null}

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
