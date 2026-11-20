import {
  useLayoutEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { isDesktop } from "./desktop";
import "./app-shell.css";

export function AppChrome({
  path,
  intro,
  setIntro,
}: {
  path: string;
  intro: boolean;
  setIntro: Dispatch<SetStateAction<boolean>>;
}) {
  const brand = useRef<HTMLAnchorElement>(null);
  useLayoutEffect(() => {
    if (!intro || !brand.current) return;
    const logo = brand.current;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      animation?.cancel();
      setIntro(false);
    };
    if (reduce.matches || document.hidden) {
      finish();
      return;
    }
    const box = logo.getBoundingClientRect();
    const scale = Math.min(
      (innerWidth * 0.8) / box.width,
      (innerHeight * 0.5) / box.height,
      7,
    );
    const x = (innerWidth - box.width * scale) / 2 - box.left;
    const y = (innerHeight - box.height * scale) / 2 - box.top;
    const transform = `translate(${x}px, ${y}px) scale(${scale})`;
    animation = logo.animate(
      [
        { transform, offset: 0 },
        { transform, offset: 0.26, easing: "cubic-bezier(.22, 1, .36, 1)" },
        { transform: "translate(0, 0) scale(1)", offset: 1 },
      ],
      { duration: 1450, easing: "linear", fill: "both" },
    );
    animation.finished.then(finish).catch(() => {});
    // Resizing or changing accessibility settings reveals the real measured logo,
    // never a stale guessed destination. There is only one logo DOM element.
    addEventListener("resize", finish);
    document.addEventListener("visibilitychange", finish);
    reduce.addEventListener("change", finish);
    return () => {
      animation?.cancel();
      removeEventListener("resize", finish);
      document.removeEventListener("visibilitychange", finish);
      reduce.removeEventListener("change", finish);
    };
  }, []);
  const links = [
    { href: "/operations", label: "Operations", icon: "network" },
    {
      href: "/crew",
      label: isDesktop ? "Crew app" : "Crew app ↗",
      icon: "crew",
    },
    { href: "/evaluation", label: "Test mode", icon: "test" },
  ];
  return (
    <>
      {intro && <div className="app-intro-backdrop" aria-hidden="true" />}
      <aside className="app-sidebar">
        <a
          ref={brand}
          className="app-brand"
          href="/operations"
          aria-label="Confluence"
        >
          <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <path d="M7 7v9c0 7 5 12 12 12h14M17 7v8c0 3 2 5 5 5h11M7 33h26" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <span>confluence.</span>
        </a>
        <nav aria-label="Main navigation">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={path === link.href ? "page" : undefined}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                aria-hidden="true"
              >
                {link.icon === "network" ? (
                  <>
                    <rect x="3" y="3" width="5" height="5" rx="1" />
                    <rect x="12" y="12" width="5" height="5" rx="1" />
                    <path d="M8 5.5h6.5V12M5.5 8v6.5H12" />
                  </>
                ) : link.icon === "crew" ? (
                  <>
                    <circle cx="10" cy="6" r="3" />
                    <path d="M4 17v-2a6 6 0 0 1 12 0v2Z" />
                  </>
                ) : (
                  <>
                    <path d="M7 2h6M8 2v6l-4 7a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-4-7V2M6 13h8" />
                  </>
                )}
              </svg>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-context">
          <span className="context-dot" /> Local workspace
          <small>Simulated data. Human approval.</small>
        </div>
      </aside>
      <header className="app-topbar">
        <span>
          Workspace <span className="breadcrumb-divider">/</span>{" "}
          <strong>
            {path === "/evaluation"
              ? "Test mode"
              : path === "/crew"
                ? "Field response"
                : "Operations"}
          </strong>
        </span>
        <span className="topbar-status">
          <i /> {isDesktop ? "Offline ready" : "Demo workspace"}
        </span>
      </header>
    </>
  );
}
