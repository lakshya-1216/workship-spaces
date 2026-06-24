import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { Map, MapPin } from "lucide-react";
import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

type WorkspaceLocation = {
  type?: string;
  coordinates?: number[];
};

type MapPoint = {
  id: string;
  title: string;
  subtitle?: string;
  position: [number, number];
};

const markerIcon = L.divIcon({
  className: "",
  html: '<div class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-[var(--shadow-card)]"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg></div>',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -36],
});

export function WorkspaceLocationMap({
  location,
  title,
  address,
  city,
  mapsUrl,
}: {
  location?: WorkspaceLocation;
  title: string;
  address?: string;
  city?: string;
  mapsUrl?: string | null;
}) {
  const center = useMemo(() => getLeafletPosition(location), [location]);
  const points = useMemo<MapPoint[]>(
    () =>
      center
        ? [
            {
              id: "workspace",
              title,
              subtitle: address || city,
              position: center,
            },
          ]
        : [],
    [address, center, city, title],
  );

  if (!center) {
    return (
      <MapFallback
        title="Location map unavailable"
        message="This workspace does not have valid coordinates yet."
      />
    );
  }

  return (
    <section className="border-b border-border py-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Where you'll work</h2>
          {(address || city) && (
            <p className="mt-1 text-sm text-muted-foreground">{address || city}</p>
          )}
        </div>
        {/* Open in Maps button — inline with section heading */}
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open workspace location in Google Maps"
            className="group inline-flex shrink-0 items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary-hover hover:shadow-[var(--shadow-card)] active:scale-95"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <Map className="h-4 w-4" />
            Open in Maps
          </a>
        ) : (
          <span
            title="Location coordinates unavailable"
            className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold opacity-40"
          >
            <Map className="h-4 w-4" />
            Location unavailable
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-soft)]">
        <OpenStreetMap center={center} points={points} />
      </div>
    </section>
  );
}

function OpenStreetMap({ center, points }: { center: [number, number]; points: MapPoint[] }) {
  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom={false}
      className="h-[340px] w-full md:h-[420px] dark:[&_.leaflet-tile-pane]:brightness-75 dark:[&_.leaflet-tile-pane]:contrast-125"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((point) => (
        <Marker key={point.id} position={point.position} icon={markerIcon}>
          <Popup>
            <div className="min-w-40">
              <p className="font-semibold">{point.title}</p>
              {point.subtitle && (
                <p className="mt-1 text-xs text-muted-foreground">{point.subtitle}</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function getLeafletPosition(location?: WorkspaceLocation): [number, number] | null {
  if (location?.type !== "Point" || !Array.isArray(location.coordinates)) return null;

  const [longitude, latitude] = location.coordinates;
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }

  return [latitude, longitude];
}

function MapFallback({ title, message }: { title: string; message: string }) {
  return (
    <section className="border-b border-border py-6">
      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-soft)]">
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary-hover">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-sm">{message}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
