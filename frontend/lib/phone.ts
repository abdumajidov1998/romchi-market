// Helpers for the Uzbek phone-input convention used everywhere in the app:
// the visible value is `+998 XX XXX XX XX`, the wire value is `+998XXXXXXXXX`.
// Pasting `+998 95 803 39 36`, `+998958033936`, `998958033936`, `958033936`
// or even `(+998) 95-803-39-36` all collapse to the same canonical form;
// any letters or punctuation the user types are dropped.

const NATIONAL_LEN = 9;

export function formatUzPhone(input: string): string {
  let digits = (input ?? '').replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  digits = digits.slice(0, NATIONAL_LEN);

  let out = '+998';
  if (digits.length > 0) out += ' ' + digits.slice(0, 2);
  if (digits.length > 2) out += ' ' + digits.slice(2, 5);
  if (digits.length > 5) out += ' ' + digits.slice(5, 7);
  if (digits.length > 7) out += ' ' + digits.slice(7, 9);
  return out;
}

export function cleanUzPhone(input: string): string {
  let digits = (input ?? '').replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  digits = digits.slice(0, NATIONAL_LEN);
  return digits.length > 0 ? '+998' + digits : '';
}

export function isValidUzPhone(input: string): boolean {
  const digits = (input ?? '').replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('998');
}
