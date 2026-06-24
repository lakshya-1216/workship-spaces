import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  Check,
  CreditCard,
  IndianRupee,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MockPaymentModal } from "@/components/MockPaymentModal";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/lib/api";
import { METHOD_LABELS, type PaymentResult } from "@/lib/payment-service";

// ─── Route types ──────────────────────────────────────────────────────────────

type BookingSearch = {
  date?: string;
  hours?: number;
};

type Workspace = {
  _id: string;
  title: string;
  city?: string;
  address?: string;
  price: number;
  images?: string[];
  host?: { name?: string };
};

// ─── Route definition ─────────────────────────────────────────────────────────

export const Route = createFileRoute("/booking/$id")({
  validateSearch: (s: Record<string, unknown>): BookingSearch => ({
    date: typeof s.date === "string" ? s.date : "",
    hours: typeof s.hours === "number" ? s.hours : Number(s.hours) || 3,
  }),
  loader: async ({ params }) => {
    const res = await fetch(apiUrl(`/workspaces/${params.id}`));
    if (!res.ok) throw notFound();

    const ws = (await res.json()) as Workspace;
    if (!ws?._id) throw notFound();

    return { ws };
  },
  head: () => ({ meta: [{ title: "Book workspace - Workship" }] }),
  component: BookingPage,
});

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ["Booking", "Payment", "Confirmed"];
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1024&q=80";

// ─── Component ────────────────────────────────────────────────────────────────

