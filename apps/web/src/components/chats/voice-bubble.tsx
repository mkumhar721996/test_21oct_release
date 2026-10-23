const WAVE = [30, 60, 90, 50, 75, 40, 85, 55, 30];

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// Static by design: playback is not available, so the button has no handler.
export function VoiceBubble({ durationSeconds }: { durationSeconds: number }) {
  const duration = formatDuration(durationSeconds);
  return (
    <button type="button" className="voice" aria-label={`Voice message, ${duration} (playback not available)`}>
      <span className="voice-play">
        <svg className="icon" aria-hidden="true" viewBox="0 0 16 16" width="1.25em" height="1.25em">
          <path d="M5 3l8 5-8 5z" fill="currentColor" />
        </svg>
      </span>
      <span className="voice-wave" aria-hidden="true">
        {WAVE.map((h, i) => (
          <i key={i} style={{ height: `${h}%` }} />
        ))}
      </span>
      <span>{duration}</span>
    </button>
  );
}
