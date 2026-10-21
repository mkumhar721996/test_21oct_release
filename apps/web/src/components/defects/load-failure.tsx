"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";

const FIRST_DETAIL =
  "The server didn't respond. Your defects are safe. Check your connection and try again, or start a new defect report from the top bar.";
const AGAIN_DETAIL =
  "It still didn't load. Wait a moment and try again, or start a new defect report from the top bar.";

export function LoadFailure() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [retried, setRetried] = useState(false);
  const wasPending = useRef(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
    } else if (wasPending.current) {
      // still mounted after the refresh settled: the retry failed again
      wasPending.current = false;
      setRetried(true);
      button.current?.focus();
    }
  }, [pending]);

  function retry() {
    if (pending) return;
    startTransition(async () => {
      await router.refresh();
    });
  }

  return (
    <>
      {pending && (
        <div aria-busy="true">
          <div className="stack stack-sm" role="status" aria-label="Loading defects">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="skeleton" style={{ height: "var(--size-icon)" }} />
            ))}
          </div>
        </div>
      )}
      <div className="alert alert-danger" role="alert" hidden={pending}>
        <div className="fail-body">
          <Icon name="alert" />
          <div className="text">
            <strong>We couldn&apos;t load the defect list.</strong>
            <span>{retried ? AGAIN_DETAIL : FIRST_DETAIL}</span>
          </div>
          <button ref={button} className="btn btn-secondary" type="button" disabled={pending} onClick={retry}>
            {pending ? "Trying again…" : "Try again"}
          </button>
        </div>
      </div>
    </>
  );
}
