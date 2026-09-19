import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPut } from '../api/client';
import { GroupedNumberInput } from '../components/GroupedNumberInput';
import { notifySetupStatusChanged } from '../lib/setupStatus';
import { PAYMENT_MODE_LABELS } from '../types/business';
import type { Business, PaymentCondition, PaymentMode } from '../types/business';
import './BusinessProfile.css';
import './Payments.css';

const MODES = Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[];

function nextInvoiceNumber(business: Business) {
  const n = business.invoiceNextNumber ?? 1;
  return `${business.invoicePrefix ?? 'INV-'}${String(n).padStart(4, '0')}`;
}

export default function Payments() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    apiGet<Business>('/api/business')
      .then(setBusiness)
      .catch((err) => setStatus(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  function updateField<K extends keyof Business>(key: K, value: Business[K]) {
    setBusiness((prev) => (prev ? { ...prev, [key]: value } : prev));
    setStatus('');
  }

  function updateCondition(index: number, patch: Partial<PaymentCondition>) {
    if (!business) return;
    const rows = (business.paymentConditions ?? []).map((row, i) =>
      i === index ? { ...row, ...patch } : row,
    );
    updateField('paymentConditions', rows);
  }

  function toggleMode(mode: PaymentMode) {
    const current = business?.paymentModes ?? [];
    updateField(
      'paymentModes',
      current.includes(mode) ? current.filter((m) => m !== mode) : [...current, mode],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;
    setIsSaving(true);
    setStatus('');
    try {
      const updated = await apiPut<Business>('/api/business', {
        paymentConditions: business.paymentConditions ?? undefined,
        paymentModes: business.paymentModes ?? undefined,
        upiId: business.upiId ?? undefined,
        bankDetails: business.bankDetails ?? undefined,
        gstNumber: business.gstNumber ?? undefined,
        invoicePrefix: business.invoicePrefix ?? undefined,
        invoiceNextNumber: business.invoiceNextNumber ?? undefined,
        receiptPrefix: business.receiptPrefix ?? undefined,
        receiptNextNumber: business.receiptNextNumber ?? undefined,
        paymentNotes: business.paymentNotes ?? undefined,
      });
      setBusiness(updated);
      setStatus('Saved');
      notifySetupStatusChanged();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  if (!business) return <p>{status || 'Loading...'}</p>;

  const conditions = business.paymentConditions ?? [];
  const modes = business.paymentModes ?? [];
  const conditionTotal = conditions.reduce((sum, row) => sum + (row.percent || 0), 0);

  return (
    <div className="bp-container">
      <Link to="/setup" className="bp-back-link">← Back to setup</Link>
      <div className="bp-page-header">
        <h1 className="bp-title">Payment &amp; Invoice</h1>
        <p className="bp-subtitle">
          When clients pay, how they pay, and how invoices and receipts are numbered.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bp-form" autoComplete="off">
        <div className="bp-col-main">
          <section className="bp-section">
            <h2>Payment conditions</h2>
            <p className="bp-section-sub">
              Your standard instalments. Percentages must add up to 100%.
            </p>

            <div className="pay-conditions">
              {conditions.map((row, i) => (
                <div className="pay-condition-row" key={i}>
                  <input
                    className="bp-input"
                    value={row.label}
                    onChange={(e) => updateCondition(i, { label: e.target.value })}
                    placeholder="e.g. On booking"
                    aria-label="Instalment name"
                  />
                  <div className="pay-percent">
                    <GroupedNumberInput
                      className="bp-input"
                      value={row.percent}
                      onDigitsChange={(digits) =>
                        updateCondition(i, { percent: digits ? Number(digits) : 0 })
                      }
                      placeholder="50"
                      aria-label="Percentage"
                    />
                    <span>%</span>
                  </div>
                  <button
                    type="button"
                    className="pay-row-remove"
                    onClick={() =>
                      updateField(
                        'paymentConditions',
                        conditions.filter((_, index) => index !== i),
                      )
                    }
                    aria-label="Remove instalment"
                  >
                    ×
                  </button>
                </div>
              ))}

              <div className="pay-conditions-foot">
                <button
                  type="button"
                  className="pay-add-btn"
                  onClick={() =>
                    updateField('paymentConditions', [...conditions, { label: '', percent: 0 }])
                  }
                >
                  + Add instalment
                </button>
                {conditions.length > 0 && (
                  <span className={'pay-total' + (conditionTotal === 100 ? ' ok' : '')}>
                    {conditionTotal}% of 100%
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="bp-section">
            <h2>Payment modes</h2>
            <p className="bp-section-sub">What you accept, and where the money goes.</p>

            <div className="pay-modes">
              {MODES.map((mode) => (
                <label className={'pay-mode' + (modes.includes(mode) ? ' on' : '')} key={mode}>
                  <input
                    type="checkbox"
                    checked={modes.includes(mode)}
                    onChange={() => toggleMode(mode)}
                  />
                  {PAYMENT_MODE_LABELS[mode]}
                </label>
              ))}
            </div>

            {modes.includes('UPI') && (
              <div className="bp-defaults-col pay-mode-detail">
                <div>
                  <label className="bp-label" htmlFor="pay-upi">
                    UPI ID
                  </label>
                  <input
                    id="pay-upi"
                    className="bp-input"
                    value={business.upiId ?? ''}
                    onChange={(e) => updateField('upiId', e.target.value)}
                    placeholder="studio@upi"
                    autoComplete="off"
                  />
                </div>
              </div>
            )}
          </section>

          <section className="bp-section">
            <h2>Invoice &amp; receipts</h2>
            <p className="bp-section-sub">
              Numbering, tax details, and the payee details printed on every document.
            </p>

            <div className="bp-grid-2">
              <div>
                <label className="bp-label" htmlFor="pay-inv-prefix">
                  Invoice prefix
                </label>
                <input
                  id="pay-inv-prefix"
                  className="bp-input"
                  value={business.invoicePrefix ?? ''}
                  onChange={(e) => updateField('invoicePrefix', e.target.value)}
                  placeholder="INV-"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="bp-label" htmlFor="pay-inv-next">
                  Next invoice number
                </label>
                <GroupedNumberInput
                  id="pay-inv-next"
                  className="bp-input"
                  value={business.invoiceNextNumber}
                  onDigitsChange={(digits) =>
                    updateField('invoiceNextNumber', digits ? Number(digits) : null)
                  }
                  placeholder="1"
                />
              </div>
              <div>
                <label className="bp-label" htmlFor="pay-rec-prefix">
                  Receipt prefix
                </label>
                <input
                  id="pay-rec-prefix"
                  className="bp-input"
                  value={business.receiptPrefix ?? ''}
                  onChange={(e) => updateField('receiptPrefix', e.target.value)}
                  placeholder="RCPT-"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="bp-label" htmlFor="pay-rec-next">
                  Next receipt number
                </label>
                <GroupedNumberInput
                  id="pay-rec-next"
                  className="bp-input"
                  value={business.receiptNextNumber}
                  onDigitsChange={(digits) =>
                    updateField('receiptNextNumber', digits ? Number(digits) : null)
                  }
                  placeholder="1"
                />
              </div>
            </div>

            <div className="bp-defaults-col pay-mode-detail">
              <div>
                <label className="bp-label" htmlFor="pay-gst">
                  GST number
                </label>
                <input
                  id="pay-gst"
                  className="bp-input"
                  value={business.gstNumber ?? ''}
                  onChange={(e) => updateField('gstNumber', e.target.value)}
                  placeholder="00XXXXX0000X0X0"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="bp-label" htmlFor="pay-bank">
                  Bank account details
                </label>
                <textarea
                  id="pay-bank"
                  className="bp-textarea"
                  rows={5}
                  value={business.bankDetails ?? ''}
                  onChange={(e) => updateField('bankDetails', e.target.value)}
                  placeholder={'Account name\nAccount number\nIFSC\nBank & branch'}
                />
              </div>
              <div>
                <label className="bp-label" htmlFor="pay-notes">
                  Invoice notes
                </label>
                <textarea
                  id="pay-notes"
                  className="bp-textarea"
                  rows={3}
                  value={business.paymentNotes ?? ''}
                  onChange={(e) => updateField('paymentNotes', e.target.value)}
                  placeholder="Advance is non-refundable · Cheques payable to…"
                />
              </div>
            </div>
          </section>

          <div className="bp-actions">
            <button type="submit" className="bp-save-btn" disabled={isSaving}>
              {isSaving && <span className="bp-spinner" />}
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
            {status && (
              <span className={'bp-status' + (status === 'Saved' ? '' : ' error')}>
                {status}
              </span>
            )}
          </div>
        </div>

        <aside className="bp-preview-aside">
          <p className="bp-preview-label">Invoice footer preview</p>

          <div className="bp-preview-card">
            <div className="bp-preview-contact">
              <p>Invoice {nextInvoiceNumber(business)}</p>
              {conditions
                .filter((row) => row.label)
                .map((row, i) => (
                  <p key={i}>
                    {row.label} — {row.percent}%
                  </p>
                ))}
              {modes.length > 0 && (
                <p>Accepted: {modes.map((m) => PAYMENT_MODE_LABELS[m]).join(', ')}</p>
              )}
              {modes.includes('UPI') && business.upiId && <p>UPI: {business.upiId}</p>}
              {business.gstNumber && <p>GSTIN {business.gstNumber}</p>}
              {business.bankDetails &&
                business.bankDetails
                  .split('\n')
                  .filter(Boolean)
                  .map((line, i) => <p key={i}>{line}</p>)}
            </div>

            {business.paymentNotes && (
              <div className="bp-preview-validity">
                <p>{business.paymentNotes}</p>
              </div>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}
