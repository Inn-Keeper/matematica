const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** Accepts "1.234,56", "1234.56", "50". Returns integer cents, or null if invalid/negative. */
export function parseAmountToCents(input: string): number | null {
  const raw = input.trim().replace(/\s|R\$/g, "");
  if (!/^[\d.,]+$/.test(raw)) return null;
  let normalized: string;
  if (raw.includes(",")) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = raw;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}
