// Shared design tokens — single source of truth for both apps (stretchy pattern).

export const color = {
  screen: "#0B0D0F",
  card: "#14171A",
  cardAlt: "#101316",
  hairline: "rgba(255,255,255,0.07)",

  text: "#F2F4F5",
  textSecondary: "#9BA3A8",
  textMuted: "#6E767C",

  brand: "#2DD4BF", // teal — matematica identity
  brandSoft: "rgba(45,212,191,0.14)",

  income: "#4ED99A",
  incomeBg: "rgba(78,217,154,0.12)",
  expense: "#FF7B7B",
  expenseBg: "rgba(255,123,123,0.12)",
  warning: "#FFB454",
} as const;

export const font = {
  display: "'Space Grotesk', sans-serif",
  body: "'DM Sans', sans-serif",
  mono: "'Space Mono', monospace", // all money figures render in mono
} as const;

export const radius = { card: 16, control: 10, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;

export const motionTokens = {
  duration: { fast: 0.15, base: 0.25, slow: 0.4 },
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
} as const;
