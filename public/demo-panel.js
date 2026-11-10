// The presenter's panel on the checkout (DEMO_MODE=1): a button per scenario fills the form with that scenario's
// input; Alt+0 to Alt+5 do the same from the keyboard. It only fills the form: the presenter places the order.
(() => {
  const data = document.getElementById('demo-scenarios');
  const form = document.querySelector('form.checkout');
  if (!data || !form) return;
  const inputs = JSON.parse(data.textContent);

  function fill(n) {
    const input = inputs[n];
    if (!input) return;
    for (const [name, value] of Object.entries(input)) {
      const element = form.elements.namedItem(name);
      if (!element) continue;
      if (element.type === 'checkbox') element.checked = value === 'on';
      else element.value = value;
    }
    for (const button of document.querySelectorAll('[data-scenario]')) {
      button.classList.toggle('active', button.dataset.scenario === String(n));
    }
  }

  for (const button of document.querySelectorAll('[data-scenario]')) {
    button.addEventListener('click', () => fill(button.dataset.scenario));
  }
  document.addEventListener('keydown', (event) => {
    if (event.altKey && /^Digit[0-9]$/.test(event.code)) {
      event.preventDefault();
      fill(event.code.slice(5));
    }
  });
})();
