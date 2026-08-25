"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create account.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Account created but login failed. Please log in manually.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div style={{ background: "#08090A", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 24px" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 40, textDecoration: "none" }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "#3B7BF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#F5F7FA", letterSpacing: "-0.02em" }}>Growth OS</span>
        </Link>

        <div style={{ background: "#111419", borderRadius: 12, border: "1px solid #1E2128", padding: 32 }}>
          <h1 style={{ fontWeight: 600, fontSize: "1.3rem", letterSpacing: "-0.02em", marginBottom: 6, color: "#F5F7FA" }}>Create account</h1>
          <p style={{ fontSize: "0.82rem", color: "#626873", marginBottom: 28 }}>Start analyzing your website in minutes.</p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, marginBottom: 6, color: "#9AA0AA", textTransform: "uppercase", letterSpacing: "0.06em" }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #1E2128", background: "#15181D", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", color: "#F5F7FA" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, marginBottom: 6, color: "#9AA0AA", textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #1E2128", background: "#15181D", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", color: "#F5F7FA" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, marginBottom: 6, color: "#9AA0AA", textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                minLength={8}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #1E2128", background: "#15181D", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", color: "#F5F7FA" }}
              />
            </div>

            {error && (
              <p style={{ fontSize: "0.8rem", color: "#EF4444", margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "11px", borderRadius: 8, background: loading ? "#1E2128" : "#3B7BF6", color: "#fff", fontWeight: 600, fontSize: "0.85rem", border: "none", cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.78rem", color: "#626873", marginTop: 20 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#F5F7FA", fontWeight: 500, textDecoration: "none" }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
