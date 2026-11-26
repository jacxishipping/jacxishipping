# JACXI Shipping — Enterprise Admin Windows Suite (C# / WPF / .NET 10)

The official **JACXI Shipping Windows Admin Desktop Application** built in **C# (.NET 10 / WPF)**, implementing **full feature parity** with the online JACXI Shipping Admin Dashboard (`src/app/dashboard/*`) and strictly following the **JACXI Design System** (`TEAM_DESIGN_SYSTEM_RULES.txt`).

---

## 🖥️ Complete Online Admin Parity (18 Modules)

### 1. Main & Command Center
- **Admin Dashboard**: 4 live KPI cards (Active Shipments, Active Containers, Pending Receivables, Collected Revenue), **Today's Work & Exception Queue** (overdue invoices, customs holds, pending gate passes), Container Utilization capacity bars, and Recent Shipments feed.

### 2. Shipments & Logistics (with Live Sidebar Badges)
- **Shipments & Vehicle Inventory**: Create new shipments (`SHIPPING_ONLY` or `PURCHASE_AND_SHIPPING`), live search, status filter chips, inspect gross margin, issue Release Tokens, request Gate Passes, generate Invoices & Bills of Lading, and export CSV manifests.
- **Operations Board**: 6-stage Kanban pipeline (`ON_HAND` → `DISPATCHING` → `IN_TRANSIT` → `RELEASED` → `IN_TRANSIT_TO_DESTINATION` → `DELIVERED`) with one-click stage advancement.
- **Containers**: Create ocean containers, track capacity (`CurrentCount / MaxCapacity`), advance 8-stage container lifecycle (`CREATED` through `CLOSED`), and load unassigned vehicles.
- **Dispatches**: Manage origin auction yard-to-port inland towing (`PENDING` → `DISPATCHED` → `ARRIVED_AT_PORT` → `COMPLETED`).
- **Transits**: Manage cross-border convoys (UAE/Turkey → Kabul/Hairatan/Islam Qala) and record delivery receiver proof.
- **Company Gate Passes**: Queue and complete gate pass requests with release token verification.
- **Live Cargo Tracking**: Search by tracking number or VIN with maritime route visualization and 6-step milestone timeline.

### 3. Finance & Accounting
- **Finance & Customer Ledgers**: Receivables, Collected Cash, OpEx, Net Profit KPIs, Customer Balance table, and manual Debit/Credit ledger postings.
- **Invoices**: Filter by status (`PENDING`, `OVERDUE`, `PARTIALLY_PAID`, `PAID`), inspect line items, apply partial/full payments (automatically crediting the Customer Ledger), and flag overdue invoices.
- **Office Expenses & Budgets**: Record OpEx across categories (`RENT`, `SALARIES_PAYROLL`, `UTILITIES`, `SOFTWARE_SUBSCRIPTIONS`, etc.) with live monthly budget progress caps.
- **Company Ledgers & Transfers**: Ocean/dispatch/transit company balances and inter-ledger transfers.

### 4. Customers & Portals
- **Customers & Users (RBAC)**: Manage roles (`admin`, `manager`, `finance`, `operations`, `customer_service`, `user`), collection statuses, and 8-character Login Code generation.
- **Partner Portals**: Provision white-label B2B portals with custom domains and toggle active status.

### 5. Tools & System
- **Rate Calculator**: Official Copart/IAAI state-by-state towing + ocean freight tariffs with instant booking conversion.
- **Document Center**: Bill of Lading, Dock Receipt, and Vehicle Inspection manifest viewer.
- **Analytics & Reports**: Accounts Receivable (AR) Aging buckets and Container P&L summary.
- **Cloud Sync & Settings**: Authenticate directly against a live JACXI Next.js backend (`/api/auth/signin`), export JSON database snapshots, or reset demo state. Also supports locking the session with the Admin Sign-In screen.

---

## 💻 Building, Testing & Packaging

```bash
# Run all 23 xUnit tests & compile Release build
./windows/build-and-test.sh

# Publish Windows x64 executable & zip archive
./windows/publish.sh
```
