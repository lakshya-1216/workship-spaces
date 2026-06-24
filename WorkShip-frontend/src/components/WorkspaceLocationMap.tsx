import { createClientOnlyFn } from "@tanstack/react-start";
import { useEffect, useState, type ComponentType } from "react";

type WorkspaceLocation = {
  type?: string;
  coordinates?: number[];
};

type WorkspaceLocationMapProps = {
  location?: WorkspaceLocation;
  title: string;
  address?: string;
  city?: string;
  mapsUrl?: string | null;
};

const loadClientMap = createClientOnlyFn(() => import("./WorkspaceLocationMap.client"));

export function WorkspaceLocationMap(props: WorkspaceLocationMapProps) {
  const [ClientMap, setClientMap] = useState<ComponentType<WorkspaceLocationMapProps> | null>(null);

  useEffect(() => {
    let active = true;

    void loadClientMap()?.then((module) => {
      if (active) {
        setClientMap(() => module.WorkspaceLocationMap);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  if (!ClientMap) {
    return (
      <section className="border-b border-border py-6">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-soft)]">
          <div className="flex min-h-[260px] items-center justify-center p-8 text-center text-sm text-muted-foreground md:min-h-[340px]">
            Loading map...
          </div>
        </div>
      </section>
    );
  }

  return <ClientMap {...props} />;
}
