"use client";

import Link from "next/link";

export default function DefectDetailError({ error: _error }: { error: Error }) {
  return (
    <div className="stack" style={{ paddingBlock: "var(--space-2)" }}>
      <div role="alert" className="alert alert-danger">
        <span>We couldn&apos;t load this defect&apos;s details.</span>{" "}
        <Link href="/defects">Back to list</Link>
      </div>
    </div>
  );
}
