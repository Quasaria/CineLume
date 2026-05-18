export function getCinemaWeekStartDay(region: string): number {
  const map: Record<string, number> = {
    FR: 3, BE: 3, CH: 3,
    US: 5, GB: 5, CA: 5, AU: 5, JP: 5, KR: 5, IN: 5, MX: 5, BR: 5,
    DE: 4, AT: 4, NL: 4,
  };
  return map[region] ?? 3;
}

export interface CinemaWeek {
  start: Date;
  end: Date;
}

export function getCinemaWeeksOfMonth(
  year: number,
  month: number,
  region: string,
): CinemaWeek[] {
  const startDay = getCinemaWeekStartDay(region);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const first = new Date(monthStart);
  while (first.getDay() !== startDay) {
    first.setDate(first.getDate() + 1);
  }

  const weeks: CinemaWeek[] = [];
  const cursor = new Date(first);
  while (cursor <= monthEnd) {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setDate(end.getDate() + 6);
    weeks.push({ start, end });
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

export function formatDateISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
