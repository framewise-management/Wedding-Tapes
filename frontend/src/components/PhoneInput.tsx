import { stripToDigits } from '../lib/groupedNumber';
import './PhoneInput.css';

const DEFAULT_COUNTRY_CODE = '91';

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

function splitPhone(value: string): { code: string; number: string } {
  const match = value.match(/^\+(\d{1,3})[\s-]*(.*)$/);
  if (match) return { code: match[1], number: match[2] };
  return { code: DEFAULT_COUNTRY_CODE, number: value };
}

export function PhoneInput({ id, value, onChange, required, className }: Props) {
  const { code, number } = splitPhone(value);

  function update(nextCode: string, nextNumber: string) {
    const digits = stripToDigits(nextNumber);
    onChange(digits ? `+${nextCode || DEFAULT_COUNTRY_CODE} ${digits}` : '');
  }

  return (
    <div className={'phone-input' + (className ? ' ' + className : '')}>
      <span className="phone-input-plus">+</span>
      <input
        className="phone-input-code"
        value={code}
        onChange={(e) => update(stripToDigits(e.target.value).slice(0, 3), number)}
        inputMode="numeric"
        maxLength={3}
        aria-label="Country code"
        autoComplete="off"
      />
      <span className="phone-input-divider" />
      <input
        id={id}
        className="phone-input-number"
        value={number}
        onChange={(e) => update(code, e.target.value)}
        inputMode="numeric"
        placeholder="98765 43210"
        required={required}
        autoComplete="off"
      />
    </div>
  );
}
