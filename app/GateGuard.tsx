"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function GateGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/gate", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean };
      setUnlocked(data.ok === true);
    } catch {
      setUnlocked(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        setUnlocked(true);
      } else {
        setError(data.error || "Invalid password");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (unlocked === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-200 via-amber-50 to-sky-100">
        <p className="text-sm text-rose-600">Checking access…</p>
      </div>
    );
  }

  if (unlocked) {
    return (
      <>
        <nav className="sticky top-0 z-10 flex justify-center gap-2 border-b border-rose-100 bg-white py-2">
          <Link
            href="/"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              pathname === "/"
                ? "bg-rose-500 text-white"
                : "bg-rose-100 text-rose-700 hover:bg-rose-200"
            }`}
          >
            Daily checklist
          </Link>
          <Link
            href="/streaks"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              pathname === "/streaks"
                ? "bg-rose-500 text-white"
                : "bg-rose-100 text-rose-700 hover:bg-rose-200"
            }`}
          >
            Dashboard
          </Link>
        </nav>
        {children}
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-200 via-amber-50 to-sky-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-rose-100 bg-white/90 p-6 shadow-lg">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-600">
          GAPS Checklist
        </div>
        <h1 className="text-xl font-semibold text-rose-950">Enter password</h1>
        <p className="mt-1 text-sm text-rose-700">
          This app is password protected. Enter the shared password to continue.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2.5 text-sm text-rose-900 placeholder:text-rose-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
            autoFocus
            disabled={loading}
          />
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-50"
          >
            {loading ? "Checking…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
