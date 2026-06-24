/**
 * Payment Service Abstraction
 *
 * Provides a single `processPayment()` interface so that the booking flow
 * never depends directly on a payment gateway SDK.
 *
 * Swap the implementation here (mock → Razorpay → Stripe) without touching
 * any booking, dashboard, or UI logic elsewhere.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMethod = "mock-card" | "mock-upi" | "mock-netbanking";

export type PaymentResult =
  | { success: true; paymentId: string; method: PaymentMethod; amount: number; timestamp: string }
  | { success: false; error: string };

export interface PaymentRequest {
  amount: number;          // total in rupees
  currency?: string;       // default "INR"
  workspaceTitle: string;
  date: string;
  hours: number;
  method: PaymentMethod;
  /** Optional: if true, randomly simulate failure ~15% of the time */
  simulateFailures?: boolean;
}

// ─── Mock implementation ──────────────────────────────────────────────────────

/** Generates a realistic-looking mock payment ID */
function generatePaymentId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = Array.from({ length: 10 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  return `PAY_${random}`;
}

/** Simulates network + gateway latency */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock payment processor.
 * Resolves after a realistic 2–3 second delay.
 * Defaults to always-success for demos; set simulateFailures=true for testing.
 */
export async function processPayment(request: PaymentRequest): Promise<PaymentResult> {
  // Simulate gateway processing time
  await delay(2200 + Math.random() * 800);

  // Optional random failure simulation (15% failure rate)
  if (request.simulateFailures && Math.random() < 0.15) {
    return {
      success: false,
      error: "Payment declined. Please try a different method.",
    };
  }

  return {
    success: true,
    paymentId: generatePaymentId(),
    method: request.method,
    amount: request.amount,
    timestamp: new Date().toISOString(),
  };
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  "mock-card": "Mock Credit Card",
  "mock-upi": "Mock UPI",
  "mock-netbanking": "Mock Net Banking",
};

export const METHOD_ICONS: Record<PaymentMethod, string> = {
  "mock-card": "💳",
  "mock-upi": "📱",
  "mock-netbanking": "🏦",
};
