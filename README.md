# Brightside Coffee

A small online coffee shop: a product page and a checkout (coffee, bags, free sample bag, coupon, name, email,
phone, address, country, delivery date). Node 22, no framework and no build step: `node:http`, a tiny HTML template
tag, Postgres through `pg`, and logs to stdout and CloudWatch Logs.

It is also the demo app for [Akeso](https://akeso.softup.co): the checkout has bugs that a few specific inputs run
into. The presenter submits one, the page shows the error and the shop logs it; Akeso reads the log, opens a GitHub
issue and a draft pull request with a fix.

## Run it

```sh
npm ci
npm run build      # checks that every source file parses (node --check); there is nothing to compile
npm test           # node --test test/*.test.js
npm start          # http://localhost:3000, health at /health
```

Without `DATABASE_URL` the shop keeps its data in memory. With Postgres:

```sh
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/brightside
npm run db:setup              # tables and two weeks of seed orders; safe to run again
npm run db:setup -- --reset   # drops the tables first
npm start
```

| Variable | What it does |
| --- | --- |
| `PORT`, `HOST` | Where the server listens (default `3000`, `0.0.0.0`) |
| `DATABASE_URL` | Postgres; without it the data is in memory |
| `DEMO_MODE` | `1` shows the scenario panel on the checkout |
| `DEMO_CLOUDWATCH_ENDPOINT` | A fake CloudWatch Logs (Akeso's compose stack): log lines are posted to its `POST /_fake/events` |
| `DEMO_LOG_GROUP` | The log group (default `/demo/brightside-coffee`). Set without `DEMO_CLOUDWATCH_ENDPOINT`, the lines go to real CloudWatch Logs |
| `DEMO_LOG_STREAM` | The log stream (default `checkout-<host name>`), created when missing |
| `AWS_REGION`, `AWS_PROFILE` (or `AWS_ACCESS_KEY_ID`...) | Credentials and region for real CloudWatch Logs, as the AWS SDK reads them |
| `AKESO_SERVICE_URL`, `AKESO_PROJECT_KEY` | The Akeso service and the project's public key (`shpk_…`): with both, every page has the report button |
| `AKESO_WIDGET_VERSION`, `AKESO_WIDGET_INTEGRITY` | Another report button release and its SRI hash (default 0.4.0 and its hash; an empty integrity loads it without SRI) |
| `TEST_DATABASE_URL` | Runs test/postgres.test.js against that Postgres (CI sets it); skipped otherwise |
| `DEMO_URL` | Where `npm run demo:fire` sends orders (default `http://localhost:$PORT`) |

`.env.example` lists them; the shop reads the environment only, so export them or use `node --env-file=.env src/server.js`.

## How it is built

- `src/server.js` starts the server; `src/app.js` routes `/`, `/checkout`, `/orders/<id>`, `/health` and `/static/*`.
- `src/checkout/` is the checkout: `order.js` checks the form and places the order, with `coupons.js`,
  `parcel.js`, `delivery.js`, `phone.js`, `shipping.js` and `invoice.js` doing one step each.
- `src/store/` keeps the data: `postgres.js` (db/schema.sql) or `memory.js`, with the same methods.
- `src/logger.js` writes the log lines and `src/cloudwatch.js` ships them.
- `src/widget.js` renders the Akeso report button; `src/views.js` the pages.

Orders are stored as `pending`, then `placed` with an invoice, or `rejected` with the reason in `orders.failure`
when the invoice cannot be issued.

### Logs

Every line goes to stdout. A failure of the shop is one log event: `ERROR ref=<reference> <Type>: <message>` and the
stack below it, for example

```
ERROR ref=K7QM2X InvoiceTotalError: total is negative for order 1043
    at createInvoice (file:///…/src/checkout/invoice.js:10:29)
    at placeOrder (file:///…/src/checkout/order.js:65:21)
```

The customer sees the same message and reference on the page. The reference stays out of the message, and the
variable parts (order ids, numbers) are ones Akeso normalises, so every failure of one kind is the same error to it.
Normal work is logged as `INFO <what> key=value…`, and a customer's own mistake (an unknown coupon, a missing field)
is shown on the form and logged as INFO, not as an error.

### Tests

`npm test` covers the shop's behaviour that works: pages, a normal order, coupons SAVE5 and FREESHIP, shipping,
invoices, the customer's mistakes, the error page and log line, the logger and CloudWatch shipping, the report button
and the demo scenarios' inputs. **A fix comes with its test**: whoever fixes a bug (Claude included) adds a test in
`test/` that fails without the fix and passes with it.

## The demo

### Scenarios

On the checkout with `DEMO_MODE=1`, a small panel in the bottom left fills the form: **OK** a normal order, **1** to
**5** the scenarios (or Alt+0 to Alt+5). It only fills the form; the presenter clicks **Place order**. Each scenario
is a normal order with one thing changed, and each ends in a different error, so Akeso opens a separate issue for each.

| # | The input | What the page shows and the log says |
| --- | --- | --- |
| 1 | Coupon `BREW15` (15% off) | `InvoiceTotalError: total is negative for order <id>`; the order is stored as `rejected` |
| 2 | Two bags and the free sample bag ticked | `ParcelError: a parcel holds at most 12 bags, got 21` |
| 3 | Delivery date typed as DD/MM/YYYY with a day after the 12th, e.g. `14/11/2026` | `RangeError: Invalid time value` |
| 4 | The optional phone number left empty | `TypeError: Cannot read properties of null (reading 'join')` |
| 5 | Country Switzerland | `TypeError: Cannot read properties of undefined (reading 'standard')` |

The seed data already holds three `rejected` BREW15 orders with negative totals, so Akeso's read-only look at the
database finds that scenario 1 has happened before.

To rehearse without a browser, send a scenario as the form would:

```sh
npm run demo:fire 0      # a normal order
npm run demo:fire 3      # scenario 3
npm run demo:fire all    # 1 to 5, one after another
```

### Against Akeso's local compose stack

The stack (`deploy/compose.yml` in the Akeso repository) runs a fake CloudWatch Logs, published on
`127.0.0.1:4566` by default (`AKESO_COMPOSE_CLOUDWATCH_PORT`; 4766 in the presenter's setup) and its API on 3000
(`AKESO_COMPOSE_API_PORT`), so give the shop another port when they share a machine:

```sh
PORT=3300 DEMO_MODE=1 \
DEMO_CLOUDWATCH_ENDPOINT=http://localhost:4766 \
AKESO_SERVICE_URL=http://localhost:3200 AKESO_PROJECT_KEY=shpk_… \
npm start
```

The shop logs a line when it starts, which creates the log group in the fake. In Akeso, connect CloudWatch with the
fake's key and region (`AKIACOMPOSEFAKE00001`, `eu-central-1`, any secret) and the group `/demo/brightside-coffee`.
For the report button, allow the shop's origin (`http://localhost:3300`) on the project's Report button page.

### In production

The shop can run on the presenter's laptop and still log to real CloudWatch Logs:

```sh
aws logs create-log-group --log-group-name /demo/brightside-coffee --region eu-central-1
aws logs put-retention-policy --log-group-name /demo/brightside-coffee --retention-in-days 14 --region eu-central-1

AWS_PROFILE=brightside-logs AWS_REGION=eu-central-1 DEMO_LOG_GROUP=/demo/brightside-coffee DEMO_MODE=1 \
AKESO_SERVICE_URL=https://akeso.softup.co AKESO_PROJECT_KEY=shpk_… \
npm start
```

The credentials need only these two actions on that one group (replace the account id and region):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BrightsideShopWritesItsLogs",
      "Effect": "Allow",
      "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": [
        "arn:aws:logs:eu-central-1:123456789012:log-group:/demo/brightside-coffee",
        "arn:aws:logs:eu-central-1:123456789012:log-group:/demo/brightside-coffee:log-stream:*"
      ]
    }
  ]
}
```

Akeso reads the group with its own, read-only role. In Akeso the project's slug is `softuptechnologies-brightside-coffee`, the
`product` of `selfheal.config.json`; a project with another slug changes that value to match.

### Repeating the demo

A fix that is merged changes `main`, and the next run needs the bugs back. Once, before the first run, tag the
commit to come back to (after Akeso's own setup is merged into `main`):

```sh
git tag demo-start main && git push origin demo-start
```

Then, after each run, **reset main to that tag. This is destructive and only for the demo repository**: it
force-pushes `demo-start` to `main`, and every commit merged since leaves `main` for good.

- From GitHub: Actions → **Reset the demo** → Run workflow, type `reset main`, and tick "Also close every open pull
  request" to close the fix pull requests of the run. A branch protection rule on `main` that blocks force pushes
  makes it fail; so does a reset that would change files in `.github/workflows` (the workflow's token may not), in
  which case reset from a checkout.
- From a checkout: `npm run demo:reset` says what it would do; `npm run demo:reset -- --yes` does it. It only runs
  where the shop is the root of its repository.

`npm run db:setup -- --reset` puts the database back to its seed.

Akeso knows an error by its type, its message without the numbers, and its top stack frames, file paths included.
The same scenario in a later run is therefore the same error to Akeso, counted as a repeat of the issue it already
opened. For new issues in a rehearsal, run the shop from another folder (for example `git worktree add
../brightside-run-2 main`), which changes the paths in the stack, or use another Akeso project.
