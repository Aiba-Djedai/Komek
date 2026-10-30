import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import type { User, Event, Application } from "./types";
import { api } from "./lib/api";
export type Notice = {
  id: number;
  application_id: number | null;
  message: string;
  created_at: string;
  read_at: string | null;
};
type Store = {
  user: User | null;
  events: Event[];
  applications: Application[];
  notices: Notice[];
  loading: boolean;
  privateLoading: boolean;
  error: string;
  privateError: string;
  saved: number[];
  toggleSaved: (id: number) => void;
  refresh: () => Promise<void>;
  authenticate: (user: User) => void;
  logout: () => Promise<void>;
  notify: (message: string) => void;
  act: (
    path: string,
    body?: unknown,
    message?: string,
    method?: string,
  ) => Promise<boolean>;
};
const Context = createContext<Store>(null!);
export const useApp = () => useContext(Context);
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [events, setEvents] = useState<Event[]>([]),
    [applications, setApplications] = useState<Application[]>([]),
    [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true),
    [privateLoading, setPrivateLoading] = useState(false),
    [error, setError] = useState(""),
    [privateError, setPrivateError] = useState(""),
    [toast, setToast] = useState("");
  const [toastError, setToastError] = useState(false);
  const notify = (message: string) => {
    setToastError(false);
    setToast(message);
  };
  const userRef = useRef<User | null>(null);
  const [saved, setSaved] = useState<number[]>(() => {
    try {
      const data = JSON.parse(localStorage.getItem("komek-saved") || "[]");
      return Array.isArray(data) ? data.filter(Number.isInteger) : [];
    } catch {
      return [];
    }
  });
  const authenticate = (next: User) => {
    if (userRef.current?.id === next.id) {
      userRef.current = next;
      setUser(next);
      return;
    }
    userRef.current = next;
    setApplications([]);
    setNotices([]);
    setPrivateLoading(true);
    setUser(next);
  };
  const loadPrivate = useCallback(async (id: number) => {
    try {
      const [d, n] = await Promise.all([
        api<{ applications: Application[] }>("/dashboard"),
        api<{ notifications: Notice[] }>("/notifications"),
      ]);
      if (userRef.current?.id === id) {
        setApplications(d.applications);
        setNotices(n.notifications);
        setPrivateError("");
      }
    } catch (e) {
      if (userRef.current?.id === id) setPrivateError((e as Error).message);
      throw e;
    }
  }, []);
  useEffect(() => {
    let stopped = false;
    Promise.all([
      api<{ user: User | null }>("/auth/me"),
      api<{ events: Event[] }>("/events"),
    ])
      .then(([auth, data]) => {
        if (stopped) return;
        setEvents(data.events);
        userRef.current = auth.user;
        setUser(auth.user);
      })
      .catch((e) => {
        if (!stopped) setError(e.message);
      })
      .finally(() => {
        if (!stopped) setLoading(false);
      });
    return () => {
      stopped = true;
    };
  }, []);
  useEffect(() => {
    if (!user) {
      setApplications([]);
      setNotices([]);
      setPrivateLoading(false);
      setPrivateError("");
      return;
    }
    const id = user.id;
    setPrivateLoading(true);
    loadPrivate(id)
      .catch(() => {})
      .finally(() => {
        if (userRef.current?.id === id) setPrivateLoading(false);
      });
  }, [user?.id, loadPrivate]);
  const refresh = useCallback(async () => {
    const id = userRef.current?.id;
    const data = await api<{ events: Event[] }>("/events");
    setEvents(data.events);
    if (id) await loadPrivate(id);
  }, [loadPrivate]);
  useEffect(() => {
    if (!user) return;
    const reload = () => {
      if (document.visibilityState === "visible") refresh().catch(() => {});
    };
    const timer = setInterval(reload, 30000);
    addEventListener("focus", reload);
    return () => {
      clearInterval(timer);
      removeEventListener("focus", reload);
    };
  }, [user?.id, refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  const logout = async () => {
    await api("/auth/logout", "POST");
    userRef.current = null;
    setUser(null);
    setApplications([]);
    setNotices([]);
    setPrivateError("");
  };
  const act = async (
    path: string,
    body?: unknown,
    message = "Изменения сохранены",
    method = "POST",
  ) => {
    try {
      await api(path, method, body);
      await refresh();
      notify(message);
      return true;
    } catch (e) {
      setToastError(true);
      setToast((e as Error).message);
      return false;
    }
  };
  const toggleSaved = (id: number) =>
    setSaved((previous) => {
      const next = previous.includes(id)
        ? previous.filter((n) => n !== id)
        : [...previous, id];
      try {
        localStorage.setItem("komek-saved", JSON.stringify(next));
      } catch {
        setToastError(true);
        setToast("Браузер не разрешает сохранить избранное.");
      }
      return next;
    });
  return (
    <Context.Provider
      value={{
        user,
        events,
        applications,
        notices,
        loading,
        privateLoading,
        error,
        privateError,
        saved,
        toggleSaved,
        refresh,
        authenticate,
        logout,
        notify,
        act,
      }}
    >
      {children}
      {toast && (
        <div
          className={"toast" + (toastError ? " toast-error" : "")}
          role={toastError ? "alert" : "status"}
        >
          {toastError ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />}
          <span>{toast}</span>
          <button aria-label="Закрыть уведомление" onClick={() => setToast("")}>
            <X size={20} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
