import { useEffect, useRef, useState } from "react";

/**
 * Cycles through messages with a fade transition.
 * Returns the current message and whether it's visible (for opacity transitions).
 */
export function useCyclingMessage(
  messages: string[],
  active: boolean,
  intervalMs = 3000
) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      setVisible(true);
      return;
    }

    const fadeMs = 300;
    const id = setInterval(() => {
      setVisible(false);
      fadeTimerRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, fadeMs);
    }, intervalMs);

    return () => {
      clearInterval(id);
      clearTimeout(fadeTimerRef.current);
    };
  }, [active, messages, intervalMs]);

  return { message: messages[index]!, visible };
}
