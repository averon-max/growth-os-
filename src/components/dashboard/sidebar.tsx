"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, LogOut, MoreHorizontal, PanelLeft, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";

import { NAV, NAV_ADMIN, NAV_BOTTOM, SUBNAV, isActivePath, withSite, type NavItem } from "@/lib/nav";

import styles from "./sidebar.module.css";

export { withSite } from "@/lib/nav";

/** The Hyprlyx mark: the serif "h" in a black square, same as the site footer. */
function Mark({ size = 20 }: { size?: number }) {
  return (
    <span className={styles.mark} style={{ width: size, height: size, fontSize: size * 0.72 }} aria-hidden>
      h
    </span>
  );
}

function NavLink({ item, pathname, site }: { item: NavItem; pathname: string; site: string | null }) {
  const Icon = item.icon;
  const active = isActivePath(pathname, item);
  const href = item.keepSite === false ? item.href : withSite(item.href, site);
  return (
    <Link href={href} className={styles.item} data-active={active || undefined} aria-current={active ? "page" : undefined} title={item.description}>
      <Icon size={16} strokeWidth={1.7} aria-hidden />
      <span className={styles.itemLabel}>{item.label}</span>
      {item.badge ? <span className={styles.badge}>{item.badge}</span> : null}
    </Link>
  );
}

