# Club Management System

## Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env       # edit MONGO_URI if needed
npm run seed               # creates all demo users + data
npm run dev                # starts on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev                # starts on http://localhost:5173
```

### Demo Login Credentials (all use password: Admin@123)
| Role | Email |
|------|-------|
| Chairman | chairman@club.com |
| Secretary | secretary@club.com |
| General Manager | gm@club.com |
| Procurement Manager | procurement@club.com |
| Procurement Assistant | procasst@club.com |
| Store Manager | store@club.com |
| Store Assistant | storeasst@club.com |
| Kitchen Manager | kitchen@club.com |
| Food Control Manager | foodctrl@club.com |
| Accounts Manager | accounts@club.com |
| HR Manager | hr@club.com |
| Banquet Manager | banquet@club.com |
| Rooms Manager | rooms@club.com |
| Bar Manager | bar@club.com |
| Sports Manager | sports@club.com |
| Maintenance Manager | maintenance@club.com |

---

## System Architecture

### Backend: Node.js + Express + MongoDB
```
backend/
├── models/
│   ├── User.js                 — 18 roles, bcrypt auth
│   ├── Notification.js         — notifyRoles() + notifyUser() statics
│   ├── Director.js
│   ├── Vendor.js               — products[], agreementVersions[], version history
│   ├── AgreementTemplate.js    — (exported from Vendor.js)
│   ├── ProcurementRequest.js   — auto REQ-Kit001/03/2026, changeLog[]
│   ├── PurchaseOrder.js        — auto PO-NO-Kit005/03/2026, all audit fields
│   ├── StoreModels.js          — Item, StockTxn, GRC (4-party), InternalRequest
│   ├── BanquetBooking.js       — slot conflict check, auto pricing engine
│   ├── RoomModels.js           — Room + RoomBooking, auto pricing, availability
│   └── Finance.js              — Sale + Expense
├── routes/
│   ├── auth.js                 — Login, user management
│   ├── directors.js
│   ├── procurement.js          — 5 sections: requirements, vendors, POs, tracking, quality/GRC
│   ├── store.js                — Inventory, GRC, internal requests, order tracking
│   ├── kitchen.js
│   ├── banquet.js              — Slot-based booking, reminders, payment alerts
│   ├── rooms.js                — Room management, bookings, availability check
│   ├── finance.js
│   ├── hr.js
│   ├── notifications.js
│   └── dashboard.js            — Role-specific dashboard data
├── middleware/auth.js           — JWT protect + role allow
├── config/database.js
└── seed.js                     — Populates all demo data from DB (no static data)
```

### Frontend: React + Vite
```
frontend/src/
├── api/index.js               — All API calls (authAPI, procAPI, storeAPI, banquetAPI, roomsAPI...)
├── contexts/AuthContext.jsx
├── utils/helpers.js           — formatters, role metadata, badge helpers
├── components/
│   ├── auth/Login.jsx          — Demo account panel
│   ├── layout/
│   │   ├── Sidebar.jsx         — Role-aware collapsible navigation
│   │   ├── Topbar.jsx          — Notifications bell with real-time badge
│   │   └── AppLayout.jsx
│   ├── ui/index.jsx            — Modal, FG, Tabs, Stat, Empty, PageHdr, Badge, ChangeLog
│   └── modules/
│       ├── procurement/ProcurementPage.jsx   — 5 tabs: Requirements, Vendors+Templates, POs, Tracking, Quality
│       ├── store/StorePage.jsx               — 4 tabs: Inventory, GRC, Internal Requests, Order Tracking
│       ├── banquet/BanquetPage.jsx           — 3 tabs: Dashboard, Bookings, Calendar
│       ├── rooms/RoomsPage.jsx               — 3 tabs: Dashboard, Bookings, Room Management
│       ├── kitchen/KitchenPage.jsx
│       ├── accounts/AccountsPage.jsx
│       ├── hr/HRPage.jsx
│       ├── directors/DirectorsPage.jsx
│       └── dashboard/
│           ├── ChairmanDashboard.jsx
│           ├── GMDashboard.jsx
│           ├── DeptDashboard.jsx             — Bar, Sports, Maintenance
│           └── OperationalDashboards.jsx     — Procurement, Store, Kitchen, Accounts, HR
```

---

## Key Features

### Procurement Module (5 Sections)
1. **Requirements** — Raise requests with auto REQ numbers, approve/reject with name tracking
2. **Vendor Management** — Add vendors with products, auto-suggest agreement templates, fill templates with vendor data, save versioned agreements
3. **Purchase Orders** — Auto PO numbers (PO-NO-Kit005/03/2026), payment tracking by Accounts (3.1)
4. **Order Tracking** — Set delivery dates logged with name (4.1)
5. **Quality & GRC** — 4-party verification: Store + Accounts + Procurement + HOD, each with name + timestamp

### Banquet System (5.1–5.3.2)
- Slot-based: Morning (07:00–12:00), Afternoon (12:00–17:00), Evening (17:00–23:00)
- **Double-booking prevention**: Same hall + date + slot = 409 conflict error
- Auto pricing engine: Buffet Cost = persons × price, Tax = (buffet + charges) × GST%, Total auto-calculated
- Payment: Due 🔴 / Partial 🟠 / Paid 🟢 — only Accounts updates status
- Reminders: 3 days before event, daily payment-due alerts after event

### Rooms System (6.1–6.6)
- Date-range availability check (no overlapping bookings)
- Auto pricing: Nights × price/night + extras + GST
- Check-in / Check-out tracked with staff name + timestamp
- Dashboard: occupancy rate, today's check-ins/check-outs, 6-month revenue

### Audit Trail
Every action records:
- `performedBy` → User with name + role
- `performedAt` → timestamp
- Full `changeLog[]` displayed in UI (ChangeLog component)
- Dedicated fields: `approvedBy`, `approvedAt`, `issuedBy`, `paymentUpdatedBy`, `checkedInBy`, etc.

### Notifications
- `Notification.notifyRoles()` — sends to all users with specified roles
- `Notification.notifyUser()` — sends to specific user
- Real-time badge in topbar, with type: info/success/warning/alert
