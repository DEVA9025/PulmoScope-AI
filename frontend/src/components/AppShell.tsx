import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import doctorImg from "@/assets/doctor.jpg";
import { doctor } from "@/lib/mock-data";
import { clearStoredUser, useAuthUserName } from "@/lib/auth-user";

const nav = [
  { n: "01", label: "Dashboard", to: "/dashboard" },
  { n: "02", label: "Patients", to: "/patients" },
  { n: "03", label: "X-ray Upload", to: "/upload" },
  { n: "04", label: "Prediction", to: "/prediction" },
  { n: "05", label: "Reports", to: "/reports" },
] as const;

export function AppShell({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  const navigate = useNavigate();
  const userName = useAuthUserName();
  const displayName = userName && userName !== "User" ? userName : doctor.name;

  async function handleLogout() {
    try {
      await fetch("http://localhost:8000/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network failure and clear local session anyway
    }
    clearStoredUser();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-ink text-frost font-body">
      <div className="flex min-h-screen">
        <aside className="w-[228px] shrink-0 border-r border-line/70 bg-panel/60 backdrop-blur-xl sticky top-0 h-screen hidden md:flex flex-col">
          <Link
            to="/dashboard"
            className="px-5 pt-5 pb-4 border-b border-line/60 flex items-center gap-2.5"
          >
            <div className="grid place-items-center size-8 rounded-md bg-accent/15 ring-1 ring-accent/40">
              <span className="font-display font-bold text-accent text-sm">P</span>
            </div>
            <div className="leading-tight">
              <div className="font-display font-semibold text-[15px] tracking-tight">PulmoScope</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">AI Reading</div>
            </div>
          </Link>

          <nav className="px-3 py-4 space-y-0.5 text-[13px] font-medium">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-frost/70 hover:bg-frost/5 transition-colors"
                activeProps={{ className: "bg-accent/10 text-accent ring-1 ring-accent/25" }}
              >
                <span className="font-mono text-[10px] w-4 text-center opacity-70">{item.n}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto px-3 pb-4 space-y-3">
            <div className="rounded-lg bg-frost/[0.03] ring-1 ring-line/60 p-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-dim mb-2">Model status</div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-frost/80">EfficientNet-B0</span>
                <span className="ml-auto font-mono text-accent">READY</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-line/50 bg-panel/40 p-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/15 font-display text-xs font-bold text-accent ring-1 ring-accent/30">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="leading-tight min-w-0">
                  <div className="text-[12px] font-medium truncate text-frost" title={displayName}>
                    {displayName}
                  </div>
                  <div className="font-mono text-[9px] text-dim">Clinician</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="rounded-md p-1.5 text-dim transition hover:bg-frost/10 hover:text-alert focus:outline-none"
              >
                <LogOut className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <header className="sticky top-0 z-10 bg-ink/70 backdrop-blur-xl border-b border-line/60 px-6 h-14 flex items-center gap-4">
            <div className="relative flex-1 max-w-[380px]">
              <input
                placeholder="Search patient, MRN, or report number"
                className="w-full bg-frost/[0.04] ring-1 ring-line/70 rounded-md pl-9 pr-14 py-2 text-[13px] text-frost/90 placeholder:text-dim focus:outline-none focus:ring-accent/50"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-dim">/</span>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] text-dim ring-1 ring-line/70 rounded px-1.5 py-0.5">
                ⌘K
              </span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right leading-tight hidden sm:block">
                <div className="font-mono text-[10px] text-dim">READING ROOM</div>
                <div className="text-[12px] font-medium text-accent">{displayName}</div>
              </div>
              {action ?? (
                <Link
                  to="/upload"
                  className="px-3 py-2 rounded-md bg-accent text-ink font-semibold text-[12px] hover:bg-accent/90 transition-colors"
                >
                  New Study
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-line/60 px-2.5 py-1.5 text-[11px] text-dim transition hover:bg-frost/5 hover:text-alert"
              >
                <LogOut className="size-3" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
