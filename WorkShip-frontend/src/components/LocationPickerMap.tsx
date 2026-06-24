import { createClientOnlyFn } from "@tanstack/react-start";
import { useEffect, useState, type ComponentType } from "react";

type LocationPickerMapProps = {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
};

const loadClientMap = createClientOnlyFn(() => import("./LocationPickerMap.client"));

export function LocationPickerMap(props: LocationPickerMapProps) {
  const [ClientMap, setClientMap] = useState<ComponentType<LocationPickerMapProps> | null>(null);

  useEffect(() => {
    let active = true;

    void loadClientMap()?.then((module) => {
      if (active) {
        setClientMap(() => module.LocationPickerMap);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  if (!ClientMap) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-3xl border border-border bg-surface text-sm text-muted-foreground">
        Loading map...
      </div>
    );
  }

  return <ClientMap {...props} />;
}
