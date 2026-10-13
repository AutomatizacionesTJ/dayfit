/** Fecha YYYY-MM-DD de "hoy" en una zona horaria IANA. */
export function todayIn(timeZone: string, now = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** Suma días a una fecha YYYY-MM-DD. */
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Los últimos n días (el más antiguo primero), terminando en `today`. */
export function lastDays(today: string, n: number) {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

const WEEKDAY = ["D", "L", "M", "X", "J", "V", "S"];

export function weekdayLetter(date: string) {
  return WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

export function dayOfMonth(date: string) {
  return Number(date.slice(8, 10));
}

export function longDate(date: string) {
  return new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/**
 * Racha vigente: la guardada, salvo que el último outfit sea anterior a ayer
 * (mismo criterio que la función SQL public.streak).
 */
export function effectiveStreak(
  profile: { current_streak: number; last_post_date: string | null; timezone: string },
  now = new Date(),
) {
  if (!profile.last_post_date) return 0;
  const yesterday = addDays(todayIn(profile.timezone, now), -1);
  return profile.last_post_date >= yesterday ? profile.current_streak : 0;
}
