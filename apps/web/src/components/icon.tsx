const PATHS = {
  plus: ["M5 12h14", "M12 5v14"],
  alert: ["M12 8v4", "M12 16h.01"],
  loader: ["M21 12a9 9 0 1 1-6.22-8.56"],
  check: ["M20 6 9 17l-5-5"],
  info: ["M12 16v-4", "M12 8h.01"],
  "chevron-left": ["m15 18-6-6 6-6"],
  "chevron-right": ["m9 18 6-6-6-6"],
  "chevron-down": ["m6 9 6 6 6-6"],
  search: ["m21 21-4.3-4.3"],
  x: ["M18 6 6 18", "m6 6 12 12"],
} as const;

const CIRCLES: Partial<Record<IconName, { cx: number; cy: number; r: number }>> = {
  alert: { cx: 12, cy: 12, r: 10 },
  info: { cx: 12, cy: 12, r: 10 },
  search: { cx: 11, cy: 11, r: 8 },
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, style }: { name: IconName; style?: React.CSSProperties }) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
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
      {CIRCLES[name] && <circle {...CIRCLES[name]} />}
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
