import "leaflet/dist/leaflet.css";

import L, { type LeafletMouseEvent, type Marker as LeafletMarker } from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

const pickerIcon = L.divIcon({
  className: "",
  html: '<div class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-[var(--shadow-card)]"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

export function LocationPickerMap({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
}) {
  const center: [number, number] = [latitude, longitude];

  return (
    <MapContainer
      center={center}
      zoom={11}
      scrollWheelZoom={false}
      className="h-72 w-full dark:[&_.leaflet-tile-pane]:brightness-75 dark:[&_.leaflet-tile-pane]:contrast-125"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationPickerCenter position={center} />
      <LocationPickerEvents onChange={onChange} />
      <Marker
        draggable
        position={center}
        icon={pickerIcon}
        eventHandlers={{
          dragend: (event) => {
            const marker = event.target as LeafletMarker;
            const next = marker.getLatLng();
            onChange(next.lat, next.lng);
          },
        }}
      />
    </MapContainer>
  );
}

function LocationPickerCenter({ position }: { position: [number, number] }) {
  const map = useMap();
  const [latitude, longitude] = position;

  useEffect(() => {
    map.setView([latitude, longitude], Math.max(map.getZoom(), 13), { animate: true });
  }, [latitude, longitude, map]);

  return null;
}

function LocationPickerEvents({
  onChange,
}: {
  onChange: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click: (event: LeafletMouseEvent) => {
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}
