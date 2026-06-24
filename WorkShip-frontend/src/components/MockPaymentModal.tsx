import { AlertTriangle, CheckCircle2, CreditCard, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  METHOD_ICONS,
  METHOD_LABELS,
  PaymentMethod,
  processPayment,
  type PaymentResult,
} from "@/lib/payment-service";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MockPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called on verified payment success with the result */
  onSuccess: (result: Extract<PaymentResult, { success: true }>) => void;
  /** Called if the gateway returns a failure */
  onFailure?: (error: string) => void;
  workspaceTitle: string;
  date: string;
  hours: number;
  price: number;        // price per hour in rupees
  serviceFee: number;   // flat service fee in rupees
  total: number;        // grand total in rupees
}

type ModalStep = "summary" | "method" | "processing" | "success" | "failure";

const METHODS: PaymentMethod[] = ["mock-card", "mock-upi", "mock-netbanking"];

// ─── Component ────────────────────────────────────────────────────────────────

export function MockPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  onFailure,
  workspaceTitle,
  date,
  hours,
  price,
  serviceFee,
  total,
}: MockPaymentModalProps) {
  const [step, setStep] = useState<ModalStep>("summary");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("mock-card");
  const [result, setResult] = useState<PaymentResult | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("summary");
      setResult(null);
      setSelectedMethod("mock-card");
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && step !== "processing") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, step, onClose]);

  async function handlePay() {
    setStep("processing");
    const payResult = await processPayment({
      amount: total,
      workspaceTitle,
      date,
      hours,
      method: selectedMethod,
      simulateFailures: false, // always success in demo mode
    });
    setResult(payResult);
    if (payResult.success) {
      setStep("success");
      onSuccess(payResult);
    } else {
      setStep("failure");
      onFailure?.(payResult.error);
    }
  }

  function handleRetry() {
    setStep("method");
    setResult(null);
  }

  if (!isOpen) return null;

  const canClose = step !== "processing";

  return (
    // Backdrop
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (canClose && e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-border bg-surface-elevated shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Payment"
      >
        {/* Close button */}
        {canClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* ── STEP: Summary ── */}
        {step === "summary" && (
          <div className="p-7">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary-hover">
                <CreditCard className="h-4 w-4" />
              </span>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Secure Checkout
              </p>
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold">Booking Summary</h2>

            {/* Details */}
            <div className="mt-5 space-y-2 rounded-2xl border border-border bg-background p-4 text-sm">
              <SummaryRow label="Workspace" value={workspaceTitle} bold />
              <SummaryRow label="Date" value={formatDate(date)} />
              <SummaryRow label="Duration" value={`${hours} hour${hours > 1 ? "s" : ""}`} />
              <SummaryRow label={`₹${price} × ${hours} hr`} value={`₹${price * hours}`} />
              <SummaryRow label="Service fee" value={`₹${serviceFee}`} />
              <div className="my-1 border-t border-border" />
              <SummaryRow label="Total" value={`₹${total}`} bold />
            </div>

            <button
              onClick={() => setStep("method")}
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-hover hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
            >
              Choose Payment Method →
            </button>
          </div>
        )}

        {/* ── STEP: Payment Method ── */}
        {step === "method" && (
          <div className="p-7">
            <button
              onClick={() => setStep("summary")}
              className="mb-4 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <h2 className="font-display text-2xl font-bold">Payment Method</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select how you'd like to pay ₹{total}
            </p>

            <div className="mt-5 space-y-3">
              {METHODS.map((method) => (
                <button
                  key={method}
                  onClick={() => setSelectedMethod(method)}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                    selectedMethod === method
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border hover:border-primary/30 hover:bg-secondary/50"
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-xl">
                    {METHOD_ICONS[method]}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{METHOD_LABELS[method]}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {method === "mock-card" && "Visa, Mastercard, Amex"}
                      {method === "mock-upi" && "PhonePe, GPay, Paytm"}
                      {method === "mock-netbanking" && "SBI, HDFC, ICICI and more"}
                    </p>
                  </div>
                  <span
                    className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                      selectedMethod === method
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>

            <button
              onClick={handlePay}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-hover hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
            >
              Pay ₹{total} with {METHOD_LABELS[selectedMethod]}
            </button>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              🔒 Payments are simulated — no real charge will occur
            </p>
          </div>
        )}

        {/* ── STEP: Processing ── */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center gap-5 px-7 py-14 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                <Loader2 className="h-8 w-8 animate-spin text-primary-hover" />
              </span>
            </div>
            <div>
              <p className="font-display text-xl font-bold">Processing Payment</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Connecting with {METHOD_LABELS[selectedMethod]}…
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Please do not close this window</p>
            </div>
          </div>
        )}

        {/* ── STEP: Success ── */}
        {step === "success" && result?.success && (
          <div className="flex flex-col items-center gap-4 px-7 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 animate-fade-in">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold">Payment Successful</h2>
              <p className="mt-1 text-sm text-muted-foreground">Your booking has been confirmed</p>
            </div>

            {/* Receipt */}
            <div className="w-full space-y-2 rounded-2xl border border-border bg-background p-4 text-sm text-left">
              <ReceiptRow label="Payment ID" value={result.paymentId} mono />
              <ReceiptRow label="Method" value={`${METHOD_ICONS[result.method]} ${METHOD_LABELS[result.method]}`} />
              <ReceiptRow label="Workspace" value={workspaceTitle} />
              <ReceiptRow label="Amount paid" value={`₹${result.amount}`} bold />
              <ReceiptRow label="Date & Time" value={formatTimestamp(result.timestamp)} />
            </div>

            <button
              onClick={onClose}
              className="mt-1 inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-hover hover:shadow-[var(--shadow-glow)]"
            >
              Done
            </button>
          </div>
        )}

        {/* ── STEP: Failure ── */}
        {step === "failure" && (
          <div className="flex flex-col items-center gap-4 px-7 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold">Payment Failed</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {result && !result.success ? result.error : "An error occurred. Please try again."}
              </p>
            </div>
            <div className="mt-1 flex w-full flex-col gap-2">
              <button
                onClick={handleRetry}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-hover"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-border px-5 py-3 text-sm font-semibold transition-all hover:bg-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${bold ? "font-bold" : "text-muted-foreground"}`}>
      <span className="shrink-0">{label}</span>
      <span className={`truncate text-right ${bold ? "text-foreground" : ""}`}>{value}</span>
    </div>
  );
}

function ReceiptRow({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span
        className={`text-right text-xs ${bold ? "font-bold text-foreground" : ""} ${mono ? "font-mono text-primary-hover" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
