import { createClientOnlyFn } from "@tanstack/react-start";
import { useEffect, useState, type ComponentType } from "react";

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

type SearchResultsMapProps = {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  hoveredWorkspaceId: string | null;
  onMarkerHover: (id: string) => void;
  onMarkerLeave: () => void;
  onMarkerClick: (id: string) => void;
  onPreviewClose: () => void;
  defaultCenter?: [number, number];
};

const loadClientMap = createClientOnlyFn(() => import("./SearchResultsMap.client"));

export function SearchResultsMap(props: SearchResultsMapProps) {
  const [ClientMap, setClientMap] = useState<ComponentType<SearchResultsMapProps> | null>(null);

  useEffect(() => {
    let active = true;

    void loadClientMap()?.then((module) => {
      if (active) {
        setClientMap(() => module.SearchResultsMap);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  if (props.workspaces.length === 0) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-secondary/50 to-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">No workspaces found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  if (!ClientMap) {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary/50 to-background">
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return <ClientMap {...props} />;
}
