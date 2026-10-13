# Operations rollout (2026-10-09)

## Required before using this version

1. Back up the database. Sync every outstanding offline sale using the previous version and reconcile/close legacy shifts. Do not delete browser data: it may contain unsynced bills.
2. Apply `migrations/20261009_operations.sql` in the Supabase SQL editor. Existing installations must not rerun the seed script. The migration adds staff/transaction audit fields and transaction functions, restricts anonymous database access, and clears only stale table links to completed/cancelled bills. It does not delete orders, payments, or shifts or invent historical cashier identities.
3. Keep the server-only service-role key configured and use a random JWT secret of at least 32 characters. Anonymous database writes no longer work; clients use authenticated application APIs.
4. Set `ADMIN_USERNAME` (defaults to `owner`) and `MASTER_PASSWORD` for the first owner login. That first login creates the named owner account with a salted scrypt hash. Later logins use the database hash, not the environment password. Existing staff accounts are never overwritten by bootstrap. Remove the bootstrap password once the owner account is established.
5. In Settings, create separate staff accounts, assign cashier branches, and configure branch addresses, phones, and receipt footers. Password fields are write-only and masked. Staff reset and disable actions require an administrator.
6. Sign in again on every terminal. Old branch-only session cookies are rejected. Admins choose a specific branch; cashiers use their assigned branch. Open a server-confirmed shift before accepting sales. Offline selling may continue from an already confirmed shift; opening a new shift requires connectivity.

The read-only deployment check during implementation found required order, shift, and branch columns absent. No live schema or business data was changed by this work. Apply the migration before switching terminals to this version.

## Order/report definitions

All screens use Asia/Karachi business dates and the same aggregate function. Total orders includes every bill. Unpaid includes UNPAID/PARTIAL bills except cancellations. Completed and cancelled are order states. These categories can overlap with payment state and are not an additive partition. Paid sales and charts exclude cancelled/refunded payments. Revenue remains grouped by the bill's creation date, consistently in admin and reports.

Split payments record their cash portion. Older splits without a breakdown are shown separately instead of guessed as digital or cash. The report label is Cash sales, not In register. Shift reconciliation uses opening cash plus recorded paid cash sales, including split cash. Cash movements and partial refunds are not implemented; they must not be represented as ordinary cancellations. Unpaid open bills may be cancelled only by an administrator with a reason. Paid bills remain immutable through the cancellation API.

## Daily workflows

### Online and offline operation

- Offline reopening is enabled in the production build (`npm run build`, then `npm start`) over HTTPS or localhost. Development mode supports continuing in the already open POS tab, but deliberately does not register a caching worker.
- Sign in online, select the branch, open a shift, and wait for **POS saved for offline reopening during this session**. The Prepare offline action saves the current cashier's POS screen, scripts, menu, billing settings, branch receipt data, and table list. Repeat after a deployment, sign-in, or branch change.
- While disconnected, continue the existing shift, record payments, and print receipts. The saved-sales list in POS supports receipt reprints before syncing. Cash and digital payment confirmations are manual; the app does not contact a payment provider to verify a transfer.
- Sales are queued after a network failure or a 15-second payment-request timeout, even when the browser still reports a connected network. Authentication and other HTTP rejections are not treated as offline success. The stable sale identifier prevents duplicate server records when a response is lost. Receipt numbers are preserved through sync.
- Reconnection, window focus, and a 30-second timer retry queued sales. Remain signed in as the original cashier, sync successfully, then close the shift. Failed sales remain on the device; do not clear browser data or uninstall before syncing.
- Offline operation ends when the existing 12-hour session expires. Login, new shifts, shift closing, branch switching, reports, administration and online order history require internet. Signing in/out or switching branches invalidates the cached POS screen. Offline terminals cannot see remote account revocation or current table availability until reconnecting; table conflicts or remotely closed shifts may need reconciliation.
- Real-device acceptance is still required: in a production browser, prepare POS, disconnect, refresh `/pos`, complete a sale, reprint it, reconnect, verify exactly one matching server bill, and close the shift. Automated worker tests simulate these network/cache conditions; they do not replace browser hydration or printer testing.

- POS shows branch, cashier, open/closed shift, sync queue, and links to bill history/reprints. Shift dialogs have Cancel and Back; sales are disabled until a matching staff/branch shift exists.
- Orders supports dates, branch, payment status, order state, order type, search, pagination, details and reprints. Settle an existing unpaid bill from its details using an open shift in that branch. This preserves its original record and records the paying cashier/shift separately.
- Free tables show no active bill details. Previous bills remain in Orders. Payment/cancellation and release of the matching active table are transactional.
- Sync pending sales before closing a shift. Failed sync attempts stay in the retry queue. Sign in as the original cashier to retry. Pre-upgrade offline records with no staff identity, or records whose shift was closed from another device, require administrator reconciliation; they are retained locally and never silently assigned to a different cashier.
- Receipts preserve branch information at sale time, include cashier attribution, and can be reprinted. Historical bills without a branch snapshot use the configured branch details and identify missing cashier attribution honestly.
- Printer status means the browser print dialog is available; the browser cannot confirm physical printer connectivity or paper status. Allow popups if prompted. Network connected does not claim the backend is healthy; pending sales remain visible until acknowledged.

## Validation

The subsequent workflow review fixed branch switching from `?choose=1`, shared spacing/button styles, loading and error feedback, stale order-filter responses, staff save feedback, and split-payment confirmation. Configured tax now updates cart totals and is validated against server settings for live sales. Offline records retain their original tax amounts; historical bills are not recalculated. Sync billing settings after changing tax configuration.

Run `npm test`, `npm run lint`, and `npm run build`. Tests use an isolated PostgreSQL-compatible PGlite database: no production writes. They cover the migration, historical preservation, permissions, duplicate retries, all sale types, split cash, cancellation audit, legacy bill settlement, table release, shift cash, report pagination/timezone and offline retry selection.

Before production rollout, perform a browser/device acceptance pass with real branch staff accounts and a receipt printer after applying the migration. Live payments, real printer output, and visual browser behavior have not been exercised in this session.
