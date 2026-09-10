import {
  createContext,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";

const Navigation = createContext({ path: "/", navigate: (_path: string) => {} });

/** This adapter is bundled only by build:preview. Production uses next-intl. */
export function PreviewNavigation({
  initialPath,
  children,
}: {
  initialPath: string;
  children: ReactNode;
}) {
  const [path, setPath] = useState(initialPath);
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname + window.location.search);
    onPopState();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const navigate = (next: string) => {
    window.history.pushState(null, "", next);
    setPath(next);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => {
      const main = document.getElementById("content");
      main?.setAttribute("tabindex", "-1");
      main?.focus({ preventScroll: true });
    });
  };
  return <Navigation.Provider value={{ path, navigate }}>{children}</Navigation.Provider>;
}

export function usePathname() {
  return useContext(Navigation).path.split("?")[0] ?? "/";
}
export function usePreviewPath() {
  return useContext(Navigation).path;
}
export function usePreviewNavigate() {
  return useContext(Navigation).navigate;
}

export function Link({
  href,
  locale: _locale,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; locale?: string }) {
  const { navigate } = useContext(Navigation);
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === "_blank" ||
          !href.startsWith("/") ||
          href.startsWith("//")
        )
          return;
        event.preventDefault();
        navigate(href);
      }}
    />
  );
}
