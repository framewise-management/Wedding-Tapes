import { useState } from 'react';
import '../pages/Calendar.css';

export default function BlockDateForm({
  onSubmit,
  onClose,
}: {
  onSubmit: (date: string, reason: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(date, reason);
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <form className="cal-block-form" onSubmit={handleSubmit}>
      <input type="date" className="cal-input" value={date} onChange={(e) => setDate(e.target.value)} required />
      <input
        className="cal-input"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
      />
      <button type="submit" className="cal-btn cal-btn-primary" disabled={saving}>
        {saving ? 'Blocking…' : 'Block date'}
      </button>
      <button type="button" className="cal-btn" onClick={onClose}>
        Cancel
      </button>
    </form>
  );
}
