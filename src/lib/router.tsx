import {
  createContext,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
type Navigation = {
  route: string;
  go: (to: string, replace?: boolean) => void;
};
const Router = createContext<Navigation>(null!);
export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState(location.pathname + location.search);
  useEffect(() => {
    const pop = () => setRoute(location.pathname + location.search);
    addEventListener("popstate", pop);
    return () => removeEventListener("popstate", pop);
  }, []);
  const go = (to: string, replace = false) => {
    const previous = location.pathname;
    history[replace ? "replaceState" : "pushState"]({}, "", to);
    setRoute(location.pathname + location.search);
    if (location.pathname !== previous)
      window.scrollTo({ top: 0, behavior: "instant" });
  };
  return <Router.Provider value={{ route, go }}>{children}</Router.Provider>;
}
export const useRouter = () => useContext(Router);
export function Link({
  to,
  onClick,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const { go } = useRouter();
  return (
    <a
      href={to}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (
          !e.defaultPrevented &&
          e.button === 0 &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.shiftKey &&
          !e.altKey &&
          (!props.target || props.target === "_self")
        ) {
          e.preventDefault();
          go(to);
        }
      }}
    >
      {children}
    </a>
  );
}
export function Redirect({ to }: { to: string }) {
  const { go } = useRouter();
  useEffect(() => go(to, true), [to]);
  return null;
}
export function safeNext(value: string | null) {
  if (!value) return "/";
  try {
    const url = new URL(value, location.origin);
    if (
      url.origin !== location.origin ||
      ["/login", "/register"].includes(url.pathname)
    )
      return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
