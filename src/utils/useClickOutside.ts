import { useEffect, RefObject } from 'react';

/**
 * Custom hook to detect clicks outside one or more referenced DOM elements
 * and listen for Escape key presses to dismiss popovers and dropdowns.
 */
export function useClickOutside(
  refs: (RefObject<HTMLElement | null> | null)[],
  handler: () => void,
  isActive: boolean = true
): void {
  useEffect(() => {
    if (!isActive) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      // Do nothing if clicking ref's element or descendent elements
      const isInside = refs.some(ref => ref?.current && ref.current.contains(target));
      if (!isInside) {
        handler();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handler();
      }
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [refs, handler, isActive]);
}
