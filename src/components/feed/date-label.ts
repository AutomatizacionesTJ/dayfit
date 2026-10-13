import { addDays } from "@/lib/dates";

/** "Hoy", "Ayer" o "12 oct", respecto al día de hoy de quien mira. */
export function feedDateLabel(postDate: string, today: string) {
  if (postDate === today) return "Hoy";
  if (postDate === addDays(today, -1)) return "Ayer";
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${postDate}T00:00:00Z`))
    .replace(".", "");
}
