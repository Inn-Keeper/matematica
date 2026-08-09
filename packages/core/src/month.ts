export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export function previousMonth(month: string): string {
  return addMonths(month, -1);
}

export function monthDateBounds(month: string): { min: string; max: string } {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    min: `${month}-01`,
    max: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function defaultDateForMonth(
  month: string,
  today = new Date().toISOString().slice(0, 10),
): string {
  return today.startsWith(`${month}-`) ? today : `${month}-01`;
}

export function stepDateWithinMonth(date: string, delta: -1 | 1): string {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const stepped = new Date(Date.UTC(year, month - 1, day + delta))
    .toISOString()
    .slice(0, 10);
  return stepped.slice(0, 7) === date.slice(0, 7) ? stepped : date;
}

/** End-exclusive ISO date range covering the month. */
export function monthDateRange(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${addMonths(month, 1)}-01` };
}
