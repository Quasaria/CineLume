/**
 * Generation d'evenements .ics pour ajouter une sortie cinema au calendrier
 * de l'utilisateur (Google Cal, Apple Cal, Outlook, etc.). Pas de timezone,
 * c'est un evenement "toute la journee" (VALUE=DATE) pour la date de sortie.
 */
interface CalendarEvent {
  id: number;
  title: string;
  dateStr: string;
  description?: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoDateCompact(dateStr: string): string {
  // YYYY-MM-DD -> YYYYMMDD
  return dateStr.replace(/-/g, '');
}

function isoDateCompactNextDay(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return isoDateCompact(dateStr);
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
}

function nowUtcStamp(): string {
  const n = new Date();
  return (
    `${n.getUTCFullYear()}${pad2(n.getUTCMonth() + 1)}${pad2(n.getUTCDate())}` +
    `T${pad2(n.getUTCHours())}${pad2(n.getUTCMinutes())}${pad2(n.getUTCSeconds())}Z`
  );
}

function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function generateICS(event: CalendarEvent): string {
  const dt = isoDateCompact(event.dateStr);
  const dtNext = isoDateCompactNextDay(event.dateStr);
  const stamp = nowUtcStamp();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CineLume//Quasaria//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:cinelume-${event.id}@quasaria.github.io`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dt}`,
    `DTEND;VALUE=DATE:${dtNext}`,
    `SUMMARY:${escapeIcs(event.title)}`,
  ];
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
  }
  lines.push('TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Petit delai pour laisser le browser declencher le download avant de
  // revoke la URL.
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
}
