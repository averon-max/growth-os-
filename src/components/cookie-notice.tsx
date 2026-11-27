"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const COOKIE = "hyprlyx_cookie_notice";

/**
 * First-visit notice. Hyprlyx only uses strictly necessary cookies (sign-in, security), which don't need consent,
 * so this informs rather than asks. If analytics or marketing cookies are ever added, this must become a real
 * choice (accept / reject) and those scripts must wait for it.
 */
export function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(!document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`)));
  }, []);
  if (!show) return null;

  const close = () => {
    document.cookie = `${COOKIE}=1; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setShow(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      style={{
        position: "fixed", left: 16, bottom: 16, zIndex: 1000, width: "min(400px, calc(100vw - 32px))",
        padding: "16px 16px 14px", borderRadius: 12, border: "1px solid #26282d", background: "#101112",
        boxShadow: "0 12px 40px rgba(0,0,0,.45)", color: "#ededed", fontSize: 13, lineHeight: 1.55,
      }}
    >
      <div style={{ color: "#ededed", fontWeight: 590, marginBottom: 4 }}>Cookies</div>
      <p style={{ margin: 0, color: "#a0a4ab" }}>
        We only use cookies that keep you signed in and protect your account. No ads, no tracking.{" "}
        <Link href="/cookies" style={{ color: "#ededed", textDecoration: "underline", textUnderlineOffset: 3 }}>Cookie Policy</Link>
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          type="button"
          onClick={close}
          style={{ height: 32, padding: "0 16px", border: 0, borderRadius: 6, background: "#ededed", color: "#000000", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          OK
        </button>
        <Link href="/privacy" style={{ height: 32, padding: "0 12px", display: "inline-flex", alignItems: "center", border: "1px solid #2a2c31", borderRadius: 6, color: "#ededed", fontSize: 13, textDecoration: "none" }}>
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
