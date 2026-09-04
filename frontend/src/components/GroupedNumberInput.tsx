import type { InputHTMLAttributes } from 'react';
import { formatGroupedDigits, stripToDigits } from '../lib/groupedNumber';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string | number | null | undefined;
  onDigitsChange: (digits: string) => void;
};

export function GroupedNumberInput({ value, onDigitsChange, ...rest }: Props) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatGroupedDigits(value)}
      onChange={(e) => onDigitsChange(stripToDigits(e.target.value))}
    />
  );
}
