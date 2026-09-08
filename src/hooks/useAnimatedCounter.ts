import { useState, useEffect } from 'react';

/**
 * Custom hook to smoothly animate numbers (count-up effect)
 * Supports decimals (e.g. 54.3%) and large integers (e.g. 1,450 votes)
 */
export function useAnimatedCounter(
  targetValue: number,
  durationMs: number = 1000,
  decimals: number = 0
): number {
  const [currentValue, setCurrentValue] = useState<number>(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = currentValue;
    const diff = targetValue - startValue;

    if (diff === 0) return;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);

      // Ease out cubic function for TV broadcast feel: 1 - pow(1 - x, 3)
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + diff * easeOutProgress;

      if (decimals === 0) {
        setCurrentValue(Math.round(nextValue));
      } else {
        const factor = Math.pow(10, decimals);
        setCurrentValue(Math.round(nextValue * factor) / factor);
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCurrentValue(targetValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [targetValue, durationMs, decimals]);

  return currentValue;
}
