import { CheckoutInputError } from './errors.js';

/**
 * The phone number the courier calls, as digits with a leading + for an international number: "+49 30 1234 567"
 * becomes "+49301234567". The field is optional; a customer who leaves it empty gets no call.
 */
export function formatPhone(text) {
  if (!text.trim()) return '';
  const groups = text.match(/\d+/g);
  if (!groups) throw new CheckoutInputError('phone', 'Enter a phone number with digits, or leave it empty.');
  const digits = groups.join('');
  return text.trim().startsWith('+') ? `+${digits}` : digits;
}
