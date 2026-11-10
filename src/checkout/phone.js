/**
 * The phone number the courier calls, as digits with a leading + for an international number: "+49 30 1234 567"
 * becomes "+49301234567". The field is optional; a customer who leaves it empty gets no call.
 */
export function formatPhone(text) {
  const digits = text.match(/\d+/g).join('');
  return text.trim().startsWith('+') ? `+${digits}` : digits;
}
