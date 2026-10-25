import { useEffect } from 'react';

/** Called only by the layout. Return focus and document scrolling when the drawer closes. */
export function useDrawerFocus(selector: string | null) {
  useEffect(() => {
    if (!selector) return;
    const drawer = document.querySelector<HTMLElement>(selector);
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        drawer?.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex="0"]') ?? [],
      ).filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0],
        last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [selector]);
}
