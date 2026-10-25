import { HelpCircle, X } from 'lucide-react';
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      <HelpCircle size={19} />
      <span>{message}</span>
      <button type="button" aria-label="Bilgiyi kapat" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}
