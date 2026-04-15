"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  embedUrl: string;
  title: string;
  /** Minimum watch time before Next unlocks (embeds rarely expose true onEnded). */
  unlockAfterSeconds: number;
  onEnded: () => void;
};

export function TaskVideo({
  embedUrl,
  title,
  unlockAfterSeconds,
  onEnded,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState(unlockAfterSeconds);
  const [unlocked, setUnlocked] = useState(unlockAfterSeconds <= 0);
  const fired = useRef(false);

  useEffect(() => {
    if (unlockAfterSeconds <= 0) {
      if (!fired.current) {
        fired.current = true;
        onEnded();
      }
      return;
    }

    const tick = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(tick);
          if (!fired.current) {
            fired.current = true;
            setUnlocked(true);
            onEnded();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => window.clearInterval(tick);
  }, [unlockAfterSeconds, onEnded]);

  useEffect(() => {
    const onMessage = () => {
      /* Future: heygen postMessage */
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-black shadow-md">
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full"
          allow="encrypted-media; fullscreen"
          allowFullScreen
        />
      </div>
      {unlockAfterSeconds > 0 && !unlocked ? (
        <p className="text-center text-xs text-gray-500" role="status">
          Next task unlocks in {secondsLeft}s — please watch the full video.
        </p>
      ) : unlockAfterSeconds > 0 && unlocked ? (
        <p className="text-center text-xs font-medium text-emerald-700">
          You can use Next task when you are ready.
        </p>
      ) : null}
    </div>
  );
}
