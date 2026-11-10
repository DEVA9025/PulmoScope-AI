import { useEffect, useState } from "react";

const API_BASE = "http://localhost:8000";

function readName(value: any): string | null {
  const user = value?.user ?? value?.data?.user ?? value?.data ?? value;
  for (const candidate of [user?.full_name, user?.name, user?.username, user?.email]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

function storedName(): string {
  try {
    return localStorage.getItem("pulmoscope_user_name") || localStorage.getItem("pulmoscope_user_email") || "User";
  } catch {
    return "User";
  }
}

export function useAuthUserName(): string {
  const [name, setName] = useState(storedName);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/auth/me`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json().catch(() => null);
      })
      .then((payload) => {
        const serverName = payload ? readName(payload) : null;
        if (!active || !serverName) return;
        setName(serverName);
        try {
          localStorage.setItem("pulmoscope_user_name", serverName);
        } catch {
          // Ignore storage restrictions; keep the name in React state.
        }
      })
      .catch(() => {
        // Keep the name saved at sign-in if the profile endpoint is temporarily unavailable.
      });
    return () => { active = false; };
  }, []);

  return name;
}

export function setStoredUser(name: string, email?: string) {
  try {
    if (name) localStorage.setItem("pulmoscope_user_name", name);
    if (email) localStorage.setItem("pulmoscope_user_email", email);
  } catch {}
}

export function clearStoredUser() {
  try {
    localStorage.removeItem("pulmoscope_user_name");
    localStorage.removeItem("pulmoscope_user_email");
  } catch {}
}
