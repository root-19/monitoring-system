"use client";

import { useCallback, useState } from "react";
import { APIProvider, AdvancedMarker, Map, Pin, type MapMouseEvent } from "@vis.gl/react-google-maps";
import { Crosshair, MapPin, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui";

export type LatLng = { lat: number; lng: number };

export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
export const PH_CENTER: LatLng = { lat: 14.5995, lng: 120.9842 };

function parseGoogleMapsLink(text: string): LatLng | null {
  // Handles "14.60, 120.98", "@14.60,120.98,17z", "?q=14.60,120.98"
  const m = text.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function LocationPicker({ value, onChange }: { value: LatLng | null; onChange: (v: LatLng | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [paste, setPaste] = useState("");

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErr("Your browser does not support location.");
      return;
    }
    setBusy(true);
    setErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setBusy(false);
      },
      () => {
        setErr("Could not get your location. Allow location access or paste a Google Maps link.");
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onChange]);

  const onMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (e.detail.latLng) onChange({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation} loading={busy}>
          <Crosshair className="size-4" /> Use my current location
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <Trash2 className="size-4" /> Clear pin
          </Button>
        )}
      </div>

      {MAPS_KEY ? (
        <div className="h-56 overflow-hidden rounded-xl border border-line">
          <APIProvider apiKey={MAPS_KEY}>
            <Map
              defaultCenter={value ?? PH_CENTER}
              defaultZoom={value ? 17 : 6}
              mapId="PGI_PICKER"
              gestureHandling="greedy"
              disableDefaultUI
              zoomControl
              onClick={onMapClick}
              style={{ width: "100%", height: "100%" }}
            >
              {value && (
                <AdvancedMarker position={value} draggable onDragEnd={(e) => e.latLng && onChange({ lat: e.latLng.lat(), lng: e.latLng.lng() })}>
                  <Pin background="#0b5fff" glyphColor="#fff" borderColor="#0a3aa0" />
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
        </div>
      ) : value ? (
        <iframe
          title="Location preview"
          className="h-48 w-full rounded-xl border border-line"
          loading="lazy"
          src={`https://maps.google.com/maps?q=${value.lat},${value.lng}&z=16&output=embed`}
        />
      ) : null}

      <div className="flex gap-2">
        <Input
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="or paste a Google Maps link / coordinates"
          className="h-10 text-sm"
          onBlur={() => {
            const p = parseGoogleMapsLink(paste);
            if (p) {
              onChange(p);
              setErr(null);
            } else if (paste.trim()) setErr("Could not read coordinates from that text.");
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-10"
          onClick={() => {
            const p = parseGoogleMapsLink(paste);
            if (p) {
              onChange(p);
              setErr(null);
            } else setErr("Could not read coordinates from that text.");
          }}
        >
          <MapPin className="size-4" /> Set
        </Button>
      </div>
      {value && (
        <p className="text-xs text-ink-500">
          Pinned at {value.lat.toFixed(5)}, {value.lng.toFixed(5)} ·{" "}
          <a className="text-brand-600 underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${value.lat},${value.lng}`}>
            open in Google Maps
          </a>
        </p>
      )}
      {!MAPS_KEY && !value && <p className="text-xs text-ink-300">Tip: add a Google Maps API key in .env.local to pick a spot by clicking on a map.</p>}
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}
