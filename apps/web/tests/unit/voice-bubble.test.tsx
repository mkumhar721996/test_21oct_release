import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VoiceBubble } from "@/components/chats/voice-bubble";

describe("VoiceBubble", () => {
  it("shows a static voice bubble with duration and waveform", () => {
    render(<VoiceBubble durationSeconds={12} />);
    const btn = screen.getByRole("button", { name: "Voice message, 0:12 (playback not available)" });
    expect(btn.textContent).toContain("0:12");
    expect(btn.querySelectorAll(".voice-wave i")).toHaveLength(9);
  });

  it("plays no audio when pressed", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
    const { container } = render(<VoiceBubble durationSeconds={12} />);
    fireEvent.click(screen.getByRole("button", { name: /Voice message/ }));
    expect(play).not.toHaveBeenCalled();
    expect(container.querySelector("audio, video")).toBeNull();
  });
});
