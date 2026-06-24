import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Calendar, CheckCircle2, Loader2, MapPin, Star, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { apiUrl } from "@/lib/api";

type WorkspaceSummary = {
  _id: string;
  title: string;
  city?: string;
  address?: string;
  price?: number;
  images?: string[];
  rating?: number;
  numReviews?: number;
};

type Booking = {
  _id: string;
  workspace: WorkspaceSummary | null;
  date: string;
  hours: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
  paymentId?: string;
  paymentMethod?: string;
  review?: {
    rating?: number;
    comment?: string;
    description?: string;
    createdAt?: string;
  };
};

export const Route = createFileRoute("/bookings/$id")({
  head: () => ({ meta: [{ title: "Booking details - Workship" }] }),
  component: BookingDetailsPage,
});

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1024&q=80";

function BookingDetailsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function loadBooking() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          void navigate({ to: "/login" });
          return;
        }

        const response = await fetch(apiUrl(`/bookings/${id}`), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Could not load booking");
        }

        const nextBooking = data as Booking;
        setBooking(nextBooking);
        setRating(nextBooking.review?.rating || 5);
        setComment(nextBooking.review?.comment || "");
        setDescription(nextBooking.review?.description || "");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load booking");
      } finally {
        setLoading(false);
      }
    }

    void loadBooking();
  }, [id, navigate]);

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    if (!booking) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        void navigate({ to: "/login" });
        return;
      }

      const response = await fetch(apiUrl(`/bookings/${booking._id}/review`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment, description }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Could not save review");
      }

      setBooking(data.booking);
      toast.success(data.message || "Review saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save review");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <Link
          to="/dashboard"
          search={{ tab: "bookings" } as never}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to bookings
        </Link>

        {loading ? (
          <div className="mt-8 flex min-h-72 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading booking...
          </div>
        ) : booking ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="flex flex-col gap-5 sm:flex-row">
                <img
                  src={booking.workspace?.images?.[0] || FALLBACK_IMAGE}
                  alt={booking.workspace?.title || "Workspace"}
                  className="h-56 w-full rounded-lg object-cover sm:w-64"
                />
                <div className="min-w-0 flex-1">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(booking.status)}`}
                  >
                    {booking.status}
                  </span>
                  <h1 className="mt-3 font-display text-3xl font-bold">
                    {booking.workspace?.title || "Deleted workspace"}
                  </h1>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {booking.workspace?.city ||
                      booking.workspace?.address ||
                      "Location unavailable"}
                  </p>
                  <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                    <Info icon={Calendar} label="Date" value={formatDate(booking.date)} />
                    <Info
                      icon={Timer}
                      label="Duration"
                      value={`${booking.hours} hour${booking.hours > 1 ? "s" : ""}`}
                    />
                  </div>
                  {booking.workspace?._id && (
                    <Link
                      to="/workspace/$id"
                      params={{ id: booking.workspace._id }}
                      className="mt-5 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
                    >
                      Open workspace
                    </Link>
                  )}
                </div>
              </div>
            </section>

            <aside className="rounded-lg border border-border bg-surface p-5">
              <h2 className="font-display text-xl font-bold">Booking summary</h2>
              <div className="mt-4 space-y-3 text-sm">
                <Row label="Total paid" value={`₹${booking.totalPrice}`} bold />
                <Row
                  label="Payment status"
                  value={booking.paymentId ? "Completed" : "Pending"}
                />
                {booking.paymentId && (
                  <Row label="Payment ID" value={booking.paymentId} mono />
                )}
                {booking.paymentMethod && (
                  <Row label="Payment method" value={booking.paymentMethod} />
                )}
                <Row label="Booking ID" value={booking._id.slice(-8).toUpperCase()} />
              </div>
            </aside>

            <section className="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold">Review this workspace</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your review updates this workspace rating for other Workship users.
                  </p>
                </div>
                {booking.review?.rating && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary-hover">
                    <CheckCircle2 className="h-4 w-4" />
                    Review saved
                  </span>
                )}
              </div>

              <form onSubmit={submitReview} className="mt-5 grid gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Rating
                  </span>
                  <div className="mt-2 flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setRating(value)}
                        className="rounded-lg border border-border p-2 hover:bg-secondary"
                        aria-label={`${value} star rating`}
                      >
                        <Star
                          className={`h-5 w-5 ${
                            value <= rating
                              ? "fill-primary-hover text-primary-hover"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <label>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Comment
                  </span>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={4}
                    placeholder="How was the workspace?"
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>

                <label>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Review Description
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    placeholder="Share more details about your experience..."
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>

                <button
                  disabled={saving || booking.status === "cancelled"}
                  className="w-fit rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving
                    ? "Saving..."
                    : booking.review?.rating
                      ? "Update review"
                      : "Submit review"}
                </button>
              </form>
            </section>
          </div>
        ) : (
          <div className="mt-8 rounded-lg border border-border bg-surface p-8 text-center">
            <h1 className="font-display text-2xl font-bold">Booking not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">This booking could not be loaded.</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div
      className={`flex items-start justify-between gap-4 ${bold ? "font-bold" : "text-muted-foreground"}`}
    >
      <span className="shrink-0">{label}</span>
      <span className={`text-right ${bold ? "text-foreground" : ""} ${mono ? "font-mono text-xs text-primary-hover break-all" : ""}`}>{value}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClass(status: Booking["status"]) {
  if (status === "confirmed") return "bg-green-500/10 text-green-600";
  if (status === "cancelled") return "bg-red-500/10 text-red-600";
  return "bg-yellow-500/10 text-yellow-700";
}