function BookingPage() {
  const { ws } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(search.date || "");
  const [hours, setHours] = useState(search.hours || 3);
  const [modalOpen, setModalOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [confirmedPaymentId, setConfirmedPaymentId] = useState<string | null>(null);
  const [confirmedMethod, setConfirmedMethod] = useState<string>("");

  const subtotal = ws.price * hours;
  const fee = Math.round(subtotal * 0.1);
  const total = subtotal + fee;
  const location = ws.city || ws.address || "Location unavailable";

  /** Called by the modal once the mock payment simulation succeeds */
  async function handlePaymentSuccess(
    result: Extract<PaymentResult, { success: true }>,
  ) {
    setModalOpen(false);
    setStep(1);
    setIsVerifying(true);

    try {
      // Use the token from React auth state — always in sync, no stale localStorage reads
      if (!token) {
        toast.error("Session expired. Please log in again.");
        void navigate({ to: "/login" });
        return;
      }

      // POST /bookings — direct booking creation, no payment gateway verification needed
      const bookingResponse = await fetch(apiUrl("/bookings"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspace: ws._id,
          date,
          hours,
          // Payment fields — stored on the booking record
          paymentId: result.paymentId,
          paymentMethod: METHOD_LABELS[result.method],
          paymentProvider: "mock",
          paymentStatus: "completed",
          amount: result.amount,
        }),
      });

      const bookingData = await bookingResponse.json().catch(() => ({}));

      if (!bookingResponse.ok) {
        throw new Error(bookingData.message || "Booking creation failed");
      }

      setConfirmedPaymentId(result.paymentId);
      setConfirmedMethod(METHOD_LABELS[result.method]);
      setStep(2);
      toast.success("Booking confirmed!", {
        description: `Payment ${result.paymentId} received for ${ws.title}`,
      });
      void navigate({
        to: "/dashboard",
        search: { tab: "bookings" } as never,
        replace: true,
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Booking creation failed");
      setStep(0);
    } finally {
      setIsVerifying(false);
    }
  }

  function handleOpenModal() {
    if (!date) {
      toast.error("Please select a booking date first");
      return;
    }
    setModalOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="mb-6">
        <Link
          to="/workspace/$id"
          params={{ id: ws._id }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Workspace details
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* ── Left: booking steps ── */}
        <section className="rounded-3xl border border-border bg-surface-elevated p-5 shadow-[var(--shadow-card)] md:p-8">
          {/* Step indicator */}
          <ol className="grid grid-cols-3 gap-2">
            {STEPS.map((label, index) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    index <= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {index < step ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span
                  className={`text-xs font-semibold ${index <= step ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
              </li>
            ))}
          </ol>

          {/* Step 0 + 1: Form */}
          {step < 2 && (
            <div className="mt-8 grid gap-6">
              <div>
                <p className="text-sm font-semibold text-primary-hover">Secure checkout</p>
                <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
                  {step === 1 && isVerifying ? "Confirming booking…" : "Complete your booking"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {step === 1 && isVerifying
                    ? "Your payment was successful. We're creating your booking now…"
                    : "Choose your schedule, review the price, then pay securely to confirm your workspace."}
                </p>
              </div>

              {/* Date + hours pickers (only step 0) */}
              {step === 0 && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="rounded-2xl border border-border bg-background p-4">
                      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Date
                      </span>
                      <input
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        className="mt-3 w-full bg-transparent text-base font-semibold outline-none"
                      />
                    </label>
                    <label className="rounded-2xl border border-border bg-background p-4">
                      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <Timer className="h-4 w-4" />
                        Hours
                      </span>
                      <select
                        value={hours}
                        onChange={(event) => setHours(Number(event.target.value))}
                        className="mt-3 w-full bg-transparent text-base font-semibold outline-none"
                      >
                        {[1, 2, 3, 4, 6, 8].map((hour) => (
                          <option key={hour} value={hour}>
                            {hour} hour{hour > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Workspace preview */}
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex gap-4">
                      <img
                        src={ws.images?.[0] || FALLBACK_IMAGE}
                        alt={ws.title}
                        width={144}
                        height={112}
                        className="h-24 w-28 shrink-0 rounded-2xl object-cover"
                      />
                      <div className="min-w-0">
                        <h2 className="font-display text-lg font-bold">{ws.title}</h2>
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="truncate">{location}</span>
                        </p>
                        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary-hover">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Free cancellation up to 24 hours before booking
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleOpenModal}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-hover hover:shadow-[var(--shadow-glow)]"
                  >
                    <CreditCard className="h-4 w-4" />
                    Pay &amp; Book Now
                  </button>
                </>
              )}

              {/* Step 1: verifying state */}
              {step === 1 && isVerifying && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" />
                    <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                      <ShieldCheck className="h-6 w-6 text-primary-hover" />
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">Verifying payment with server…</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Confirmed */}
          {step === 2 && (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary-hover animate-fade-in-up">
                <Check className="h-8 w-8" />
              </div>
              <h1 className="mt-4 font-display text-3xl font-bold">Booking confirmed</h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Your payment is verified and the booking is now visible in your dashboard.
              </p>
              {confirmedPaymentId && (
                <p className="mt-2 text-xs font-mono text-primary-hover">{confirmedPaymentId}</p>
              )}
              {confirmedMethod && (
                <p className="mt-1 text-xs text-muted-foreground">via {confirmedMethod}</p>
              )}
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  to="/dashboard"
                  className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
                >
                  View dashboard
                </Link>
                <Link
                  to="/search"
                  className="rounded-2xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary"
                >
                  Browse more
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* ── Right: Price summary sidebar ── */}
        <aside className="h-fit rounded-3xl border border-border bg-surface-elevated p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Price summary</h2>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary-hover">
              <LockKeyhole className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <Row
              label={`Rs ${ws.price} x ${hours} hour${hours > 1 ? "s" : ""}`}
              value={`Rs ${subtotal}`}
            />
            <Row label="Service fee" value={`Rs ${fee}`} />
            <hr className="border-border" />
            <Row label="Total" value={`Rs ${total}`} bold />
          </div>

          <div className="mt-6 rounded-2xl bg-background p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <IndianRupee className="h-4 w-4 text-primary-hover" />
              Mock Payment Gateway
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Card, UPI and Net Banking options available. No real charges during demo.
            </p>
          </div>

          {/* Host info */}
          {ws.host?.name && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold uppercase">
                {ws.host.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hosted by</p>
                <p className="text-sm font-semibold">{ws.host.name}</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── Mock Payment Modal ── */}
      <MockPaymentModal
        isOpen={modalOpen}
        onClose={() => {
          if (!isVerifying) setModalOpen(false);
        }}
        onSuccess={handlePaymentSuccess}
        onFailure={(error) => toast.error(error)}
        workspaceTitle={ws.title}
        date={date}
        hours={hours}
        price={ws.price}
        serviceFee={fee}
        total={total}
      />
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${bold ? "font-bold" : "text-muted-foreground"}`}
    >
      <span>{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}
