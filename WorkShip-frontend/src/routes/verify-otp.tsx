import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, RefreshCw, ArrowLeft, Clock } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";

export const Route = createFileRoute("/verify-otp")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : "",
  }),
  head: () => ({ meta: [{ title: "Verify OTP - Workship" }] }),
  component: VerifyOtpPage,
});

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 5 * 60; // 5 minutes

function VerifyOtpPage() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect away if no email was passed
  useEffect(() => {
    if (!email) void navigate({ to: "/forgot-password" });
  }, [email, navigate]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const isExpired = secondsLeft <= 0;
  const otp = digits.join("");

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    // Auto-advance
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < OTP_LENGTH || isExpired) return;
    setLoading(true);

    try {
      const res = await fetch(apiUrl("/auth/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("OTP verified!");
        void navigate({
          to: "/reset-password",
          search: { email, otp } as never,
        });
      } else {
        toast.error(data.message || "Invalid OTP. Please try again.");
        setDigits(Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      }
    } catch {
      toast.error("Server connection failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setResending(true);
    try {
      const res = await fetch(apiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("New OTP sent to your inbox!");
        setDigits(Array(OTP_LENGTH).fill(""));
        setSecondsLeft(OTP_TTL_SECONDS);
        inputRefs.current[0]?.focus();
      } else {
        toast.error(data.message || "Could not resend OTP.");
      }
    } catch {
      toast.error("Server connection failed.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md relative group">
        {/* Glow */}
        <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-primary/30 to-primary/10 opacity-50 blur-xl transition-all group-hover:opacity-100 group-hover:duration-500" />

        <div className="relative rounded-[2rem] border border-primary/20 bg-surface-elevated/90 backdrop-blur-xl p-8 shadow-[var(--shadow-card)]">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary-hover">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="font-display text-3xl font-bold">Enter your OTP</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-foreground">{email}</span>.
            </p>
          </div>

          {/* Countdown */}
          <div
            className={`mb-6 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
              isExpired
                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                : secondsLeft <= 60
                ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                : "bg-primary/10 text-primary-hover border border-primary/20"
            }`}
          >
            <Clock className="h-4 w-4 shrink-0" />
            {isExpired ? (
              <span>OTP expired — please request a new one.</span>
            ) : (
              <span>
                Code expires in{" "}
                <span className="font-bold tabular-nums">
                  {minutes}:{seconds}
                </span>
              </span>
            )}
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            {/* OTP digit inputs */}
            <div
              className="flex justify-center gap-3"
              onPaste={handlePaste}
            >
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  id={`otp-digit-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  disabled={isExpired}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`h-14 w-12 rounded-xl border text-center text-2xl font-bold outline-none transition-all
                    ${isExpired
                      ? "border-red-500/30 bg-red-500/5 text-red-400 cursor-not-allowed"
                      : digit
                      ? "border-primary bg-primary/10 text-primary-hover shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                      : "border-border bg-background/50 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    }`}
                />
              ))}
            </div>

            <Button
              type="submit"
              disabled={loading || otp.length < OTP_LENGTH || isExpired}
              className="w-full rounded-xl bg-primary py-6 text-base font-bold transition-all hover:scale-[1.02] hover:bg-primary-hover hover:shadow-[var(--shadow-glow)] active:scale-[0.98] disabled:opacity-60 disabled:scale-100"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={resendOtp}
              disabled={resending || (!isExpired && secondsLeft > OTP_TTL_SECONDS - 30)}
              className="inline-flex items-center gap-1.5 font-semibold text-primary-hover hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Sending..." : "Resend OTP"}
            </button>

            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-1 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Wrong email?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
