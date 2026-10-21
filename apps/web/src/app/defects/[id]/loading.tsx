export default function Loading() {
  return (
    <div className="stack stack-lg" style={{ paddingBlock: "var(--space-2)" }} aria-busy="true">
      <span className="skeleton" style={{ height: "var(--size-icon)" }} />
      <span className="skeleton" style={{ height: "var(--size-icon)" }} />
      <span className="text-bold" aria-live="polite">
        Loading…
      </span>
    </div>
  );
}
