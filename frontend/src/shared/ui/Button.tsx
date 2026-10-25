import { ArrowRight } from 'lucide-react';
import type { ComponentProps } from 'react';

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'text' | 'icon';
  busy?: boolean;
  endArrow?: boolean;
};
export function Button({
  variant = 'primary',
  className = '',
  busy = false,
  endArrow = false,
  disabled,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  const variantClass =
    variant === 'primary' ? 'primary' : variant === 'text' ? 'text-button' : 'icon-button';
  return (
    <button
      {...props}
      type={type}
      className={`${variantClass} ${className}`.trim()}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {children}
      {endArrow && <ArrowRight className="button-forward-arrow" size={20} aria-hidden="true" />}
    </button>
  );
}
