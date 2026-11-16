import { useEffect } from './ui.js';

/**
 * Close an open <details> menu when the user presses outside it or hits Escape.
 * Escape returns focus to the menu's summary so keyboard users keep their place.
 */
export function useDismissDetails(ref) {
  useEffect(() => {
    const onDown = (e) => {
      const menu = ref.current;
      if (menu?.open && !menu.contains(e.target)) menu.open = false;
    };
    const onKey = (e) => {
      const menu = ref.current;
      if (e.key !== 'Escape' || !menu?.open) return;
      menu.open = false;
      menu.querySelector('summary')?.focus();
    };
    addEventListener('pointerdown', onDown);
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('pointerdown', onDown);
      removeEventListener('keydown', onKey);
    };
  }, []);
}
