# 🍛 Biryani House POS — Modern Multi-Branch Restaurant Point of Sale

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Zustand](https://img.shields.io/badge/State-Zustand-orange?style=for-the-badge)](https://zustand.docs.pmnd.rs/)
[![PWA](https://img.shields.io/badge/PWA-Offline--Ready-5A0FC8?style=for-the-badge)](https://web.dev/progressive-web-apps/)

An enterprise-grade, offline-first Point of Sale (POS) and Kitchen Display System (KDS) crafted specifically for high-volume dining, takeaway, and delivery restaurant operations. Built with modern web standards, tactile touch-friendly UI, dual English/Urdu support, local payment integrations (Cash, JazzCash, EasyPaisa), and 80mm ESC/POS thermal receipt printing.

---

## 📸 Key Features & Architecture

```
                       ┌────────────────────────────────────────────────────────┐
                       │                   Biryani House POS                    │
                       └───────────────────────────┬────────────────────────────┘
                                                   │
                ┌──────────────────────────────────┼──────────────────────────────────┐
                │                                  │                                  │
    ┌───────────▼───────────┐          ┌───────────▼───────────┐          ┌───────────▼───────────┐
    │     POS Terminal      │          │ Kitchen Display (KDS) │          │  Owner Admin & Intel  │
    │  • Cashier PIN Login  │          │  • Real-Time WebSocket│          │  • Multi-Branch Stats │
    │  • Dine-In Table Plan │          │  • FIFO Prep Queue    │          │  • Menu & Stock CRUD  │
    │  • Rapid Checkout     │          │  • Color Urgency Timer│          │  • Revenue & Hourly   │
    │  • Split Payments     │          │  • Web Audio Chime    │          │  • Shift Reconciliation│
    └───────────┬───────────┘          └───────────┬───────────┘          └───────────┬───────────┘
                │                                  │                                  │
                └──────────────────────────────────┼──────────────────────────────────┘
                                                   │
                         ┌─────────────────────────┴─────────────────────────┐
                         │               Offline & Sync Layer                │
                         │   • Local IndexedDB (Instant offline storage)     │
                         │   • Auto-Sync to Supabase PostgreSQL on reconnect │
                         │   • Thermal Print Engine (80mm ESC/POS & KOT)     │
                         └───────────────────────────────────────────────────┘
```

---

## 🌟 Highlights

### 🏢 Multi-Branch Control & Fast ATM PIN Login
- **Branch-Specific Themes & Identity:**
  - 🟠 **Branch 1 (Main)** — Saffron Orange (`#f97316`)
  - 🔴 **Branch 2 (City)** — Ruby Red (`#ef4444`)
  - 🟣 **Branch 3 (North)** — Royal Purple (`#8b5cf6`)
- **Cashier Quick Access:** Cashiers switch or log in with instant 4-digit numeric PINs optimized for touch tablets and numpads.
- **Master Admin Access:** Central management portal secured with master passphrase.

### ⚡ True Offline-First Resilience
- Built with **IndexedDB (`idb`)** local caching.
- Orders can be booked and printed even when internet connectivity drops entirely.
- Auto-syncs buffered orders to Supabase PostgreSQL as soon as the connection recovers.
- Visual connection status pill with live ping detection.

### 🍽️ Multi-Channel Order Types
- 🪑 **Dine-In:** 10-table visual floor grid with live statuses (`Available`, `Occupied`, `Reserved`, `Cleaning`) and elapsed dining timers.
- 🥡 **Takeaway:** Single-click quick order counter flow.
- 🛵 **Delivery:** Customer profile capture (Name, Phone number, Delivery address).

### 👨‍🍳 Dark-Mode Kitchen Display System (KDS)
- Screen designed specifically for high-glare, high-temperature kitchen environments.
- Real-time order sync with Web Audio chime sound alerts on incoming tickets.
- Dynamic color-coded ticket timers:
  - 🟢 **Green:** `< 10 minutes`
  - 🟡 **Amber:** `10 – 20 minutes`
  - 🔴 **Flashing Red:** `> 20 minutes` (Urgent attention)

### 🧾 80mm ESC/POS Thermal Receipt & KOT Printing
- One-click Kitchen Order Ticket (KOT) generation with modifier notes.
- Customer receipt formatted for standard 80mm roll printers (compatible with Epson, Xprinter, Rongta).
- Shows subtotal, discounts, GST/tax calculation, cash change, and custom Urdu greeting.

### 💳 Local & Digital Payments
- **Cash:** Change calculation with common quick-denomination shortcuts.
- **JazzCash & EasyPaisa:** Displays shop account number, title, and reference tracking.
- **Split Payment:** Seamlessly split a single check between cash and mobile wallet.

### 📊 Business Intelligence & Shift Accounting
- Open / close register shift workflows with opening float and cash drawer reconciliation.
- Hourly revenue bar charts and product category distribution.
- Top 10 best-selling dishes ranked by volume and revenue.
- One-click CSV and Excel export.

---

## 🔑 Default Credentials

| Role / Station | Login Method | Default Credential | Permissions |
|---|---|---|---|
| **Branch 1 (Main)** | 4-Digit PIN | `1111` | Orders, Tables, KDS, Shifts, Checkout |
| **Branch 2 (City)** | 4-Digit PIN | `2222` | Orders, Tables, KDS, Shifts, Checkout |
| **Branch 3 (North)** | 4-Digit PIN | `3333` | Orders, Tables, KDS, Shifts, Checkout |
| **Master Owner** | Master Password | `biryanihouse2025` | All Branches, Analytics, Menu CRUD, Settings |

> 💡 *Note: PINs and passwords can be updated from the Admin Settings tab.*

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **Frontend Runtime** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Database & Realtime** | [Supabase](https://supabase.com/) (PostgreSQL + Realtime) |
| **State Management** | [Zustand 5](https://zustand.docs.pmnd.rs/) |
| **Local Storage** | [IndexedDB via idb](https://github.com/jakearchibald/idb) |
| **Security & Auth** | [jose](https://github.com/panva/jose) (JWT HTTP-Only Cookies) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Printing** | [react-to-print](https://github.com/gregnb/react-to-print) |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **npm** or **pnpm**
- A free account on [Supabase](https://supabase.com)

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/biryani-house-pos.git
cd biryani-house-pos
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup
1. Create a new project in your [Supabase Dashboard](https://database.new).
2. Go to the **SQL Editor** tab in Supabase.
3. Open [`schema.sql`](./schema.sql) in this repository, copy the full content, and click **Run**.
4. This script automatically configures:
   - Tables (`branches`, `menu_items`, `restaurant_tables`, `orders`, `order_items`, `shifts`, `settings`)
   - Realtime publication for kitchen orders
   - Default Pakistani menu items (Biryani, Karahi, BBQ, Desserts)
   - Initial floor tables and digital payment settings

### 5. Configure Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

Fill in your configuration details:
```env
# Supabase credentials (from Supabase Dashboard -> Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# JWT & Master credentials
JWT_SECRET=your-secure-jwt-secret-string
MASTER_PASSWORD=biryanihouse2025
```

### 6. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Deployment Guide

### Option 1: Deploy to Vercel (Recommended)

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository (`biryani-house-pos`).
4. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `MASTER_PASSWORD`
5. Click **Deploy**. Vercel will automatically build and publish your POS system.

### Option 2: Docker or Node.js Production Server

To build and start the production server on any VPS (Ubuntu/Debian):

```bash
# Build production bundle
npm run build

# Start production server
npm start
```

For persistent service management with PM2:
```bash
npm install -g pm2
pm2 start npm --name "biryani-pos" -- start
```

---

## 📁 Repository Structure

```
biryani-house-pos/
├── app/
│   ├── admin/               # Master owner portal & executive dashboard
│   ├── api/                 # Next.js Server Route Handlers
│   │   ├── auth/            # PIN & Master login / logout endpoints
│   │   ├── branches/        # Branch configuration & PIN update API
│   │   ├── menu/            # Menu dishes CRUD & availability toggle
│   │   ├── orders/          # Order dispatch, pagination & status updates
│   │   ├── reports/         # Aggregated sales, hourly, & branch analytics
│   │   ├── settings/        # System configuration & payment details
│   │   ├── shifts/          # Register open/close cash reconciliation
│   │   ├── sync/            # Offline order batch synchronization
│   │   └── tables/          # Table assignment & floor state
│   ├── kitchen/             # Fullscreen dark-mode Kitchen Display System (KDS)
│   ├── login/               # Cashier ATM PIN pad & admin credentials screen
│   ├── menu/                # Dish manager & pricing admin page
│   ├── orders/              # Central order history with filters & search
│   ├── pos/                 # Primary cashier terminal & checkout flow
│   ├── reports/             # Sales analytics & revenue reports
│   ├── settings/            # Store settings & digital payment numbers
│   ├── tables/              # Visual table floor plan & dining timers
│   ├── globals.css          # Design system variables & custom utilities
│   ├── layout.tsx           # Root HTML layout & font definitions
│   └── page.tsx             # Root redirect to /pos or /login
├── components/              # Modular, reusable UI components
│   ├── admin/               # AdminClient dashboard
│   ├── kitchen/             # KitchenDisplay component with sound engine
│   ├── menu/                # MenuClient CRUD & category filters
│   ├── orders/              # OrdersClient table & invoice viewer
│   ├── pos/                 # POSClient, MenuGrid, OrderPanel, PaymentModal, etc.
│   ├── reports/             # ReportsClient with Recharts visualizations
│   ├── settings/            # SettingsClient form
│   └── tables/              # TablesClient interactive floor layout
├── lib/
│   ├── auth.ts              # Jose JWT cookie encode/decode & role verification
│   ├── pos-db-local.ts      # IndexedDB offline store (idb)
│   ├── pos-sync.ts          # Auto-sync engine for offline orders
│   ├── receipt.ts           # 80mm ESC/POS thermal receipt & KOT layout engine
│   ├── supabase.ts          # Client & Server Supabase PostgreSQL drivers
│   └── utils.ts             # PKR currency formatter & order ID generator
├── stores/                  # Zustand global state slices
│   ├── pos-branch.ts        # Active branch identity & metadata
│   ├── pos-cart.ts          # Items, discounts, taxes & total computations
│   ├── pos-connection.ts    # Online/offline network monitor
│   ├── pos-menu.ts          # Menu item cache & category selection
│   └── pos-shift.ts         # Register drawer state & active shift
├── public/
│   └── manifest.webmanifest # PWA configuration for tablet installation
├── schema.sql               # PostgreSQL schema, seed data, and RLS policies
└── package.json
```

---

## 🧪 Quality Assurance & Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Starts local Next.js development server on Turbopack |
| `npm run build` | Compiles optimized production build |
| `npm run lint` | Runs ESLint 9 checks across all source code |
| `npm start` | Launches compiled production server |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Feel free to customize, adapt, and deploy for your own restaurant operations.
