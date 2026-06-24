import "leaflet/dist/leaflet.css";

import L, { type LatLngBoundsExpression } from "leaflet";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  MapPin,
  Star,
  Users,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

type Workspace = {
  _id?: string;
  id?: string;
  title: string;
  city?: string;
  country?: string;
  address?: string;
  price?: number;
  pricePerHour?: number;
  rating?: number;
  numReviews?: number;
  reviewCount?: number;
  images?: string[];
  capacity?: number;
  category?: string;
  available?: boolean;
  location?: {
    type?: string;
    coordinates?: [number, number];
  };
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1024&q=80";

function getWorkspaceId(workspace: Workspace): string {
  return workspace._id || workspace.id || "";
}

function getPrice(workspace: Workspace): number {
  return workspace.price ?? workspace.pricePerHour ?? 0;
}

function getRating(workspace: Workspace): number | string {
  return workspace.rating ?? "New";
}

function getReviewCount(workspace: Workspace): number {
  return workspace.numReviews ?? workspace.reviewCount ?? 0;
}

function getShortAddress(address?: string): string | null {
  if (!address) return null;

  const compact = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  if (compact.length <= 42) return compact;
  return `${compact.slice(0, 39).trimEnd()}...`;
}

function getCategoryLabel(category?: string): string | null {
  if (!category) return null;

  const knownLabels: Record<string, string> = {
    coworking: "Coworking",
    private: "Private Office",
    meeting: "Meeting Room",
  };

  return (
    knownLabels[category] ||
    category.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function getValidCoordinates(workspace: Workspace): [number, number] | null {
  const coords = workspace.location?.coordinates;
  if (
    !coords ||
    !Array.isArray(coords) ||
    coords.length !== 2 ||
    typeof coords[0] !== "number" ||
    typeof coords[1] !== "number" ||
    Number.isNaN(coords[0]) ||
    Number.isNaN(coords[1])
  ) {
    return null;
  }

  return [coords[1], coords[0]];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createMarkerIcon(active: boolean, hovered: boolean) {
  const isHighlighted = active || hovered;
  const scale = active ? "scale-150" : hovered ? "scale-125" : "scale-100";
  const brightness = active ? "brightness-110" : hovered ? "brightness-105" : "brightness-100";

  return L.divIcon({
    className: "",
    html: `<div class="flex h-9 w-9 items-center justify-center rounded-full border-2 ${
      isHighlighted
        ? "border-teal-400 bg-teal-600 shadow-[0_0_12px_rgba(20,184,166,0.4)]"
        : "border-white bg-teal-600 shadow-md"
    } text-white text-xs font-bold transition-all duration-200 ${scale} ${brightness}"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/></svg></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
}

function MapPreviewDismiss({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  useMapEvents({
    click: () => {
      onDismiss();
    },
  });

  return null;
}

function WorkspacePreviewCard({
  workspace,
  coords,
}: {
  workspace: Workspace;
  coords: [number, number];
}) {
  const map = useMap();
  const cardRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({
    left: 8,
    top: 8,
    width: 280,
    ready: false,
  });

  const id = getWorkspaceId(workspace);
  const price = getPrice(workspace);
  const rating = getRating(workspace);
  const reviewCount = getReviewCount(workspace);
  const shortAddress = getShortAddress(workspace.address);
  const categoryLabel = getCategoryLabel(workspace.category);
  const capacityLabel =
    typeof workspace.capacity === "number" && workspace.capacity > 0
      ? `${workspace.capacity} ${workspace.capacity === 1 ? "person" : "people"}`
      : null;
  const isAvailable = workspace.available !== false;

  useLayoutEffect(() => {
    const updatePosition = () => {
      const container = map.getContainer();
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const cardHeight = cardRef.current?.offsetHeight ?? 260;
      const markerPoint = map.latLngToContainerPoint(coords);
      const padding = 8;
      const gap = 18;
      const preferredWidth = Math.min(280, Math.max(250, containerWidth - padding * 2));
      const width = Math.min(preferredWidth, containerWidth - padding * 2);
      const showOnRight = markerPoint.x + gap + width <= containerWidth - padding;
      const proposedLeft = showOnRight ? markerPoint.x + gap : markerPoint.x - width - gap;
      const proposedTop = markerPoint.y - cardHeight / 2;

      setLayout({
        left: clamp(proposedLeft, padding, Math.max(padding, containerWidth - width - padding)),
        top: clamp(proposedTop, padding, Math.max(padding, containerHeight - cardHeight - padding)),
        width,
        ready: true,
      });
    };

    updatePosition();
    map.on("move zoom resize", updatePosition);

    const resizeObserver = new ResizeObserver(() => updatePosition());
    resizeObserver.observe(map.getContainer());

    return () => {
      map.off("move zoom resize", updatePosition);
      resizeObserver.disconnect();
    };
  }, [coords, map, workspace]);

  return (
    <div
      ref={cardRef}
      style={{ left: layout.left, top: layout.top, width: layout.width }}
      className={`pointer-events-auto absolute z-[1000] overflow-hidden rounded-2xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-sm transition-all duration-200 ${
        layout.ready ? "opacity-100" : "opacity-0"
      }`}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <img
        src={workspace.images?.[0] || FALLBACK_IMAGE}
        alt={workspace.title}
        className="h-32 w-full object-cover"
      />
      <div className="space-y-3 p-3.5">
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
            {workspace.title}
          </h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            {workspace.city && (
              <p className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-1">{workspace.city}</span>
              </p>
            )}
            {shortAddress && <p className="line-clamp-1 pl-5">{shortAddress}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-1 text-xs font-medium text-foreground">
            <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
            <span>{rating}</span>
            {reviewCount > 0 && (
              <span className="truncate text-muted-foreground">({reviewCount} reviews)</span>
            )}
          </p>
          <p className="shrink-0 text-right text-base font-extrabold text-foreground">
            {"\u20B9"}
            {price}
            <span className="ml-1 text-xs font-medium text-muted-foreground">/hour</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {capacityLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
              <Users className="h-3.5 w-3.5" />
              {capacityLabel}
            </span>
          )}
          {categoryLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
              {workspace.category === "meeting" ? (
                <CalendarDays className="h-3.5 w-3.5" />
              ) : (
                <Building2 className="h-3.5 w-3.5" />
              )}
              {categoryLabel}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              isAvailable
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isAvailable ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            {isAvailable ? "Available" : "Unavailable"}
          </span>
        </div>

        <Link
          to="/workspace/$id"
          params={{ id }}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
        >
          View Workspace
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function SearchMapContent({
  workspaces,
  activeWorkspaceId,
  hoveredWorkspaceId,
  onMarkerHover,
  onMarkerLeave,
  onMarkerClick,
  onPreviewClose,
  defaultCenter,
}: {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  hoveredWorkspaceId: string | null;
  onMarkerHover: (id: string) => void;
  onMarkerLeave: () => void;
  onMarkerClick: (id: string) => void;
  onPreviewClose: () => void;
  defaultCenter: [number, number];
}) {
  const map = useMap();
  const boundsRef = useRef<LatLngBoundsExpression | null>(null);

  const validWorkspaces = useMemo(() => {
    return workspaces
      .map((workspace) => {
        const coords = getValidCoordinates(workspace);
        return coords ? { workspace, coords } : null;
      })
      .filter(Boolean) as Array<{ workspace: Workspace; coords: [number, number] }>;
  }, [workspaces]);

  const previewWorkspaceId = hoveredWorkspaceId ?? activeWorkspaceId;
  const previewWorkspace =
    validWorkspaces.find(({ workspace }) => getWorkspaceId(workspace) === previewWorkspaceId) ?? null;

  useEffect(() => {
    if (validWorkspaces.length === 0) {
      map.setView(defaultCenter, 11);
      boundsRef.current = null;
      return;
    }

    if (validWorkspaces.length === 1) {
      map.setView(validWorkspaces[0].coords, 13, { animate: true });
      boundsRef.current = null;
      return;
    }

    const bounds = L.latLngBounds(validWorkspaces.map(({ coords }) => coords));
    map.fitBounds(bounds, { padding: [50, 50], animate: true });
    boundsRef.current = bounds;
  }, [defaultCenter, map, validWorkspaces]);

  return (
    <>
      <MapPreviewDismiss onDismiss={onPreviewClose} />
      {validWorkspaces.map(({ workspace, coords }) => {
        const id = getWorkspaceId(workspace);
        const isActive = activeWorkspaceId === id;
        const isHovered = hoveredWorkspaceId === id;

        return (
          <Marker
            key={id}
            position={coords}
            icon={createMarkerIcon(isActive, isHovered)}
            eventHandlers={{
              mouseover: () => {
                onMarkerHover(id);
              },
              mouseout: () => {
                onMarkerLeave();
              },
              click: () => {
                onMarkerClick(id);
              },
            }}
          />
        );
      })}
      {previewWorkspace && (
        <WorkspacePreviewCard
          workspace={previewWorkspace.workspace}
          coords={previewWorkspace.coords}
        />
      )}
    </>
  );
}

export function SearchResultsMap({
  workspaces,
  activeWorkspaceId,
  hoveredWorkspaceId,
  onMarkerHover,
  onMarkerLeave,
  onMarkerClick,
  onPreviewClose,
  defaultCenter = [28.6139, 77.209] as [number, number],
}: {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  hoveredWorkspaceId: string | null;
  onMarkerHover: (id: string) => void;
  onMarkerLeave: () => void;
  onMarkerClick: (id: string) => void;
  onPreviewClose: () => void;
  defaultCenter?: [number, number];
}) {
  if (workspaces.length === 0) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-secondary/50 to-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">No workspaces found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={11}
      scrollWheelZoom={true}
      className="h-full w-full dark:[&_.leaflet-control-attribution]:bg-black/20 dark:[&_.leaflet-tile-pane]:brightness-75 dark:[&_.leaflet-tile-pane]:contrast-125"
      style={{ zIndex: 1 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <SearchMapContent
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        hoveredWorkspaceId={hoveredWorkspaceId}
        onMarkerHover={onMarkerHover}
        onMarkerLeave={onMarkerLeave}
        onMarkerClick={onMarkerClick}
        onPreviewClose={onPreviewClose}
        defaultCenter={defaultCenter}
      />
    </MapContainer>
  );
}
