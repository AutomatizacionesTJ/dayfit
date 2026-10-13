import { dayOfMonth, lastDays, longDate, weekdayLetter } from "@/lib/dates";
import type { OutfitWithUrl } from "@/lib/outfits";
import type { StripDay } from "@/components/outfit/week-strip";

export function buildStrip(today: string, outfits: OutfitWithUrl[]): StripDay[] {
  const byDate = new Map(outfits.map((o) => [o.post_date, o]));
  return lastDays(today, 7).map((date) => {
    const outfit = byDate.get(date);
    return {
      date,
      letter: weekdayLetter(date),
      day: dayOfMonth(date),
      label: longDate(date),
      isToday: date === today,
      posted: Boolean(outfit),
      url: outfit?.url ?? null,
      caption: outfit?.caption ?? null,
    };
  });
}
