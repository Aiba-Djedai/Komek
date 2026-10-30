import { useRouter } from "./router";
export function usePageSlice<T>(items: T[], size = 8) {
  const { route, go } = useRouter();
  const [path, query] = route.split("?");
  const params = new URLSearchParams(query);
  const count = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(
    count,
    Math.max(1, Math.floor(Number(params.get("page"))) || 1),
  );
  return {
    rows: items.slice((page - 1) * size, page * size),
    page,
    count,
    setPage: (value: number) => {
      const next = new URLSearchParams(params);
      next.set("page", String(value));
      go(path + "?" + next.toString(), true);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
  };
}
