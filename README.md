# Biryani House POS

A point-of-sale system for Ilyas Chicken Biryani and its branch shops. It helps owners and cashiers manage billing, payments, tables, delivery orders, receipts, and sales reports.

The application uses the restaurant logo in `public/ilyas-logo.png` and supports English and Urdu menu names.

## Find what you need

- [User roles and access](#user-roles-and-access)
- [First-time setup](#first-time-setup)
- [Signing in](#signing-in)
- [Daily cashier workflow](#daily-cashier-workflow)
- [Admin workflow](#admin-workflow)
- [Online and offline operation](#online-and-offline-operation)
- [Orders, tables, and reports](#orders-tables-and-reports)
- [Receipts and printing](#receipts-and-printing)
- [Troubleshooting](#troubleshooting)
- [Developer reference](#developer-reference)

## User roles and access

Every staff member uses an individual username and password. Shared branch PIN login is no longer used.

| Role                   | After sign-in       | Access                                                                                                                                |
| ---------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Admin / owner          | Admin dashboard     | View all branches, manage menu and staff, configure settings, and review orders and reports. Select a specific branch before selling. |
| Branch staff / cashier | Assigned branch POS | Sell, manage tables, review orders, and view reports for the assigned branch. No access to admin, menu management, or settings.       |

Branch permissions are checked on the server. Every new shift and transaction is associated with an authenticated staff member. Historical records without cashier information are retained without inventing a cashier identity.

Kitchen/KDS screens, preparation controls, and KOT printing are not part of this system. Old kitchen URLs redirect to the appropriate admin or POS screen.

## First-time setup

This section is for the person installing or maintaining the application. Cashiers can go directly to [Signing in](#signing-in).

### 1. Requirements

- Node.js **22 or later** and npm, as required by the installed dependencies.
- A Supabase project with access to its SQL Editor and API credentials.
- A browser with JavaScript and local storage enabled.
- HTTPS for deployment. Local development can use `localhost`.

### 2. Install dependencies

Open a terminal in the project folder:

```bash
npm ci
```

On Windows, use `npm.cmd` instead of `npm` if PowerShell blocks the npm script.

### 3. Prepare the database

**For a new, empty database:**

1. Open the Supabase SQL Editor.
2. Run the complete [schema.sql](schema.sql) file.
3. Run the complete [operations migration](migrations/20261009_operations.sql).
4. Review the seeded branches, menu, tables, and settings before entering real sales.

**For an existing installation:**

1. Back up the database.
2. Sync outstanding offline sales and reconcile existing shifts using the previous version.
3. Apply the [operations migration](migrations/20261009_operations.sql).
4. Follow the [rollout instructions](OPERATIONS.md).

**Do not rerun the schema/seed script on an existing installation.** The migration preserves historical orders and payments and adds the staff, permissions, and transaction functions required by this version.

### 4. Configure the environment

Copy `.env.local.example` to `.env.local` if `.env.local` does not already exist. On Windows PowerShell:

```powershell
Copy-Item .env.local.example .env.local
```

Edit **`.env.local`**, not the example file. Replace every placeholder, including any sample password copied from the example:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-project-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-project-service-role-key

JWT_SECRET=replace-with-a-random-secret-of-at-least-32-characters
ADMIN_USERNAME=owner
MASTER_PASSWORD="replace-with-your-own-strong-password"
```

| Variable                        | Purpose                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Address of the Supabase project used by this installation.                                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase API key.                                                                                |
| `SUPABASE_SERVICE_ROLE_KEY`     | Private server key for database operations. Never expose it in browser code.                            |
| `JWT_SECRET`                    | Random secret of at least 32 characters used to sign staff sessions.                                    |
| `ADMIN_USERNAME`                | Username for the initial owner account. Defaults to `owner`.                                            |
| `MASTER_PASSWORD`               | Creates the initial owner account on its first successful login. It does not reset an existing account. |

Keep only one entry for each variable. Do not commit `.env.local` or share its contents.

**Password characters:** Wrap values containing `#` in quotes. Escape a literal `$` as `\$` inside the environment file. Enter the actual password in the login form **without that escape backslash**. Restart the server after changing environment values.

### 5. Start the application

For development:

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000).

For production and offline-reopening tests, build first, then start:

```bash
npm run build
npm start
```

A deployed installation needs a running Next.js server, the configured environment variables, and HTTPS. It is not a static HTML export.

## Signing in

### First owner login

1. Complete database and environment setup.
2. Select **Admin**, then enter the `ADMIN_USERNAME` and `MASTER_PASSWORD` configured in `.env.local`.
3. The first successful login creates the owner account with a hashed password.
4. Open **Settings** and create individual staff accounts with the correct roles and branch assignments.
5. Remove the bootstrap `MASTER_PASSWORD` from the server environment after establishing the owner account, then restart or redeploy.

Later logins use the account password stored in the database. Changing `MASTER_PASSWORD` does not change that password. An admin can reset staff passwords through **Settings**.

### Daily staff login

Select **Cashier** or **Admin** to match your assigned account, then enter the username and password provided by your administrator. Selecting a role does not change your permissions; the server checks your account's role. Use the eye icon to show or hide the password while typing.

Admins go to the dashboard; branch staff go to their assigned POS. Sessions last up to **12 hours**. Disabled accounts cannot sign in, and expired sessions require a new online sign-in.

## Daily cashier workflow

1. **Check your identity.** Confirm the cashier name and branch shown on screen.
2. **Open a shift.** Enter the actual opening cash in the drawer. Admins must select a branch first; sales cannot be assigned to All Branches.
3. **Choose the order type.** For dine-in, select a table. For delivery, enter the phone number and delivery address. Takeaway does not require a table.
4. **Build the bill.** Add items, check quantities, and review discounts, configured tax, and the final total.
5. **Record payment.** Enter cash received, confirm a JazzCash/EasyPaisa payment, or enter the cash and digital portions of a split payment.
6. **Complete and print.** Finish the order and use the browser print dialog for the receipt.
7. **End the shift.** Sync all pending sales, count the drawer cash, and select **Close shift**. Review any cash difference.

You can cancel the shift dialog and leave POS without opening a shift. Payment actions remain disabled until a valid shift exists.

**Digital payments are manually confirmed.** This application records the payment method; it does not transfer money or contact JazzCash/EasyPaisa to verify receipt. Confirm the payment separately before marking it received.

## Admin workflow

| Screen   | What to do                                                                            |
| -------- | ------------------------------------------------------------------------------------- |
| Admin    | Review today's branch activity and open a specific branch POS.                        |
| Orders   | Search bills, filter dates and payment status, inspect details, and reprint receipts. |
| Reports  | Review sales and order counts by date and branch; export CSV.                         |
| Menu     | Maintain dishes, prices, availability, and featured items.                            |
| Settings | Manage staff accounts, receipt details, payment numbers, and tax settings.            |
| Tables   | Review the selected branch's table availability and active bills.                     |

Configure accurate addresses, phone numbers, and receipt footers for each branch. After menu or tax changes, refresh/sync the cashier terminals and review the next bill before accepting payment.

### Managing menu categories

Admins can manage categories without editing code or SQL:

1. Open **Menu → Manage Categories**.
2. Select **New category**, enter its name, optional Urdu name, icon, and display order, then select **Create category**.
3. To rename or reorder an existing category, select it from the list, edit its details, and select **Save changes**. Existing dishes stay assigned to it.
4. Use the category selector in **Add New Dish**. You can also open the category form from that selector without losing the dish you are entering; the saved category becomes selected.
5. Refresh/sync the menu on branch POS terminals. Prepare offline again if those terminals will be used without internet.

Categories are shared across branches. Category changes require an online admin session. Existing seeded categories are editable through this same form; historical bills are preserved.

## Online and offline operation

Offline mode supports continuing an existing shift during a connection loss. Prepare it while connected.

### Before disconnecting

1. Use a production build over HTTPS or localhost.
2. Sign in online, select the branch, and open a shift.
3. Wait for **POS saved for offline reopening during this session**, or select **Prepare offline**.
4. Repeat preparation after signing in again, changing branches, or deploying an update.

Development mode does not register the offline cache. You can continue in an already open development POS tab, but offline refresh/reopening requires the production build.

### What works offline?

| Action                                                                            | Availability                                                         |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Continue a confirmed shift with a valid session                                   | Available using prepared local data.                                 |
| Record sales and print receipts                                                   | Available; sales are saved on that device until synced.              |
| Reprint an unsynced receipt                                                       | Use the saved-sales list in POS.                                     |
| Refresh/reopen POS                                                                | Available after preparation, while the cached session remains valid. |
| Sign in or open/close a shift                                                     | Internet required.                                                   |
| Change branches, manage staff/menu/settings, view reports or server order history | Internet required.                                                   |
| Check another terminal's current table activity                                   | Internet required. Cached availability may be outdated.              |

### When the connection returns

Queued sales retry on reconnect, when the window regains focus, and every 30 seconds while connected. Stable sale identifiers prevent duplicate server records when a response is lost.

Stay signed in as the original cashier until the pending-sales count reaches zero. Failed sales remain available for retry; a table conflict or a shift closed elsewhere may need administrator reconciliation.

**Do not clear browser data, uninstall the application, or change devices before syncing pending sales.** Unsynced bills exist only on the device that recorded them. Offline selling stops when the existing session expires.

The connection badge shows browser network status and pending sales. It does not guarantee the server is reachable. See [Operations](OPERATIONS.md#online-and-offline-operation) for further limitations and acceptance checks.

## Orders, tables, and reports

### Understanding the numbers

| Label            | Meaning                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| Total orders     | Every bill in the selected period, including unpaid and cancelled bills.                                        |
| Unpaid / partial | Unpaid or partially paid bills, excluding cancelled orders.                                                     |
| Completed        | Bills with a completed order status.                                                                            |
| Cancelled        | Bills with a cancelled order status.                                                                            |
| Paid sales       | Paid bill value, excluding cancelled orders and refunded payments.                                              |
| Cash sales       | The cash portion of paid sales, including recorded split-payment cash. This is not the physical drawer balance. |

Order status and payment status describe different things, so these counts can overlap. Do not add them together as separate categories.

Reports use **Asia/Karachi** business dates and group sales by the bill's creation date. Older split payments without a cash breakdown are shown separately rather than guessed.

### Bills and tables

- Completed bills remain in **Orders**; a free table should not show them as an active bill.
- Existing unpaid bills can be settled from order details using an open shift for that branch and cashier.
- Cancelling an unpaid open bill requires an admin and a reason. The bill and cancellation audit remain in history.
- Paid bills cannot be cancelled through this flow. Refund processing and cash-movement workflows are not implemented.
- Expected shift cash uses opening cash plus recorded cash sales, including split cash. It does not account for unrecorded withdrawals or refunds.

## Receipts and printing

Receipts use the restaurant logo, branch details, bill items, totals, payment information, and cashier attribution. They are formatted for an 80 mm receipt layout and printed through the browser.

Allow receipt popups, select the intended printer and paper size, and test the output on your actual device. **Printer: browser dialog** means printing is available in the browser; it does not confirm printer connectivity, paper, or successful physical output.

Use **Orders → Details / Reprint** for synced bills, or the saved-sales list in POS for unsynced bills. Direct ESC/POS printer control is not implemented.

## Troubleshooting

If development shows `Cannot read properties of null (reading 'enqueueModel')`, stop the development server and restart with `npm run dev`. This uses Webpack as a workaround for the observed development rendering error. Close all tabs for this POS origin, then reopen it so any previous offline service worker stops controlling the page. Development removes only the POS screen/asset caches; it preserves locally saved sales. Do not clear site data or IndexedDB. If the error continues, record the affected page and full browser stack trace.

| Problem                                       | What to check                                                                                                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invalid username or password                  | Use the staff account credentials. For first-owner setup, check `.env.local`, remove duplicate variables, and restart. An existing account is not reset by `MASTER_PASSWORD`. |
| Password contains `#` or `$`                  | Quote and escape the environment value as described above. Do not type the escape backslash into the login form.                                                              |
| `PGRST202` / missing `pos_login_attempt`      | Apply the complete operations migration to the Supabase project configured in `.env.local`. Confirm the SQL completed successfully.                                           |
| Missing function after a successful migration | Run `NOTIFY pgrst, 'reload schema';` in Supabase SQL Editor, then retry.                                                                                                      |
| Cannot accept payment                         | Check the selected branch, signed-in cashier, session validity, and open shift.                                                                                               |
| Offline refresh does not work                 | Use the production build over HTTPS/localhost and prepare POS before disconnecting. An expired session requires reconnection.                                                 |
| Sales remain pending                          | Reconnect, sign in as the original cashier, and retry sync. Keep the local data. Ask an admin to reconcile persistent failures.                                               |
| Receipt does not appear                       | Allow popups and reprint the bill. Check the printer and browser print settings.                                                                                              |
| Dashboard and report counts differ            | Compare the same dates, branch, order state, and payment status. Total orders and completed orders are different measures.                                                    |

Do not share passwords, service keys, or complete environment files when requesting support. Share the error message and the steps that produced it.

## Developer reference

### Commands

| Command         | Purpose                                                        |
| --------------- | -------------------------------------------------------------- |
| `npm ci`        | Install the versions recorded in the lockfile.                 |
| `npm run dev`   | Start the development server using Webpack.                    |
| `npm run dev:turbo` | Start Turbopack for development diagnostics.                |
| `npm run build` | Build and type-check the production application.               |
| `npm start`     | Serve the production build.                                    |
| `npm run lint`  | Check source code with ESLint.                                 |
| `npm test`      | Run automated application, database, and offline-worker tests. |

### Main project files

| Location                       | Purpose                                                                     |
| ------------------------------ | --------------------------------------------------------------------------- |
| `app/`                         | Pages and server API routes.                                                |
| `components/`                  | Admin, cashier, and shared interface components.                            |
| `lib/`                         | Authentication, billing, reports, receipts, and local storage/sync helpers. |
| `stores/`                      | Client-side cart, shift, menu, and connection state.                        |
| `public/ilyas-logo.png`        | Restaurant branding.                                                        |
| `public/pos-sw.js`             | Production offline screen and asset caching.                                |
| `app/manifest.ts`              | App installation metadata.                                                  |
| `schema.sql`                   | Initial database schema and seed data for a new installation.               |
| `migrations/`                  | Database upgrades for existing installations.                               |
| `tests/`                       | Automated regression tests, including isolated PGlite database tests.       |
| [OPERATIONS.md](OPERATIONS.md) | Deployment preparation and operational limitations.                         |

The application uses Next.js, React, TypeScript, Supabase PostgreSQL, Zustand, and IndexedDB. Server routes validate staff and branch permissions; passwords are hashed, and session cookies are HTTP-only.

### Validation and release checks

The latest implementation check passed **30 automated tests**, ESLint, and the production build. Tests use an isolated database and simulated service-worker/network conditions; they do not write live business records.

Before using a release at a shop, test both roles and each branch on the actual devices. Verify a sale and receipt, unpaid-bill settlement, table release, report totals, shift closing, and an offline disconnect → refresh → sale → reconnect cycle with exactly one matching server bill.

**Real-browser offline hydration, physical printer output, and live payment acceptance still require device testing.** Passing automated checks alone is not a claim that every deployment or printer has been verified.

### Install the POS app

Open the deployed HTTPS site and select **Install app** in the top bar. Supported browsers display an installation prompt; other browsers show instructions for adding the app to your home screen or Dock. The installed app uses the Ilyas logo and opens in its own window, in portrait or landscape.

Installation does not automatically prepare offline sales. Launch the installed app, sign in online, select a branch, open a shift and wait for **POS saved for offline reopening during this session**. Prepare it again after a deployment or new session. Existing offline session and cashier restrictions still apply. Login and administration require a connection.

Before rollout, test the production build on the actual cashier devices: install, launch, sign in, prepare POS, reopen offline, record a test sale, reconnect and confirm it syncs once. Also test dismissal of the install prompt and iPhone/iPad home-screen installation. Browser installation prompts cannot be forced and may be unavailable in private browsing.
