// The checkout's error box: "Report this problem" opens the Akeso report button, with what went wrong copied, ready to
// paste as the report's description. Shown only where the report button is on the page.
(() => {
  const button = document.querySelector('[data-report-problem]');
  const report = window.akesoReportButton;
  if (!button || !report) return;
  button.closest('.alert-actions').hidden = false;
  button.addEventListener('click', async () => {
    const alert = button.closest('.alert');
    const message = alert.querySelector('.alert-message')?.textContent.trim() ?? '';
    const text = `Checkout failed: ${message} (reference ${alert.dataset.ref}).`;
    const hint = alert.querySelector('[data-report-hint]');
    try {
      await navigator.clipboard.writeText(text);
      hint.textContent = 'What went wrong is copied: paste it as the description.';
    } catch {
      hint.textContent = text;
    }
    report.open();
  });
})();
