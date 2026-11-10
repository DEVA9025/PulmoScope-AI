import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { setStoredUser } from "@/lib/auth-user";
import { Activity, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, User } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in & Register — PulmoScope AI" },
      {
        name: "description",
        content: "Sign in or create an account for the PulmoScope research interface for explainable chest X-ray analysis.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isRegister && (!fullName.trim() || fullName.trim().length < 2)) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }

    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    if (isRegister && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister
        ? "http://localhost:8000/auth/register"
        : "http://localhost:8000/auth/login";

      const body = isRegister
        ? { full_name: fullName.trim(), email: email.trim(), password }
        : { email: email.trim(), password };

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload.detail ||
            `${isRegister ? "Registration" : "Sign-in"} failed (${response.status}).`
        );
      }

      const user = payload?.user;
      if (user?.full_name) {
        setStoredUser(user.full_name, user.email);
      }

      // Only navigate after FastAPI validates credentials and sets the session cookie.
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the authentication server. Check that FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink text-frost font-body lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden border-r border-line/60 bg-panel/40 p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(55% 45% at 25% 25%, color-mix(in oklab, var(--accent) 17%, transparent), transparent 72%), radial-gradient(45% 40% at 80% 80%, color-mix(in oklab, var(--ice) 10%, transparent), transparent 75%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 overflow-hidden"><div className="scan-sweep" /></div>

        <div className="relative flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-accent/15 ring-1 ring-accent/40">
            <Activity className="size-5 text-accent" aria-hidden="true" />
          </div>
          <div>
            <div className="font-display text-lg font-bold tracking-tight">PulmoScope <span className="text-accent">AI</span></div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">Explainable imaging workspace</div>
          </div>
        </div>

        <div className="relative max-w-xl py-12 rise-in">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent ring-1 ring-accent/20">
            <span className="size-1.5 rounded-full bg-accent" /> Research preview
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.12] tracking-tight xl:text-5xl">
            A clearer view of every <span className="text-accent">chest X-ray.</span>
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-frost/65">
            Explore AI-assisted image classification, visual explanations and study history in one focused workspace.
          </p>
          <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
            {[
              { value: "01", label: "Upload study" },
              { value: "02", label: "Review output" },
              { value: "03", label: "Inspect heatmap" },
            ].map((item) => (
              <div key={item.value} className="rounded-xl border border-line/60 bg-ink/35 p-3">
                <div className="font-mono text-xs text-accent">{item.value}</div>
                <div className="mt-2 text-xs text-frost/75">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-start gap-2.5 border-t border-line/50 pt-5 text-[11px] leading-5 text-dim">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent/80" aria-hidden="true" />
          <p>Research and educational support only. This interface is not a substitute for professional medical judgement or diagnosis.</p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md rise-in">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-xl bg-accent/15 ring-1 ring-accent/40">
              <Activity className="size-5 text-accent" aria-hidden="true" />
            </div>
            <div>
              <div className="font-display text-lg font-bold">PulmoScope <span className="text-accent">AI</span></div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim">Imaging workspace</div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-frost/[0.04] p-1 ring-1 ring-line/60">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError("");
              }}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                !isRegister
                  ? "bg-accent text-ink shadow-sm"
                  : "text-frost/60 hover:text-frost"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError("");
              }}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                isRegister
                  ? "bg-accent text-ink shadow-sm"
                  : "text-frost/60 hover:text-frost"
              }`}
            >
              Create account
            </button>
          </div>

          <div className="mb-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              {isRegister ? "Get started" : "Welcome back"}
            </div>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">
              {isRegister ? "Create an account" : "Sign in to continue"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-frost/55">
              {isRegister
                ? "Register your workspace credentials to access the reading room."
                : "Use your workspace credentials to open the reading room."}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {isRegister && (
              <label className="block animate-in fade-in duration-200">
                <span className="mb-1.5 block text-xs font-medium text-frost/80">Full name</span>
                <span className="relative block">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" aria-hidden="true" />
                  <input
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Dr. Jane Doe"
                    className="w-full rounded-xl bg-frost/[0.035] py-3 pl-10 pr-3 text-sm outline-none ring-1 ring-line/80 transition placeholder:text-dim/70 focus:ring-2 focus:ring-accent/60"
                  />
                </span>
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-frost/80">
                {isRegister ? "Work email address" : "Email address"}
              </span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" aria-hidden="true" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@hospital.org"
                  className="w-full rounded-xl bg-frost/[0.035] py-3 pl-10 pr-3 text-sm outline-none ring-1 ring-line/80 transition placeholder:text-dim/70 focus:ring-2 focus:ring-accent/60"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-frost/80">
                {isRegister ? "Password (min 8 characters)" : "Password"}
              </span>
              <span className="relative block">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" aria-hidden="true" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isRegister ? "Create a strong password" : "Enter your password"}
                  className="w-full rounded-xl bg-frost/[0.035] py-3 pl-10 pr-12 text-sm outline-none ring-1 ring-line/80 transition placeholder:text-dim/70 focus:ring-2 focus:ring-accent/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-dim transition hover:text-frost focus:outline-none focus:ring-2 focus:ring-accent/60"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-lg border border-alert/30 bg-alert/10 px-3 py-2 text-xs text-alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-ink transition hover:brightness-105 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-ink"
            >
              {loading ? (
                "Please wait..."
              ) : isRegister ? (
                <>
                  Create account & proceed
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </>
              ) : (
                <>
                  Continue to dashboard
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-xs text-frost/70 transition hover:text-accent"
            >
              {isRegister ? (
                <>
                  Already registered? <span className="font-semibold text-accent underline underline-offset-4">Sign in</span>
                </>
              ) : (
                <>
                  Don&apos;t have an account? <span className="font-semibold text-accent underline underline-offset-4">Create one here</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-line/60 bg-frost/[0.03] p-3.5">
            <p className="text-xs leading-5 text-frost/65">
              Your credentials are securely handled by the PulmoScope API. Accounts are authenticated and stored in the database.
            </p>
          </div>
          <p className="mt-7 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-dim">
            Secure workspace concept · PulmoScope AI
          </p>
        </div>
      </section>
    </main>
  );
}
