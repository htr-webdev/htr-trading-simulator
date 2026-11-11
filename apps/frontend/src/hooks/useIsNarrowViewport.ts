import { useEffect, useState } from "react";

/**
 * Tracks whether the viewport is narrower than the given breakpoint.
 * Below 1024px the terminal renders its mobile layout.
 */
export function useIsNarrowViewport(breakpoint = 1024): boolean {
  const [isNarrow, setIsNarrow] = useState(
    () => window.innerWidth < breakpoint,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsNarrow(window.innerWidth < breakpoint);
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isNarrow;
}
