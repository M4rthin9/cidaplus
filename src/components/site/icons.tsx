import type { SVGProps } from "react";

type IconName = "arrow" | "search" | "menu" | "close" | "image" | "chat";

/** Small functional icons; no external runtime or font request. */
export function SiteIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="site-icon"
      {...props}
    >
      {name === "arrow" && <path d="M4 12h16m-6-6 6 6-6 6" />}
      {name === "search" && (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </>
      )}
      {name === "menu" && <path d="M4 7h16M4 12h16M4 17h16" />}
      {name === "close" && <path d="m6 6 12 12M6 18 18 6" />}
      {name === "image" && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8" cy="8" r="1" />
          <path d="m3 17 5-5 4 4 4-6 5 7" />
        </>
      )}
      {name === "chat" && (
        <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 10 10 0 0 1-3-.5L3 21l1.5-6.5a8.5 8.5 0 1 1 16.5-3Z" />
      )}
    </svg>
  );
}
