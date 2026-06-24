import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { HostProtectedRoute } from "@/components/HostProtectedRoute";
import { LocationPickerMap } from "@/components/LocationPickerMap";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/lib/api";
import { geocodeWorkspaceAddress } from "@/lib/geocoding";

type Category = "private" | "coworking" | "meeting" | "rooftop" | "cafe" | "loft" | "studio";

export const Route = createFileRoute("/host-add-listing")({
  head: () => ({ meta: [{ title: "Add Listing - Workship" }] }),
  component: AddListingPage,
});

const CATEGORIES: Array<{ value: Category; label: string }> = [
  { value: "private", label: "Private office" },
  { value: "coworking", label: "Coworking" },
  { value: "meeting", label: "Meeting room" },
  { value: "rooftop", label: "Rooftop" },
  { value: "cafe", label: "Cafe-style" },
  { value: "loft", label: "Loft" },
  { value: "studio", label: "Studio" },
];
const DEFAULT_COORDINATES = { latitude: 28.6139, longitude: 77.209 };

function AddListingPage() {
  const navigate = useNavigate();
  const { hostToken } = useAuth();
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    city: "",
    address: "",
    category: "private" as Category,
    price: "",
    capacity: "",
    amenities: "",
    available: true,
    latitude: String(DEFAULT_COORDINATES.latitude),
    longitude: String(DEFAULT_COORDINATES.longitude),
  });

  const previews = useMemo(
    () =>
      images.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [images],
  );
  const mapLatitude = Number.isFinite(Number(form.latitude))
    ? Number(form.latitude)
    : DEFAULT_COORDINATES.latitude;
  const mapLongitude = Number.isFinite(Number(form.longitude))
    ? Number(form.longitude)
    : DEFAULT_COORDINATES.longitude;

  const updateCoordinates = useCallback((latitude: number, longitude: number) => {
    setLocationError("");
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }));
  }, []);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  useEffect(() => {
    const address = form.address.trim();
    const city = form.city.trim();
    const query = [address, city].filter(Boolean).join(", ");

    if (query.length < 3) {
      setGeocoding(false);
      setLocationError("");
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setGeocoding(true);
      setLocationError("");

      try {
        const result = await geocodeWorkspaceAddress({
          address,
          city,
          signal: controller.signal,
        });

        if (!result) {
          setLocationError("Location could not be found");
          return;
        }

        updateCoordinates(result.latitude, result.longitude);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setLocationError("Location could not be found");
      } finally {
        if (!controller.signal.aborted) {
          setGeocoding(false);
        }
      }
    }, 700);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [form.address, form.city, updateCoordinates]);

  function updateField(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function removeImage(file: File) {
    setImages((current) => current.filter((item) => item !== file));
  }

  function validate() {
    if (!form.title.trim()) return "Title is required";
    if (!form.description.trim()) return "Description is required";
    if (!form.city.trim()) return "City is required";
    if (!form.address.trim()) return "Address is required";
    if (!form.category) return "Category is required";
    if (!Number(form.price) || Number(form.price) <= 0) return "Price must be positive";
    if (form.capacity && Number(form.capacity) <= 0) return "Capacity must be positive";
    if (images.length === 0) return "At least one image is required";
    if (geocoding) return "Please wait while we find the location";
    if (locationError) return locationError;
    if (!Number.isFinite(Number(form.latitude)) || !Number.isFinite(Number(form.longitude))) {
      return "Valid coordinates are required";
    }
    return "";
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    if (!hostToken) {
      toast.error("Please enter host mode again");
      return;
    }

    setSaving(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        body.append(key, String(value));
      });
      images.forEach((image) => body.append("images", image));

      const response = await fetch(apiUrl("/workspaces"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hostToken}`,
        },
        body,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Could not create listing");
      }

      toast.success("Listing published");
      void navigate({
        to: "/host-dashboard",
        search: { tab: "listings" } as never,
        replace: true,
      });
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "Could not create listing");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HostProtectedRoute>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <button
          onClick={() => navigate({ to: "/host-dashboard" })}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Host dashboard
        </button>

        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-lg border border-border bg-surface p-5">
            <div>
              <p className="text-sm text-primary-hover">New workspace</p>
              <h1 className="font-display text-3xl font-bold">Add listing</h1>
            </div>

            <div className="mt-6 grid gap-4">
              <Field
                label="Title"
                value={form.title}
                onChange={(value) => updateField("title", value)}
                required
              />
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </span>
                <textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  rows={5}
                  required
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="City"
                  value={form.city}
                  onChange={(value) => updateField("city", value)}
                  required
                />
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Category
                  </span>
                  <select
                    value={form.category}
                    onChange={(event) => updateField("category", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <Field
                label="Address"
                value={form.address}
                onChange={(value) => updateField("address", value)}
                required
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Price per hour"
                  type="number"
                  value={form.price}
                  onChange={(value) => updateField("price", value)}
                  required
                  min="1"
                />
                <Field
                  label="Capacity"
                  type="number"
                  value={form.capacity}
                  onChange={(value) => updateField("capacity", value)}
                  min="1"
                />
              </div>

              <Field
                label="Amenities"
                value={form.amenities}
                onChange={(value) => updateField("amenities", value)}
                placeholder="Wi-Fi, Coffee, Whiteboard"
              />

              <label className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(event) => updateField("available", event.target.checked)}
                  className="h-4 w-4 accent-[var(--primary-hover)]"
                />
                <span className="text-sm font-semibold">Available for booking</span>
              </label>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-lg border border-border bg-surface p-5">
              <h2 className="font-display text-xl font-bold">Images</h2>
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background p-6 text-center hover:bg-secondary">
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                <span className="mt-3 text-sm font-semibold">Upload workspace photos</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  JPG or PNG, multiple allowed
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const nextFiles = Array.from(event.target.files || []);
                    setImages((current) => [...current, ...nextFiles].slice(0, 8));
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {previews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {previews.map((preview) => (
                    <div
                      key={`${preview.file.name}-${preview.file.lastModified}`}
                      className="relative"
                    >
                      <img
                        src={preview.url}
                        alt={preview.file.name}
                        className="h-28 w-full rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(preview.file)}
                        className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white"
                        aria-label="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold">Location</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Address changes update the map automatically.
                  </p>
                </div>
                {geocoding && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-hover">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Finding
                  </span>
                )}
              </div>
              <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background">
                <LocationPickerMap
                  latitude={mapLatitude}
                  longitude={mapLongitude}
                  onChange={updateCoordinates}
                />
              </div>
              {locationError && (
                <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500">
                  {locationError}
                </p>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field
                  label="Latitude"
                  value={form.latitude}
                  onChange={(value) => updateField("latitude", value)}
                  required
                />
                <Field
                  label="Longitude"
                  value={form.longitude}
                  onChange={(value) => updateField("longitude", value)}
                  required
                />
              </div>
            </section>

            <button
              disabled={saving || geocoding}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving || geocoding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {saving ? "Publishing..." : geocoding ? "Finding location..." : "Publish listing"}
            </button>
          </aside>
        </form>
      </div>
    </HostProtectedRoute>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        min={min}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
