import { addDays, todayIn } from "@/lib/dates";

/** Fecha local YYYY-MM-DD de un instante en la zona horaria dada. */
export function dateIn(iso: string, timeZone: string) {
  return todayIn(timeZone, new Date(iso));
}

export function timeIn(iso: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(iso));
  } catch {
    return new Date(iso).toISOString().slice(11, 16);
  }
}

/** "Hoy", "Ayer" o "12 oct" (separadores del chat). */
export function dayLabel(date: string, today: string) {
  if (date === today) return "Hoy";
  if (date === addDays(today, -1)) return "Ayer";
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`))
    .replace(".", "");
}

/** Hora si es de hoy; si no, el día. Para la lista de conversaciones. */
export function shortWhen(iso: string, timeZone: string, now = new Date()) {
  const today = todayIn(timeZone, now);
  const day = dateIn(iso, timeZone);
  return day === today ? timeIn(iso, timeZone) : dayLabel(day, today);
}
