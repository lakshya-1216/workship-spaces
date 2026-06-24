export type GeocodedLocation = {
  latitude: number;
  longitude: number;
  label?: string;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

export async function geocodeWorkspaceAddress({
  address,
  city,
  signal,
}: {
  address?: string;
  city?: string;
  signal?: AbortSignal;
}): Promise<GeocodedLocation | null> {
  const query = [address, city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  if (query.length < 3) return null;

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    addressdetails: "1",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error("Location could not be found");
  }

  const results = (await response.json()) as NominatimResult[];
  const result = results[0];
  if (!result?.lat || !result.lon) return null;

  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
    label: result.display_name,
  };
}
