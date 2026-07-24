"use client";

import { Plus, Trash2 } from "lucide-react";
import type {
  DeliveryMeetingPoint,
  DeliveryZone,
} from "@/lib/store-settings/types";
import {
  emptyDeliveryZone,
  emptyMeetingPoint,
} from "@/lib/store-settings/delivery-zones";

interface DeliveryZonesEditorProps {
  deliveryZones: DeliveryZone[];
  pickupPoints: DeliveryMeetingPoint[];
  showDeliveryZones: boolean;
  showPickupPoints: boolean;
  onDeliveryZonesChange: (zones: DeliveryZone[]) => void;
  onPickupPointsChange: (points: DeliveryMeetingPoint[]) => void;
}

function MeetingPointsEditor({
  points,
  onChange,
  pointLabel,
}: {
  points: DeliveryMeetingPoint[];
  onChange: (points: DeliveryMeetingPoint[]) => void;
  pointLabel: string;
}) {
  function updatePoint(index: number, patch: Partial<DeliveryMeetingPoint>) {
    onChange(
      points.map((point, i) => (i === index ? { ...point, ...patch } : point)),
    );
  }

  function removePoint(index: number) {
    onChange(points.filter((_, i) => i !== index));
  }

  function addPoint() {
    onChange([...points, emptyMeetingPoint()]);
  }

  return (
    <div className="space-y-2">
      {points.map((point, index) => (
        <div
          key={point.id}
          className="rounded-lg border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/40"
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <input
                type="text"
                value={point.label}
                onChange={(event) =>
                  updatePoint(index, { label: event.target.value })
                }
                placeholder={`${pointLabel} (ej: CC Sambil, estacionamiento norte)`}
                className="input-field w-full"
              />
              <input
                type="text"
                value={point.reference ?? ""}
                onChange={(event) =>
                  updatePoint(index, { reference: event.target.value })
                }
                placeholder="Referencia opcional (hora, piso, indicaciones…)"
                className="input-field w-full text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => removePoint(index)}
              className="mt-1 shrink-0 rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
              aria-label={`Eliminar ${pointLabel}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addPoint}
        className="flex items-center gap-1.5 text-xs font-medium text-teal-700 transition hover:text-teal-900 dark:text-teal-300"
      >
        <Plus className="h-3.5 w-3.5" />
        Añadir {pointLabel.toLowerCase()}
      </button>
    </div>
  );
}

export function DeliveryZonesEditor({
  deliveryZones,
  pickupPoints,
  showDeliveryZones,
  showPickupPoints,
  onDeliveryZonesChange,
  onPickupPointsChange,
}: DeliveryZonesEditorProps) {
  function updateZone(index: number, patch: Partial<DeliveryZone>) {
    onDeliveryZonesChange(
      deliveryZones.map((zone, i) =>
        i === index ? { ...zone, ...patch } : zone,
      ),
    );
  }

  function removeZone(index: number) {
    onDeliveryZonesChange(deliveryZones.filter((_, i) => i !== index));
  }

  function addZone() {
    onDeliveryZonesChange([...deliveryZones, emptyDeliveryZone()]);
  }

  if (!showDeliveryZones && !showPickupPoints) return null;

  return (
    <div className="space-y-4">
      {showDeliveryZones ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mb-3">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Zonas de entrega personalizada
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Ideal para negocios 100% online: define áreas y puntos de encuentro
              sin necesidad de tienda física. Si no añades zonas, el cliente
              indicará su dirección libremente.
            </p>
          </div>

          {deliveryZones.length === 0 ? (
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
              Sin zonas configuradas — el checkout pedirá dirección de entrega.
            </p>
          ) : (
            <div className="space-y-3">
              {deliveryZones.map((zone, index) => (
                <div
                  key={zone.id}
                  className="rounded-lg border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/40"
                >
                  <div className="mb-3 flex items-start gap-2">
                    <input
                      type="text"
                      value={zone.name}
                      onChange={(event) =>
                        updateZone(index, { name: event.target.value })
                      }
                      placeholder="Nombre de la zona (ej: Valencia norte, Caracas este)"
                      className="input-field min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeZone(index)}
                      className="mt-1 shrink-0 rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                      aria-label="Eliminar zona"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                    Puntos de encuentro en esta zona
                  </p>
                  <MeetingPointsEditor
                    points={zone.meetingPoints}
                    onChange={(meetingPoints) =>
                      updateZone(index, { meetingPoints })
                    }
                    pointLabel="Punto de encuentro"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addZone}
            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-teal-700 transition hover:text-teal-900 dark:text-teal-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Añadir zona
          </button>
        </div>
      ) : null}

      {showPickupPoints ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mb-3">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Puntos de retiro / encuentro
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Lugares donde el cliente puede retirar el pedido. No requieren
              dirección de tienda física. Si no añades puntos, coordinarán el
              retiro por WhatsApp.
            </p>
          </div>

          <MeetingPointsEditor
            points={pickupPoints}
            onChange={onPickupPointsChange}
            pointLabel="Punto de retiro"
          />
        </div>
      ) : null}
    </div>
  );
}