/** "Find": jump to any page by typing. Opens with F or ⌘K, like the Vercel dashboard. */
function FindDialog({ open, onClose, items, site }: { open: boolean; onClose: () => void; items: NavItem[]; site: string | null }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((i) => `${i.label} ${i.description ?? ""}`.toLowerCase().includes(s)) : items;
  }, [q, items]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setIndex(0);
    const t = setTimeout(() => input.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;
  const go = (item: NavItem | undefined) => {
    if (!item) return;
    onClose();
    router.push(item.keepSite === false ? item.href : withSite(item.href, site));
  };

  return (
    <div className={styles.findBackdrop} onMouseDown={onClose}>
      <div className={styles.find} role="dialog" aria-modal="true" aria-label="Find" onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.findInput}>
          <Search size={16} strokeWidth={1.6} aria-hidden />
          <input
            ref={input}
            value={q}
            placeholder="Find a page…"
            onChange={(e) => {
              setQ(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(found.length - 1, i + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              }
              if (e.key === "Enter") go(found[index]);
            }}
            aria-label="Find a page"
          />
          <kbd className={styles.kbd}>Esc</kbd>
        </div>
        <ul className={styles.findList} role="listbox">
          {found.length === 0 ? <li className={styles.findEmpty}>No page matches “{q}”.</li> : null}
          {found.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={item.href} role="option" aria-selected={i === index}>
                <button type="button" className={styles.findItem} data-active={i === index || undefined} onMouseEnter={() => setIndex(i)} onClick={() => go(item)}>
                  <Icon size={16} strokeWidth={1.7} aria-hidden />
                  <span>{item.label}</span>
                  <span className={styles.findHint}>{item.description}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Same tab? "?" means the page's default tab (no tab/view in the address). */
function sameQuery(search: string, href: string): boolean {
  const cur = new URLSearchParams(search);
  const want = new URLSearchParams(href.slice(1));
  const keys = ["tab", "view"];
  return keys.every((k) => (cur.get(k) ?? "") === (want.get(k) ?? ""));
}

const NUDGE_KEY = "hx:nudge-hidden-until";

/** Every few days, a small card above the account suggests the next plan (Vercel-style). Hidden for 3 days on close. */
function UpgradeNudge({ planLabel }: { planLabel: string }) {
  const [show, setShow] = useState(false);
  const next = planLabel === "Free" ? "Starter" : planLabel === "Starter" ? "Growth" : planLabel === "Growth" ? "Autopilot" : null;
  useEffect(() => {
    if (!next) return;
    try {
      setShow(Number(localStorage.getItem(NUDGE_KEY) ?? 0) < Date.now());
    } catch {
      setShow(true);
    }
  }, [next]);
  if (!show || !next) return null;
  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(NUDGE_KEY, String(Date.now() + 3 * 864e5));
    } catch {
      /* private mode: just hide for now */
    }
  };
  const text: Record<string, string> = {
    Starter: "Track 500 keywords, see backlinks and competitors for one site.",
    Growth: "5 sites, 1,500 tracked keywords and 50 AI articles a month.",
    Autopilot: "25 sites, 5,000 tracked keywords and 200 AI articles a month.",
  };
  return (
    <div className={styles.nudge}>
      <button type="button" className={styles.nudgeClose} onClick={close} aria-label="Hide for a few days">
        <X size={14} strokeWidth={1.8} />
      </button>
      <strong>Upgrade to {next}</strong>
      <p>{text[next]}</p>
      <Link href="/dashboard/settings/billing" className={styles.nudgeButton}>
        See plans
      </Link>
    </div>
  );
}

export function Sidebar({ isAdmin = false, hidden = [], planLabel = "Free", email = "", name = "" }: { isAdmin?: boolean; hidden?: string[]; planLabel?: string; email?: string; name?: string }) {
  const pathname = usePathname() ?? "";
  const params = useSearchParams();
  const site = params?.get("websiteId") ?? null;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Tabs kept in the address (?tab= / ?view=): read them, and follow changes made by the page itself.
  const [search, setSearch] = useState("");
  useEffect(() => {
    const read = () => setSearch(window.location.search);
    read();
    window.addEventListener("hx:subnav", read);
    window.addEventListener("popstate", read);
    return () => {
      window.removeEventListener("hx:subnav", read);
      window.removeEventListener("popstate", read);
    };
  }, [pathname]);
  const sub = SUBNAV.find((x) => x.match.test(pathname)) ?? null;

  const sectionOf = (href: string) => href.replace(/^\/dashboard\/?/, "").split(/[/?#]/)[0];
  const groups = NAV.map((s) => s.items.filter((i) => i.sidebar !== false && !hidden.includes(sectionOf(i.href)))).filter((g) => g.length);
  const bottom = [...(isAdmin ? [NAV_ADMIN] : []), ...NAV_BOTTOM.filter((i) => i.sidebar !== false)];
  const all = useMemo(() => [...groups.flat(), ...bottom], [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "f")) {
        e.preventDefault();
        setFindOpen(true);
      }
      if (e.key === "Escape") {
        setMobileOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const who = name || email.split("@")[0] || "Account";
  const initial = (who.charAt(0) || "A").toUpperCase();

  return (
    <>
      <button type="button" className={styles.mobileOpen} onClick={() => setMobileOpen(true)} aria-label="Open menu" aria-expanded={mobileOpen}>
        <PanelLeft size={18} strokeWidth={1.6} />
      </button>
      {mobileOpen ? <div className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-hidden /> : null}

      <aside className={styles.sidebar} data-mobile-open={mobileOpen || undefined}>
        <div className={styles.top}>
          {/* The logo is home (Overview). Settings live in one place: the Settings item below and your name at the bottom. */}
          <Link href="/dashboard" className={styles.workspace} title="Overview">
            <Mark />
            <span className={styles.workspaceName}>Hyprlyx</span>
            <span className={styles.plan}>{planLabel}</span>
          </Link>
          <button type="button" className={styles.mobileClose} onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={18} strokeWidth={1.6} />
          </button>
        </div>

        <button type="button" className={styles.findButton} onClick={() => setFindOpen(true)}>
          <Search size={16} strokeWidth={1.6} aria-hidden />
          <span>Find…</span>
          <kbd className={styles.kbd}>F</kbd>
        </button>

        {sub ? (
          <nav className={styles.nav} aria-label={sub.title}>
            <Link href={sub.back} className={styles.subBack}>
              <ChevronLeft size={16} strokeWidth={1.6} aria-hidden />
              <span>{sub.title}</span>
            </Link>
            <div className={styles.group}>
              {sub.items.map((it) => {
                const local = it.href.startsWith("?");
                const target = local ? `${pathname}${it.href === "?" ? "" : it.href}` : it.href;
                const active = local ? sameQuery(search, it.href) : pathname === it.href;
                return (
                  <Link
                    key={it.label}
                    href={target}
                    className={styles.subItem}
                    data-active={active || undefined}
                    onClick={(e) => {
                      if (!local) return;
                      e.preventDefault();
                      const url = new URL(window.location.href);
                      const q = new URLSearchParams(it.href.slice(1));
                      ["tab", "view"].forEach((k) => url.searchParams.delete(k));
                      q.forEach((v, k) => url.searchParams.set(k, v));
                      window.history.replaceState(window.history.state, "", url.toString());
                      window.dispatchEvent(new Event("hx:subnav-go"));
                      setSearch(url.search);
                    }}
                  >
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : (
        <nav className={styles.nav} aria-label="Main">
          {groups.map((items, i) => (
            <div key={i} className={styles.group}>
              {items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} site={site} />
              ))}
            </div>
          ))}
          <div className={styles.group}>
            {bottom.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} site={site} />
            ))}
          </div>
        </nav>
        )}

        <UpgradeNudge planLabel={planLabel} />

        <div className={styles.account}>
          <Link href="/dashboard/settings/account" className={styles.accountLink} title={email}>
            <span className={styles.avatar} aria-hidden>
              {initial}
            </span>
            <span className={styles.accountName}>{who}</span>
          </Link>
          <div className={styles.menuWrap}>
            <button type="button" className={styles.iconButton} onClick={() => setMenuOpen((v) => !v)} aria-label="Account menu" aria-expanded={menuOpen}>
              <MoreHorizontal size={16} strokeWidth={1.6} />
            </button>
            {menuOpen ? (
              <div className={styles.menu} role="menu">
                <div className={styles.menuEmail}>{email}</div>
                <Link href="/dashboard/settings/account" className={styles.menuItem} role="menuitem">
                  Account
                </Link>
                <Link href="/dashboard/settings/billing" className={styles.menuItem} role="menuitem">
                  Billing
                </Link>
                <Link href="/" className={styles.menuItem} role="menuitem">
                  Home page
                </Link>
                <button type="button" className={styles.menuItem} role="menuitem" onClick={() => signOut({ callbackUrl: "/login" })}>
                  <LogOut size={14} strokeWidth={1.6} aria-hidden /> Log out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <FindDialog open={findOpen} onClose={() => setFindOpen(false)} items={all} site={site} />
    </>
  );
}
