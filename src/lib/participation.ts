import type { Application } from "../types";

// Duration is stored in hours; an event is still in progress after its start.
export const participationEnd = (a: Application) =>
  Date.parse(a.starts_at) + (a.hours || 0) * 3_600_000;

export function groupParticipations(
  applications: Application[],
  now = Date.now(),
) {
  return {
    upcoming: applications
      .filter(
        (a) =>
          ["pending", "accepted", "confirmed"].includes(a.status) &&
          participationEnd(a) > now,
      )
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)),
    completed: applications
      .filter((a) => a.status === "confirmed" && participationEnd(a) <= now)
      .sort((a, b) => participationEnd(b) - participationEnd(a)),
  };
}
