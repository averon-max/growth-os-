"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/** Screenshot of the site; while mShots is still taking it, shows a quiet placeholder and checks again. */
export function SitePreview({ url, version, className }: { url: string; version: string; className?: string }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!failed || attempt >= 8) return;
    const t = setTimeout(() => {
      setFailed(false);
      setAttempt((a) => a + 1);
    }, 5000);
    return () => clearTimeout(t);
  }, [failed, attempt]);

  const src = `/api/site-preview?url=${encodeURIComponent(url)}&v=${version}${attempt ? `&a=${attempt}` : ""}`;
  return (
    <>
      {!loaded ? (
        <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--ds-gray-900)", fontSize: 13 }}>
          {attempt >= 8 && failed ? "Preview unavailable" : "Taking a screenshot…"}
        </span>
      ) : null}
      {!failed ? (
        <Image
          key={src}
          src={src}
          alt={`Screenshot of ${url}`}
          width={1280}
          height={800}
          sizes="(max-width: 900px) 100vw, 520px"
          className={className}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </>
  );
}
