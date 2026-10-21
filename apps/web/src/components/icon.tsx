const PATHS = {
  plus: ["M5 12h14", "M12 5v14"],
  alert: ["M12 8v4", "M12 16h.01"],
  loader: ["M21 12a9 9 0 1 1-6.22-8.56"],
  check: ["M20 6 9 17l-5-5"],
  info: ["M12 16v-4", "M12 8h.01"],
  "chevron-left": ["m15 18-6-6 6-6"],
  "chevron-right": ["m9 18 6-6-6-6"],
  "chevron-down": ["m6 9 6 6 6-6"],
} as const;

const CIRCLED = new Set(["alert", "info"]);

export type IconName = keyof typeof PATHS;

export function Icon({ name, style }: { name: IconName; style?: React.CSSProperties }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="1.25em"
      height="1.25em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, verticalAlign: "middle", ...style }}
    >
      {CIRCLED.has(name) && <circle cx="12" cy="12" r="10" />}
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
