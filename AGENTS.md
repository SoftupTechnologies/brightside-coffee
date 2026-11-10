# Brightside Coffee: notes for coding agents

- Install, check and test: `npm ci`, `npm run build`, `npm test`. Start: `npm start` (port `PORT`, default 3000;
  health at `/health`). No database is needed for the tests or to run; see README.md for Postgres.
- Plain JavaScript modules on Node 22, no framework and no new dependencies for a fix.
- A bug fix comes with its regression test in `test/`, one that fails without the fix and passes with it. Keep the
  fix small and in the function at fault.
- A customer's own mistake is a `CheckoutInputError` (shown on the form); a fault of the shop is thrown and logged by
  `src/app.js`. Keep the log format of `src/logger.js`.
- Leave `scripts/demo-reset.js`, `.github/workflows/reset-demo.yml` and `selfheal.config.json` as they are.
