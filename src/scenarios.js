// Checkout inputs for rehearsing and presenting: a normal order (0) and five variations of it. The checkout's demo
// panel (DEMO_MODE=1) fills the form with them, and `npm run demo:fire <n>` sends them over HTTP. Each variation
// changes one thing about the normal order.

const DAY = 24 * 60 * 60 * 1000;
const isoDay = (date) => date.toISOString().slice(0, 10);

/** A day a few days ahead whose day of the month is 13 or later, written as DD/MM/YYYY. */
function europeanDate(now) {
  for (let ahead = 3; ; ahead++) {
    const date = new Date(now.getTime() + ahead * DAY);
    if (date.getUTCDate() >= 13) {
      const dd = String(date.getUTCDate()).padStart(2, '0');
      const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${date.getUTCFullYear()}`;
    }
  }
}

/** A normal order that goes through. */
export function normalOrder(now = new Date()) {
  return {
    product: 'house-blend',
    quantity: '2',
    coupon: '',
    sample: '',
    firstName: 'Mia', lastName: 'Hoffmann',
    email: 'mia.hoffmann@example.com',
    phone: '+49 30 1234 5678',
    address: 'Kastanienallee 7, 10435 Berlin',
    country: 'DE',
    deliveryDate: isoDay(new Date(now.getTime() + 4 * DAY))
  };
}

export const SCENARIOS = [
  {
    n: 1,
    title: 'Coupon BREW15',
    input: () => ({ firstName: 'Lena', lastName: 'Fischer', email: 'lena.fischer@example.com', coupon: 'BREW15' })
  },
  {
    n: 2,
    title: 'Free sample bag',
    input: () => ({ firstName: 'Tom', lastName: 'Schneider', email: 'tom.schneider@example.com', sample: 'on' })
  },
  {
    n: 3,
    title: 'Date typed as DD/MM/YYYY',
    input: (now) => ({ firstName: 'Sofia', lastName: 'Wagner', email: 'sofia.wagner@example.com', deliveryDate: europeanDate(now) })
  },
  {
    n: 4,
    title: 'No phone number',
    input: () => ({ firstName: 'Noah', lastName: 'Klein', email: 'noah.klein@example.com', phone: '' })
  },
  {
    n: 5,
    title: 'Ship to Switzerland',
    input: () => ({ firstName: 'Elif', lastName: 'Meier', email: 'elif.meier@example.com', address: 'Bahnhofstrasse 1, 8001 Zürich', country: 'CH' })
  }
];

/** The checkout form's fields for scenario `n` (0 is the normal order). */
export function scenarioInput(n, now = new Date()) {
  if (n === 0) return normalOrder(now);
  const scenario = SCENARIOS.find((s) => s.n === n);
  if (!scenario) throw new Error(`There is no scenario ${n}; pick 0 to ${SCENARIOS.length}.`);
  return { ...normalOrder(now), ...scenario.input(now) };
}
