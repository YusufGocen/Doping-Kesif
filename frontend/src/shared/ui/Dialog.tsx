import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export function Dialog({
  title,
  onClose,
  icon,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby={titleId}
    >
      <div className="modal-heading">
        <span className="modal-icon">{icon}</span>
        <Button variant="icon" aria-label="Kapat" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>
      <h2 id={titleId}>{title}</h2>
      {children}
      {footer}
    </dialog>
  );
}
